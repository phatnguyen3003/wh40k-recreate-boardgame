import { DiceEngine } from '../core/DiceEngine';
import { CombatPipeline, CombatOptions, CombatResult } from '../rules/CombatPipeline';
import { WoundChart } from '../rules/WoundChart';
import { Unit } from '../entities/Unit';
import type { Weapon } from '../entities/Weapon';

// =========================================================================
// ⚙️ MODULE CONFIGURATION & CONSTANTS
// =========================================================================
export const COMBAT_SIMULATOR_CONFIG = {
  DEFAULT_ITERATIONS: 10000,
  DIE_FACES: 6,
} as const;

export interface SimulationOptions extends CombatOptions {
  iterations?: number;
}

export interface SimulationStatistics {
  iterations: number;
  averageDamage: number;
  averageKills: number;
  averageUnsavedWounds: number;
  minDamage: number;
  maxDamage: number;
  expectedDamage: number;       // Kỳ vọng lý thuyết (Mathhammer)
  relativeError: number;        // Sai số tương đối giữa mô phỏng và kỳ vọng lý thuyết
}

// =========================================================================
// 📦 MODULE IMPLEMENTATION
// =========================================================================

/**
 * Tạo RNG tất định cho test: lặp lại dãy giá trị xúc xắc mong muốn.
 * Ví dụ: createDeterministicRng([6, 3, 1]) → rollD6() lần lượt trả 6, 3, 1, 6, ...
 */
export function createDeterministicRng(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index++;
    // rollD6 = floor(rng * 6) + 1  ⇒ chọn r để floor(r*6)+1 === value
    return (value - 0.5) / COMBAT_SIMULATOR_CONFIG.DIE_FACES;
  };
}

export class CombatSimulator {
  private diceEngine: DiceEngine;
  private pipeline: CombatPipeline;

  constructor(diceEngine?: DiceEngine) {
    this.diceEngine = diceEngine ?? new DiceEngine();
    this.pipeline = new CombatPipeline(this.diceEngine);
  }

  /**
   * Chạy mô phỏng Monte Carlo: lặp N lần bắn 1 vũ khí vào 1 đơn vị mục tiêu mới (đầy máu).
   */
  simulate(weapon: Weapon, targetUnitTemplate: Unit, options: SimulationOptions = {}): SimulationStatistics {
    const iterations = options.iterations ?? COMBAT_SIMULATOR_CONFIG.DEFAULT_ITERATIONS;

    // Dữ liệu mục tiêu sạch để tái tạo đơn vị đầy đủ máu mỗi vòng lặp
    const templateData = targetUnitTemplate.toData();

    let totalDamage = 0;
    let totalKills = 0;
    let totalUnsaved = 0;
    let minDamage = Number.POSITIVE_INFINITY;
    let maxDamage = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < iterations; i++) {
      // Mỗi vòng lặp dùng đơn vị mục tiêu mới để tránh tích lũy sát thương
      const freshTarget = new Unit(templateData);
      const result: CombatResult = this.pipeline.resolve(weapon, freshTarget, options);

      totalDamage += result.totalDamage;
      totalKills += result.slainCount;
      totalUnsaved += result.unsavedWounds;
      minDamage = Math.min(minDamage, result.totalDamage);
      maxDamage = Math.max(maxDamage, result.totalDamage);
    }

    const averageDamage = totalDamage / iterations;
    const expectedDamage = this.calculateExpectedDamage(weapon, targetUnitTemplate, options);

    return {
      iterations,
      averageDamage,
      averageKills: totalKills / iterations,
      averageUnsavedWounds: totalUnsaved / iterations,
      minDamage: iterations > 0 ? minDamage : 0,
      maxDamage: iterations > 0 ? maxDamage : 0,
      expectedDamage,
      relativeError:
        expectedDamage > 0 ? Math.abs(averageDamage - expectedDamage) / expectedDamage : 0,
    };
  }

  /**
   * Mathhammer: tính kỳ vọng sát thương lý thuyết của 1 loạt bắn.
   *
   * GIẢ ĐỊNH: chỉ mô hình hoá các yếu tố cơ bản (Blast, Heavy, Lance, Torrent).
   * KHÔNG tính Lethal Hits / Sustained Hits / Devastating Wounds / Twin-linked
   * và bỏ qua giới hạn Wounds của mục tiêu (coi mục tiêu đủ máu).
   */
  calculateExpectedDamage(weapon: Weapon, targetUnit: Unit, options: CombatOptions = {}): number {
    // Số đòn tấn công trung bình (bao gồm Blast)
    let attacks = this.averageOfDiceExpression(weapon.attacks);
    if (weapon.hasAbility('BLAST')) {
      const modelCount = options.targetModelCount ?? targetUnit.getAliveModelCount();
      attacks += Math.floor(modelCount / 5);
    }

    // Xác suất trúng
    let hitProbability: number;
    if (weapon.hasAbility('TORRENT')) {
      hitProbability = 1;
    } else {
      let skillTarget = weapon.skill;
      if (weapon.hasAbility('HEAVY') && options.attackerRemainedStationary) {
        skillTarget = Math.max(2, skillTarget - 1);
      }
      // Xác suất gieo >= target (loại trừ mặt 1 luôn trượt) trên D6
      hitProbability = this.probabilityAtLeast(skillTarget);
    }

    // Xác suất gây vết thương
    let woundTarget = WoundChart.getWoundTarget(weapon.strength, targetUnit.datasheetStats.toughness);
    if (weapon.hasAbility('LANCE') && options.attackerCharged) {
      woundTarget = Math.max(2, woundTarget - 1);
    }
    const woundProbability = this.probabilityAtLeast(woundTarget);

    // Xác suất Save thất bại (đã tính AP, Invuln và Cover)
    const targetSave = targetUnit.datasheetStats.save;
    let effectiveSave = targetSave;
    if (options.inCover) {
      const improved = targetSave - 1;
      effectiveSave = weapon.ap === 0 ? Math.max(3, improved) : improved;
    }
    let saveTarget = effectiveSave - weapon.ap;
    const invuln = targetUnit.datasheetStats.invulnerableSave;
    if (invuln != null) {
      saveTarget = Math.min(saveTarget, invuln);
    }
    // Save thành công khi roll >= saveTarget và roll != 1 ⇒ thất bại = 1 - thành công
    const saveSuccessProbability = Math.max(0, this.probabilityAtLeast(Math.max(2, saveTarget)));
    const saveFailProbability = 1 - saveSuccessProbability;

    // Kỳ vọng sát thương mỗi đòn lọt giáp
    const averageDamagePerWound = this.averageOfDiceExpression(weapon.damage);

    return attacks * hitProbability * woundProbability * saveFailProbability * averageDamagePerWound;
  }

  /**
   * Xác suất gieo 1D6 >= target (mặt 1 luôn trượt nên target tối thiểu hiệu dụng là 2..6).
   */
  private probabilityAtLeast(target: number): number {
    if (target <= 1) return 1;
    if (target > COMBAT_SIMULATOR_CONFIG.DIE_FACES) return 0;
    const successFaces = COMBAT_SIMULATOR_CONFIG.DIE_FACES - target + 1;
    return successFaces / COMBAT_SIMULATOR_CONFIG.DIE_FACES;
  }

  /**
   * Kỳ vọng số của biểu thức xúc xắc (VD: "D3" → 2, "2D6" → 7, "D6+1" → 4.5).
   */
  averageOfDiceExpression(expression: string): number {
    const normalized = expression.replace(/\s+/g, '').toUpperCase();
    const diceMatch = normalized.match(/^(\d*)D(\d+)([+-]\d+)?$/);
    if (diceMatch) {
      const count = diceMatch[1] === '' ? 1 : parseInt(diceMatch[1], 10);
      const sides = parseInt(diceMatch[2], 10);
      const modifier = diceMatch[3] ? parseInt(diceMatch[3], 10) : 0;
      return count * ((sides + 1) / 2) + modifier;
    }
    const flat = Number(normalized);
    if (!Number.isNaN(flat)) {
      return flat;
    }
    throw new Error(`CombatSimulator.averageOfDiceExpression: invalid expression "${expression}"`);
  }
}
