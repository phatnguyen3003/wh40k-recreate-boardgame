import { describe, it, expect } from 'vitest';
import { DiceEngine } from '../core/DiceEngine';
import { KeywordHandlers, KEYWORD_HANDLER_CONFIG } from '../rules/KeywordHandlers';
import { createDeterministicRng } from './CombatSimulator';

// =========================================================================
// 🔧 TIỆN ÍCH: RNG TẤT ĐỊNH (seed cố định) CHO KIỂM THỬ THỐNG KÊ
// =========================================================================
// mulberry32: bộ sinh số giả ngẫu nhiên nhỏ, nhanh, cho cùng kết quả với cùng
// seed → test không bị "flaky" nhưng vẫn kiểm chứng được phân phối.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('KeywordHandlers', () => {
  const handlers = new KeywordHandlers(new DiceEngine());

  // =======================================================================
  // BLAST — +1 phát bắn cho mỗi 5 mô hình của mục tiêu
  // Công thức: attacks + floor(targetModelCount / 5)
  // =======================================================================
  describe('applyBlast', () => {
    const cases: Array<{ name: string; base: number; count: number; expected: number }> = [
      { name: 'Mục tiêu rỗng (0 mô hình) → không cộng', base: 0, count: 0, expected: 0 },
      { name: '1 mô hình → chưa đủ 5 → +0', base: 1, count: 1, expected: 1 },
      { name: '4 mô hình → chưa đủ 5 → +0', base: 2, count: 4, expected: 2 },
      { name: '5 mô hình → +1 (đúng ngưỡng)', base: 2, count: 5, expected: 3 },
      { name: '9 mô hình → +1 (vẫn dưới 10)', base: 3, count: 9, expected: 4 },
      { name: '10 mô hình → +2 (đúng bội số)', base: 3, count: 10, expected: 5 },
      { name: '25 mô hình → +5', base: 1, count: 25, expected: 6 },
      { name: '100 mô hình → +20', base: 0, count: 100, expected: 20 },
      { name: 'base 0 vẫn cộng đúng phần Blast', base: 0, count: 15, expected: 3 },
      { name: '5 mô hình, base 5 → 6', base: 5, count: 5, expected: 6 },
    ];

    it.each(cases)('$name', ({ base, count, expected }) => {
      expect(handlers.applyBlast(base, count)).toBe(expected);
    });

    it('hằng số cấu hình Blast = 5 mô hình / 1 phát bắn', () => {
      expect(KEYWORD_HANDLER_CONFIG.BLAST_MODELS_PER_EXTRA_ATTACK).toBe(5);
    });
  });

  // =======================================================================
  // LETHAL HITS — mỗi Critical Hit (mặt 6) tự động gây vết thương
  // Trả về: số auto-wound = số mặt 6 trong danh sách hit roll
  // =======================================================================
  describe('applyLethalHits', () => {
    const cases: Array<{ name: string; rolls: number[]; expected: number }> = [
      { name: 'Danh sách rỗng → 0', rolls: [], expected: 0 },
      { name: 'Không có mặt 6 → 0', rolls: [1, 2, 3, 4, 5], expected: 0 },
      { name: 'Đúng 1 mặt 6 → 1', rolls: [6], expected: 1 },
      { name: 'Toàn mặt 6 → 3', rolls: [6, 6, 6], expected: 3 },
      { name: 'Hỗn hợp [6,6,3,1,4] → 2', rolls: [6, 6, 3, 1, 4], expected: 2 },
      { name: 'Mặt 6 xen kẽ → 2', rolls: [5, 6, 5, 6, 5], expected: 2 },
      { name: 'Toàn mặt 1 → 0', rolls: [1, 1, 1], expected: 0 },
    ];

    it.each(cases)('$name', ({ rolls, expected }) => {
      expect(handlers.applyLethalHits(rolls)).toBe(expected);
    });

    it('Critical Threshold là mặt 6', () => {
      expect(KEYWORD_HANDLER_CONFIG.CRITICAL_THRESHOLD).toBe(6);
    });
  });

  // =======================================================================
  // SUSTAINED HITS X — mỗi Critical Hit (mặt 6) sinh thêm X đòn trúng
  // Trả về: số đòn trúng bổ sung = (số mặt 6) * X
  // =======================================================================
  describe('applySustainedHits', () => {
    const cases: Array<{
      name: string;
      rolls: number[];
      factor: number;
      expected: number;
    }> = [
        { name: 'Danh sách rỗng → 0', rolls: [], factor: 1, expected: 0 },
        { name: 'factor 0 (không có bonus) → 0', rolls: [6, 3, 4], factor: 0, expected: 0 },
        { name: 'Sustained Hits 2, 2 crit → 4', rolls: [6, 3, 6, 2], factor: 2, expected: 4 },
        { name: 'Sustained Hits 1, 3 crit → 3', rolls: [6, 6, 6], factor: 1, expected: 3 },
        { name: 'Không có crit → 0', rolls: [2, 3, 4], factor: 2, expected: 0 },
        { name: 'Sustained Hits 3, 1 crit → 3', rolls: [6], factor: 3, expected: 3 },
        { name: '3 crit * factor 2 → 6', rolls: [6, 6, 1, 1, 6], factor: 2, expected: 6 },
      ];

    it.each(cases)('$name', ({ rolls, factor, expected }) => {
      expect(handlers.applySustainedHits(rolls, factor)).toBe(expected);
    });
  });

  // =======================================================================
  // DEVASTATING WOUNDS — mỗi Critical Wound (mặt 6) bỏ qua Save & Invuln
  // Trả về: số vết thương chí mạng = số mặt 6 trong danh sách wound roll
  // =======================================================================
  describe('applyDevastatingWounds', () => {
    const cases: Array<{ name: string; rolls: number[]; expected: number }> = [
      { name: 'Danh sách rỗng → 0', rolls: [], expected: 0 },
      { name: 'Không có mặt 6 → 0', rolls: [2, 3, 4], expected: 0 },
      { name: '[6,5,6,1] → 2', rolls: [6, 5, 6, 1], expected: 2 },
      { name: 'Toàn mặt 6 → 4', rolls: [6, 6, 6, 6], expected: 4 },
      { name: '[1,6,1,6,1,6] → 3', rolls: [1, 6, 1, 6, 1, 6], expected: 3 },
    ];

    it.each(cases)('$name', ({ rolls, expected }) => {
      expect(handlers.applyDevastatingWounds(rolls)).toBe(expected);
    });
  });

  // =======================================================================
  // FEEL NO PAIN X+ — mỗi điểm sát thương gieo 1D6; nếu >= X thì bị triệt tiêu
  // Trả về: số điểm sát thương THỰC SỰ đi qua (roll < X)
  // Dùng RNG tất định để kiểm soát chính xác chuỗi xúc xắc.
  // =======================================================================
  describe('applyFeelNoPain', () => {
    const cases: Array<{
      name: string;
      damage: number;
      threshold: number | null | undefined;
      rngValues: number[];
      expected: number;
    }> = [
        // --- Không có FNP → toàn bộ sát thương đi qua, KHÔNG tiêu tốn RNG ---
        { name: 'threshold null → toàn bộ đi qua', damage: 5, threshold: null, rngValues: [1], expected: 5 },
        { name: 'threshold undefined → toàn bộ đi qua', damage: 4, threshold: undefined, rngValues: [1], expected: 4 },
        { name: 'threshold 0 (giá trị "falsy") → toàn bộ đi qua', damage: 3, threshold: 0, rngValues: [1], expected: 3 },
        // --- Biên: 0 điểm sát thương → không gieo gì ---
        { name: '0 điểm sát thương → 0', damage: 0, threshold: 5, rngValues: [1], expected: 0 },
        // --- FNP 5+: chỉ mặt 6 mới triệt tiêu (đi qua khi < 5) ---
        { name: 'FNP 5+ với [1,2,6] → 2 đi qua', damage: 3, threshold: 5, rngValues: [1, 2, 6], expected: 2 },
        // --- FNP 6+: chỉ mặt 6 mới triệt tiêu (đi qua khi < 6) ---
        { name: 'FNP 6+ với [1,2,3,4,5,6] → 5 đi qua', damage: 6, threshold: 6, rngValues: [1, 2, 3, 4, 5, 6], expected: 5 },
        // --- FNP 2+: chỉ mặt 1 đi qua ---
        { name: 'FNP 2+ với [1,6] → 1 đi qua', damage: 2, threshold: 2, rngValues: [1, 6], expected: 1 },
        { name: 'FNP 2+ với [1,1,1] → 3 đi qua', damage: 3, threshold: 2, rngValues: [1, 1, 1], expected: 3 },
        // --- FNP 6+ và toàn mặt 6 → không điểm nào đi qua ---
        { name: 'FNP 6+ với toàn mặt 6 → 0 đi qua', damage: 4, threshold: 6, rngValues: [6, 6, 6, 6], expected: 0 },
        // --- Đếm chính xác trên chuỗi dài: chỉ các roll < 4 (1,2,3) đi qua ---
        { name: 'FNP 4+ chuỗi 10 roll → 6 đi qua', damage: 10, threshold: 4, rngValues: [1, 2, 3, 4, 5, 6, 1, 2, 3, 4], expected: 6 },
        // --- Ngưỡng ngoài dải D6 (7) → không mặt nào bị triệt tiêu ---
        { name: 'FNP 7+ (ngoài dải D6) → toàn bộ đi qua', damage: 3, threshold: 7, rngValues: [1, 2, 3], expected: 3 },
      ];

    it.each(cases)('$name', ({ damage, threshold, rngValues, expected }) => {
      const engine = new DiceEngine(createDeterministicRng(rngValues));
      const localHandlers = new KeywordHandlers(engine);
      expect(localHandlers.applyFeelNoPain(damage, threshold)).toBe(expected);
    });

    // --- Kiểm chứng thống kê: tỉ lệ đi qua ≈ (X-1)/6 ---
    it('phân phối đúng: FNP 5+ → ~66.7% sát thương đi qua', () => {
      const localHandlers = new KeywordHandlers(new DiceEngine(mulberry32(20240101)));
      const total = 20000;
      const through = localHandlers.applyFeelNoPain(total, 5);
      // Kỳ vọng: mặt 1..4 đi qua (4/6 = 2/3) → ~13333
      // Dung sai ±500 (≈7σ) để an toàn cả về mặt xác suất lẫn làm tròn
      expect(through).toBeCloseTo(total * (4 / 6), -3);
    });

    it('phân phối đúng: FNP 6+ → ~83.3% sát thương đi qua', () => {
      const localHandlers = new KeywordHandlers(new DiceEngine(mulberry32(777)));
      const total = 20000;
      const through = localHandlers.applyFeelNoPain(total, 6);
      expect(through).toBeCloseTo(total * (5 / 6), -3);
    });
  });
});
