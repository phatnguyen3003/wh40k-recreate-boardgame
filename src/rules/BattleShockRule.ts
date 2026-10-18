import type { Unit } from '../entities/Unit';
import { DiceEngine } from '../core/DiceEngine';

// =========================================================================
// ⚙️ MODULE CONFIGURATION & CONSTANTS
// =========================================================================
export const BATTLE_SHOCK_CONFIG = {
  MIN_DICE_FOR_TEST: 2, // Battle-shock test luôn gieo 2D6
} as const;

export interface BattleShockResult {
  unitId: string;
  roll: number;             // Kết quả 2D6 (null nếu không phải test)
  leadership: number;       // Chỉ số Ld của đơn vị
  passed: boolean;          // true = vượt qua, false = Battle-shocked
  wasTested: boolean;       // false nếu đơn vị không ở dưới 50% quân số
  isBattleShocked: boolean; // Trạng thái cuối cùng của đơn vị
}

// =========================================================================
// 📦 MODULE IMPLEMENTATION
// =========================================================================
export class BattleShockRule {
  private diceEngine: DiceEngine;

  constructor(diceEngine: DiceEngine) {
    this.diceEngine = diceEngine;
  }

  /**
   * Thực hiện Battle-shock test cho 1 đơn vị (thường gọi ở Command Phase).
   * Chỉ test khi đơn vị ở mức dưới 50% quân số ban đầu.
   *
   * Quy tắc: Gieo 2D6. Nếu kết quả >= Ld → vượt qua.
   *          Nếu kết quả < Ld → Battle-shocked (OC = 0).
   */
  performTest(unit: Unit): BattleShockResult {
    const leadership = unit.datasheetStats.leadership;

    // Đơn vị còn đủ quân → không cần test, tự động xóa trạng thái shocked
    if (!unit.isBelowHalfStrength()) {
      unit.statusFlags.isBattleShocked = false;
      return {
        unitId: unit.unitId,
        roll: 0,
        leadership,
        passed: true,
        wasTested: false,
        isBattleShocked: false,
      };
    }

    // Gieo 2D6 và so với Ld
    const roll = this.diceEngine.roll2D6();
    const passed = roll >= leadership;

    // Cập nhật cờ trạng thái trên đơn vị (OC sẽ trả về 0 nếu shocked)
    unit.statusFlags.isBattleShocked = !passed;

    return {
      unitId: unit.unitId,
      roll,
      leadership,
      passed,
      wasTested: true,
      isBattleShocked: !passed,
    };
  }

  /**
   * Xóa trạng thái Battle-shocked (gọi vào đầu Command Phase lượt sau).
   */
  clear(unit: Unit): void {
    unit.statusFlags.isBattleShocked = false;
  }
}
