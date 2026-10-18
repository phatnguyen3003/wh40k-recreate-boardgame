import { describe, it, expect } from 'vitest';
import { WoundChart, WOUND_CHART_CONFIG } from '../rules/WoundChart';

// =========================================================================
// 📐 HÀM THAM CHIẾU ĐỘC LẬP (ĐỐI CHIẾU CHÉO)
// =========================================================================
// Viết lại luật gốc theo cách diễn đạt KHÁC (không copy code nguồn) để đối
// chiếu chéo. Nếu 2 cách cài đặt cho ra kết quả khác nhau → có bug.
//
// Quy tắc WH40K 10th (S = Strength vũ khí, T = Toughness mục tiêu):
//   S >= 2T   → 2+   (dễ nhất)
//   S >  T    → 3+
//   S == T    → 4+   (chuẩn)
//   T/2 < S < T → 5+
//   S <= T/2  → 6+   (khó nhất)
function referenceWoundTarget(strength: number, toughness: number): number {
  if (strength >= 2 * toughness) return WOUND_CHART_CONFIG.BEST_TARGET; // 2
  if (strength > toughness) return 3;
  if (strength === toughness) return 4;
  if (strength > toughness / 2) return 5;
  return WOUND_CHART_CONFIG.WORST_TARGET; // 6
}

// =========================================================================
// 🧪 BẢNG CA TEST BIÊN (BOUNDARY CASES)
// =========================================================================
// Mỗi dòng: [S, T, ngưỡng kỳ vọng, mô tả quy tắc đang được kiểm chứng]
type WoundCase = [strength: number, toughness: number, expected: number, note: string];

const boundaryCases: WoundCase[] = [
  // --- Nhóm S >= 2T → 2+ ---
  [2, 1, 2, 'S = 2T (đúng ngưỡng gấp đôi)'],
  [3, 1, 2, 'S > 2T'],
  [4, 2, 2, 'S = 2T'],
  [8, 4, 2, 'S = 2T'],
  [9, 4, 2, 'S > 2T'],
  [10, 5, 2, 'S = 2T (T lẻ)'],
  [6, 3, 2, 'S = 2T'],
  [12, 6, 2, 'S = 2T'],
  [14, 7, 2, 'S = 2T (giá trị cao)'],

  // --- Nhóm 2T > S > T → 3+ ---
  [3, 2, 3, 'S > T'],
  [5, 4, 3, 'T < S < 2T'],
  [6, 5, 3, 'T < S < 2T (T lẻ)'],
  [4, 3, 3, 'S > T'],
  [7, 4, 3, 'S = 2T - 1 → vẫn 3+ (biên dưới của 2+)'],
  [9, 5, 3, 'S = 2T - 1 (T lẻ)'],
  [11, 6, 3, 'S = 2T - 1'],
  [5, 3, 3, 'S > T'],

  // --- Nhóm S == T → 4+ ---
  [1, 1, 4, 'S = T (giá trị nhỏ nhất)'],
  [2, 2, 4, 'S = T'],
  [4, 4, 4, 'S = T'],
  [5, 5, 4, 'S = T'],
  [10, 10, 4, 'S = T'],
  [14, 14, 4, 'S = T (giá trị cao)'],

  // --- Nhóm T/2 < S < T → 5+ ---
  [3, 4, 5, 'T/2 < S < T'],
  [3, 5, 5, 'T/2 < S < T (T lẻ, 2.5 < 3 < 5)'],
  [4, 6, 5, 'T/2 < S < T'],
  [2, 3, 5, '2 > T/2(1.5) và 2 < 3'],

  // --- Nhóm S <= T/2 → 6+ ---
  [1, 2, 6, 'S = T/2 (đúng ngưỡng)'],
  [2, 4, 6, 'S = T/2'],
  [1, 3, 6, 'S < T/2'],
  [2, 5, 6, 'S < T/2 (T lẻ: 2 < 2.5)'],
  [3, 6, 6, 'S = T/2'],
  [3, 7, 6, 'S < T/2 (3 < 3.5)'],
  [0, 1, 6, 'Giá trị biên không thực tế: S = 0'],
];

describe('WoundChart.getWoundTarget', () => {
  // -----------------------------------------------------------------------
  // 1) Kiểm chứng từng ca biên với mô tả quy tắc rõ ràng
  // -----------------------------------------------------------------------
  it.each(boundaryCases)(
    'S=%i vs T=%i → %i+  (%s)',
    (strength, toughness, expected) => {
      expect(WoundChart.getWoundTarget(strength, toughness)).toBe(expected);
    },
  );

  // -----------------------------------------------------------------------
  // 2) Đối chiếu chéo toàn ma trận S[1..20] x T[1..20] với hàm tham chiếu
  // -----------------------------------------------------------------------
  it('khớp với hàm tham chiếu trên toàn ma trận S[1..20] x T[1..20]', () => {
    for (let s = 1; s <= 20; s++) {
      for (let t = 1; t <= 20; t++) {
        expect(WoundChart.getWoundTarget(s, t)).toBe(referenceWoundTarget(s, t));
      }
    }
  });

  // -----------------------------------------------------------------------
  // 3) Bất biến (property test): ngưỡng luôn thuộc {2,3,4,5,6}
  // -----------------------------------------------------------------------
  it('ngưỡng luôn nằm trong tập hợp {2,3,4,5,6}', () => {
    const allowed = new Set([2, 3, 4, 5, 6]);
    for (let s = 1; s <= 20; s++) {
      for (let t = 1; t <= 20; t++) {
        expect(allowed.has(WoundChart.getWoundTarget(s, t))).toBe(true);
      }
    }
  });

  // -----------------------------------------------------------------------
  // 4) Bất biến đơn điệu: tăng S (T cố định) không bao giờ làm Wound khó hơn
  //    (ngưỡng phải không tăng khi S tăng).
  // -----------------------------------------------------------------------
  it('đơn điệu theo S: S tăng thì ngưỡng không tăng (T cố định)', () => {
    for (let t = 1; t <= 14; t++) {
      let previous = WoundChart.getWoundTarget(1, t);
      for (let s = 2; s <= 20; s++) {
        const current = WoundChart.getWoundTarget(s, t);
        expect(current).toBeLessThanOrEqual(previous);
        previous = current;
      }
    }
  });

  // -----------------------------------------------------------------------
  // 5) Bất biến đơn điệu: tăng T (S cố định) không bao giờ làm Wound dễ hơn
  //    (ngưỡng phải không giảm khi T tăng).
  // -----------------------------------------------------------------------
  it('đơn điệu theo T: T tăng thì ngưỡng không giảm (S cố định)', () => {
    for (let s = 1; s <= 14; s++) {
      let previous = WoundChart.getWoundTarget(s, 1);
      for (let t = 2; t <= 20; t++) {
        const current = WoundChart.getWoundTarget(s, t);
        expect(current).toBeGreaterThanOrEqual(previous);
        previous = current;
      }
    }
  });

  // -----------------------------------------------------------------------
  // 6) Hằng số cấu hình phải khớp luật (tránh ai đó sửa nhầm)
  // -----------------------------------------------------------------------
  it('hằng số cấu hình phản ánh đúng luật gốc', () => {
    expect(WOUND_CHART_CONFIG.DOUBLE_TOUGHNESS_FACTOR).toBe(2);
    expect(WOUND_CHART_CONFIG.BEST_TARGET).toBe(2);
    expect(WOUND_CHART_CONFIG.WORST_TARGET).toBe(6);
  });
});
