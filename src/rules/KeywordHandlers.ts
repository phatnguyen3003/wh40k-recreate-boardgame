import { DiceEngine } from '../core/DiceEngine';

// =========================================================================
// ⚙️ MODULE CONFIGURATION & CONSTANTS
// =========================================================================
export const KEYWORD_HANDLER_CONFIG = {
  CRITICAL_THRESHOLD: 6,            // Mặt 6 tự nhiên = Critical
  BLAST_MODELS_PER_EXTRA_ATTACK: 5, // Blast: +1 phát bắn cho mỗi 5 lính mục tiêu
} as const;

// =========================================================================
// 📦 MODULE IMPLEMENTATION
// =========================================================================
export class KeywordHandlers {
  private diceEngine: DiceEngine;

  constructor(diceEngine: DiceEngine) {
    this.diceEngine = diceEngine;
  }

  /**
   * Blast: cộng thêm +1 phát bắn cho mỗi 5 mô hình của đơn vị mục tiêu.
   */
  applyBlast(baseAttacks: number, targetModelCount: number): number {
    const bonusAttacks = Math.floor(targetModelCount / KEYWORD_HANDLER_CONFIG.BLAST_MODELS_PER_EXTRA_ATTACK);
    return baseAttacks + bonusAttacks;
  }

  /**
   * Lethal Hits: mỗi Critical Hit (mặt 6) tự động gây vết thương (bỏ qua Wound Roll).
   * Trả về số lượng vết thương tự động (auto-wound).
   */
  applyLethalHits(hitRolls: readonly number[]): number {
    return hitRolls.filter((roll) => roll === KEYWORD_HANDLER_CONFIG.CRITICAL_THRESHOLD).length;
  }

  /**
   * Sustained Hits X: mỗi Critical Hit (mặt 6) sinh thêm X đòn trúng bổ sung.
   * Trả về tổng số đòn trúng cộng thêm.
   */
  applySustainedHits(hitRolls: readonly number[], bonusFactor: number): number {
    const criticalHits = hitRolls.filter(
      (roll) => roll === KEYWORD_HANDLER_CONFIG.CRITICAL_THRESHOLD,
    ).length;
    return criticalHits * bonusFactor;
  }

  /**
   * Devastating Wounds: mỗi Critical Wound (mặt 6) gây sát thương bỏ qua Save & Invuln.
   * Trả về số lượng vết thương chí mạng (bypass toàn bộ giáp).
   */
  applyDevastatingWounds(woundRolls: readonly number[]): number {
    return woundRolls.filter((roll) => roll === KEYWORD_HANDLER_CONFIG.CRITICAL_THRESHOLD).length;
  }

  /**
   * Feel No Pain X+: với mỗi 1 điểm sát thương nhận vào, gieo 1D6.
   * Nếu kết quả >= X → điểm sát thương đó bị triệt tiêu.
   * Trả về số điểm sát thương THỰC SỰ đi qua (chưa bị triệt tiêu).
   */
  applyFeelNoPain(damagePoints: number, fnpThreshold: number | null | undefined): number {
    // Không có FNP → toàn bộ sát thương đi qua
    if (!fnpThreshold) {
      return damagePoints;
    }

    let damageThrough = 0;
    for (let i = 0; i < damagePoints; i++) {
      // Gieo thành công (>= X) là triệt tiêu; thất bại (< X) là mất 1 wound
      if (this.diceEngine.rollD6() < fnpThreshold) {
        damageThrough++;
      }
    }
    return damageThrough;
  }
}
