// =========================================================================
// ⚙️ MODULE CONFIGURATION & CONSTANTS
// =========================================================================
export const WOUND_CHART_CONFIG = {
  DOUBLE_TOUGHNESS_FACTOR: 2, // Ngưỡng S >= 2T
  BEST_TARGET: 2,             // Xúc xắc dễ nhất cần đạt (2+)
  WORST_TARGET: 6,            // Xúc xắc khó nhất cần đạt (6+)
} as const;

// =========================================================================
// 📦 MODULE IMPLEMENTATION
// =========================================================================
export class WoundChart {
  /**
   * Bảng so sánh Strength (S) vs Toughness (T) theo WH40K 10th Edition.
   * Trả về ngưỡng xúc xắc mục tiêu: 2, 3, 4, 5 hoặc 6.
   *
   * Quy tắc:
   *   S >= 2T   → 2+
   *   S >  T    → 3+
   *   S == T    → 4+
   *   S <  T    → 5+  (khi S > T/2)
   *   S <= T/2  → 6+
   */
  static getWoundTarget(strength: number, toughness: number): number {
    // Điều kiện yếu nhất trước: S quá nhỏ so với T
    if (strength <= toughness / WOUND_CHART_CONFIG.DOUBLE_TOUGHNESS_FACTOR) {
      return WOUND_CHART_CONFIG.WORST_TARGET;
    }
    // S mạnh gấp đôi T trở lên
    if (strength >= toughness * WOUND_CHART_CONFIG.DOUBLE_TOUGHNESS_FACTOR) {
      return WOUND_CHART_CONFIG.BEST_TARGET;
    }
    // S mạnh hơn T nhưng chưa gấp đôi
    if (strength > toughness) {
      return 3;
    }
    // S bằng T
    if (strength === toughness) {
      return 4;
    }
    // Còn lại: S nhỏ hơn T nhưng lớn hơn T/2
    return 5;
  }
}
