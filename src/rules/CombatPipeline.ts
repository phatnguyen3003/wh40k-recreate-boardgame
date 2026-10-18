import { DiceEngine } from '../core/DiceEngine';
import { EventBus } from '../core/EventBus';
import { WoundChart } from './WoundChart';
import { KeywordHandlers } from './KeywordHandlers';
import type { Unit } from '../entities/Unit';
import type { Weapon } from '../entities/Weapon';
import type { Model } from '../entities/Model';

// =========================================================================
// ⚙️ MODULE CONFIGURATION & CONSTANTS
// =========================================================================
export const COMBAT_PIPELINE_CONFIG = {
  CRITICAL_ROLL: 6,          // Mặt 6 tự nhiên = Critical (Hit/Wound)
  AUTO_FAIL_ROLL: 1,         // Mặt 1 tự nhiên luôn trượt
  MIN_SKILL: 2,              // BS/WS không thể tốt hơn 2+
  MIN_WOUND_TARGET: 2,       // Ngưỡng Wound không thể tốt hơn 2+
  COVER_SAVE_CAP: 3,         // Cover không cải thiện giáp tốt hơn 3+ khi AP = 0
  EVENT_ATTACK_RESOLVED: 'COMBAT:ATTACK_RESOLVED',
} as const;

export interface CombatOptions {
  inCover?: boolean;                  // Mục tiêu đang trong cover (Benefit of Cover: +1 Save)
  attackerRemainedStationary?: boolean; // Để kích hoạt Heavy (+1 to Hit)
  attackerCharged?: boolean;          // Để kích hoạt Lance (+1 to Wound)
  targetModelCount?: number;          // Số mô hình mục tiêu (cho Blast); mặc định lấy từ unit
  feelNoPain?: number | null;         // Ngưỡng Feel No Pain X+ của mục tiêu
  targetModelId?: string;             // Chỉ định mô hình hứng đòn (Precision)
}

export interface CombatResult {
  weaponId: string;
  attacks: number;          // Tổng số đòn tấn công (sau Blast)
  hitRolls: number[];
  hits: number;             // Số đòn trúng
  criticalHits: number;     // Số Critical Hit (mặt 6)
  woundTarget: number;      // Ngưỡng cần đạt khi Wound Roll
  woundRolls: number[];
  wounds: number;           // Tổng số vết thương thành công (gồm auto-wound)
  criticalWounds: number;   // Số Critical Wound (mặt 6)
  devastatingWounds: number; // Số vết thương bỏ qua Save (Devastating Wounds)
  saveTarget: number;       // Ngưỡng cần đạt khi Save Roll
  saveRolls: number[];
  unsavedWounds: number;    // Số đòn lọt qua giáp
  damageRolls: number[];    // Kết quả gieo Damage của từng đòn
  rawDamage: number;        // Tổng sát thương thô
  ignoredByFNP: number;     // Sát thương bị Feel No Pain triệt tiêu
  totalDamage: number;      // Sát thương thực tế gây ra
  modelsSlain: string[];    // ID các mô hình bị tiêu diệt
  slainCount: number;
}

// =========================================================================
// 📦 MODULE IMPLEMENTATION
// =========================================================================
export class CombatPipeline {
  private diceEngine: DiceEngine;
  private keywordHandlers: KeywordHandlers;
  private eventBus: EventBus | null;

  constructor(diceEngine?: DiceEngine, eventBus?: EventBus, keywordHandlers?: KeywordHandlers) {
    this.diceEngine = diceEngine ?? new DiceEngine();
    this.keywordHandlers = keywordHandlers ?? new KeywordHandlers(this.diceEngine);
    this.eventBus = eventBus ?? null;
  }

  /**
   * Trích xuất hệ số số học từ tên keyword (VD: "SUSTAINED_HITS_2" + prefix "SUSTAINED_HITS" → 2).
   */
  private getKeywordFactor(weapon: Weapon, prefix: string): number {
    for (const ability of weapon.abilities) {
      const upper = ability.toUpperCase();
      if (upper.startsWith(prefix)) {
        const digits = upper.slice(prefix.length).replace(/[^0-9]/g, '');
        return digits ? parseInt(digits, 10) : 1;
      }
    }
    return 0;
  }

  /**
   * Chuỗi xử lý giao tranh 4 bước: Hit → Wound → Save → Allocate Damage.
   */
  resolve(weapon: Weapon, targetUnit: Unit, options: CombatOptions = {}): CombatResult {
    // ---------------------------------------------------------------------
    // BƯỚC 0: Xác định số đòn tấn công (Attacks), áp dụng Blast
    // ---------------------------------------------------------------------
    let attacks = this.diceEngine.evaluateDiceExpression(weapon.attacks);
    if (weapon.hasAbility('BLAST')) {
      const modelCount = options.targetModelCount ?? targetUnit.getAliveModelCount();
      attacks = this.keywordHandlers.applyBlast(attacks, modelCount);
    }

    // ---------------------------------------------------------------------
    // BƯỚC 1: HIT ROLL — gieo A xúc xắc, thành công nếu >= BS/WS
    // Mặt 1 tự nhiên luôn trượt, mặt 6 tự nhiên luôn trúng (Critical Hit).
    // ---------------------------------------------------------------------
    const torrent = weapon.hasAbility('TORRENT');
    const hitRolls: number[] = [];
    let hits = 0;
    let criticalHits = 0;

    if (torrent) {
      // Torrent: tự động trúng toàn bộ, KHÔNG gieo xúc xắc → không có Critical Hit
      hits = attacks;
    } else {
      // Heavy: nếu đơn vị đứng yên, +1 to Hit (giảm ngưỡng skill đi 1)
      let skillTarget = weapon.skill;
      if (weapon.hasAbility('HEAVY') && options.attackerRemainedStationary) {
        skillTarget = Math.max(COMBAT_PIPELINE_CONFIG.MIN_SKILL, skillTarget - 1);
      }

      hitRolls.push(...this.diceEngine.rollBatch(attacks));
      for (const roll of hitRolls) {
        const isCritical = roll === COMBAT_PIPELINE_CONFIG.CRITICAL_ROLL;
        const isAutoFail = roll === COMBAT_PIPELINE_CONFIG.AUTO_FAIL_ROLL;
        if (isCritical) {
          hits++;
          criticalHits++;
        } else if (!isAutoFail && roll >= skillTarget) {
          hits++;
        }
      }
    }

    // Lethal Hits: Critical Hit tự động gây vết thương (bỏ qua Wound Roll)
    const lethalAutoWounds = weapon.hasAbility('LETHAL_HITS')
      ? this.keywordHandlers.applyLethalHits(hitRolls)
      : 0;

    // Sustained Hits X: mỗi Critical Hit sinh thêm X đòn trúng bổ sung
    // (đòn bổ sung chỉ sinh 1 cấp, không tiếp tục crit — tránh vòng lặp vô hạn)
    let sustainedExtraHits = 0;
    if (weapon.hasAbilityPartial('SUSTAINED_HITS')) {
      const factor = this.getKeywordFactor(weapon, 'SUSTAINED_HITS');
      sustainedExtraHits = this.keywordHandlers.applySustainedHits(hitRolls, factor);
    }

    // ---------------------------------------------------------------------
    // BƯỚC 2: WOUND ROLL — đối chiếu S của vũ khí với T của mục tiêu
    // Mặt 1 tự nhiên luôn trượt, mặt 6 tự nhiên luôn thành công (Critical Wound).
    // ---------------------------------------------------------------------
    let woundTarget = WoundChart.getWoundTarget(
      weapon.strength,
      targetUnit.datasheetStats.toughness,
    );
    // Lance: +1 to Wound nếu đơn vị vừa Charge lượt này
    if (weapon.hasAbility('LANCE') && options.attackerCharged) {
      woundTarget = Math.max(COMBAT_PIPELINE_CONFIG.MIN_WOUND_TARGET, woundTarget - 1);
    }

    // Số đòn cần gieo Wound = số đòn trúng (trừ auto-wound) + đòn Sustained
    const hitsToWound = Math.max(0, hits - lethalAutoWounds) + sustainedExtraHits;

    let woundRolls = this.diceEngine.rollBatch(hitsToWound);
    // Twin-linked: gieo lại toàn bộ Wound Roll thất bại
    if (weapon.hasAbility('TWIN_LINKED')) {
      woundRolls = this.diceEngine.rerollFailures(woundRolls, woundTarget, 'FAILURES');
    }

    let normalWounds = 0;
    let criticalWounds = 0;
    for (const roll of woundRolls) {
      const isCritical = roll === COMBAT_PIPELINE_CONFIG.CRITICAL_ROLL;
      const isAutoFail = roll === COMBAT_PIPELINE_CONFIG.AUTO_FAIL_ROLL;
      if (isCritical) {
        normalWounds++; // 6 tự nhiên luôn gây vết thương
        criticalWounds++;
      } else if (!isAutoFail && roll >= woundTarget) {
        normalWounds++;
      }
    }

    // Devastating Wounds: Critical Wound bỏ qua hoàn toàn Save & Invuln
    const devastatingWounds = weapon.hasAbility('DEVASTATING_WOUNDS') ? criticalWounds : 0;

    // Tổng vết thương thành công & số đòn còn phải gieo Save
    const totalWounds = normalWounds + lethalAutoWounds;
    const woundsNeedingSave = normalWounds - devastatingWounds + lethalAutoWounds;

    // ---------------------------------------------------------------------
    // BƯỚC 3: SAVE ROLL — chọn giáp tốt nhất (Sv trừ AP hoặc Invuln)
    // ---------------------------------------------------------------------
    const targetSave = targetUnit.datasheetStats.save;
    let effectiveSave = targetSave;
    if (options.inCover) {
      // Benefit of Cover: +1 Save (giảm ngưỡng 1), nhưng với AP = 0 không tốt hơn 3+
      const improved = targetSave - 1;
      effectiveSave =
        weapon.ap === 0
          ? Math.max(COMBAT_PIPELINE_CONFIG.COVER_SAVE_CAP, improved)
          : improved;
    }

    // Ngưỡng cần gieo = Sv - AP (AP lưu dạng số âm, VD: 3 - (-2) = 5+)
    let saveTarget = effectiveSave - weapon.ap;
    // Invulnerable Save: dùng giá trị tốt hơn (nhỏ hơn)
    const invuln = targetUnit.datasheetStats.invulnerableSave;
    if (invuln != null) {
      saveTarget = Math.min(saveTarget, invuln);
    }

    const saveRolls = this.diceEngine.rollBatch(woundsNeedingSave);
    let savedCount = 0;
    for (const roll of saveRolls) {
      // Mặt 1 tự nhiên luôn thất bại khi Save
      if (roll !== COMBAT_PIPELINE_CONFIG.AUTO_FAIL_ROLL && roll >= saveTarget) {
        savedCount++;
      }
    }

    // Đòn lọt giáp = (số đòn cần save - số save thành công) + số đòn Devastating (auto-lọt)
    const unsavedWounds = woundsNeedingSave - savedCount + devastatingWounds;

    // ---------------------------------------------------------------------
    // BƯỚC 4: DAMAGE ALLOCATION — trừ Wounds, chống sát thương dư thừa
    // ---------------------------------------------------------------------
    const damageRolls: number[] = [];
    const modelsSlain: string[] = [];
    let rawDamage = 0;
    let ignoredByFNP = 0;
    let totalDamage = 0;

    for (let i = 0; i < unsavedWounds; i++) {
      const alive = targetUnit.getAliveModels();
      if (alive.length === 0) break; // đơn vị đã bị xóa sổ hoàn toàn

      // Chọn mô hình hứng đòn: ưu tiên mô hình đã bị thương trước đó,
      // hoặc mô hình chỉ định bởi Precision (options.targetModelId)
      let targetModel: Model | undefined;
      if (options.targetModelId) {
        const forced = targetUnit.findModel(options.targetModelId);
        if (forced && !forced.isDestroyed) {
          targetModel = forced;
        }
      }
      if (!targetModel) {
        targetModel = alive.find((m) => m.currentWounds < m.maxWounds) ?? alive[0];
      }

      // Gieo sát thương (Damage có thể là "1", "D3", "D6"...)
      const damageRoll = this.diceEngine.evaluateDiceExpression(weapon.damage);
      damageRolls.push(damageRoll);
      rawDamage += damageRoll;

      // Feel No Pain: triệt tiêu từng điểm sát thương
      const damageThrough = this.keywordHandlers.applyFeelNoPain(damageRoll, options.feelNoPain);
      ignoredByFNP += damageRoll - damageThrough;

      // Phân bổ sát thương: phần dư thừa KHÔNG lan sang mô hình kế tiếp
      const woundsBefore = targetModel.currentWounds;
      targetModel.takeDamage(damageThrough);
      totalDamage += woundsBefore - targetModel.currentWounds;

      if (targetModel.isDestroyed && !modelsSlain.includes(targetModel.id)) {
        modelsSlain.push(targetModel.id);
      }
    }

    const result: CombatResult = {
      weaponId: weapon.weaponId,
      attacks,
      hitRolls,
      hits,
      criticalHits,
      woundTarget,
      woundRolls,
      wounds: totalWounds,
      criticalWounds,
      devastatingWounds,
      saveTarget,
      saveRolls,
      unsavedWounds,
      damageRolls,
      rawDamage,
      ignoredByFNP,
      totalDamage,
      modelsSlain,
      slainCount: modelsSlain.length,
    };

    // Phát sự kiện để UI / Combat Log lắng nghe (nếu có EventBus)
    if (this.eventBus) {
      this.eventBus.emit(COMBAT_PIPELINE_CONFIG.EVENT_ATTACK_RESOLVED, result);
    }

    return result;
  }
}
