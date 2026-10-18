import { describe, it, expect } from 'vitest';
import { DiceEngine } from '../core/DiceEngine';
import { BattleShockRule, BATTLE_SHOCK_CONFIG } from '../rules/BattleShockRule';
import { Unit, UnitData } from '../entities/Unit';
import { createDeterministicRng } from './CombatSimulator';

// =========================================================================
// ⚙️ TEST CONFIGURATION & FIXTURES
// =========================================================================
// LUẬT BATTLE-SHOCK (WH40K 10th Edition):
//   1. Chỉ kiểm tra khi đơn vị ở DƯỚI 50% quân số ban đầu
//      (điều kiện code: aliveModels < initialModelCount * 0.5).
//   2. Gieo 2D6: kết quả >= Leadership (Ld) → VƯỢT QUA.
//   3. Thất bại → đơn vị bị Battle-shocked:
//        - Objective Control (OC) trở về 0.
//        - Không được dùng Stratagem, không được Hold/Retreat...
//   4. Đơn vị đủ quân (hoặc vượt test) tự động được GỠ cờ shocked.
const SHOCK_TEST_CONFIG = {
  OBJECTIVE_CONTROL: 2,    // OC mỗi mô hình (để kiểm tra tác động của Battle-shock lên OC)
  DEFAULT_LEADERSHIP: 7,   // Ld mặc định của đơn vị thử nghiệm
} as const;

interface ShockUnitOptions {
  modelCount?: number;     // tổng số mô hình ban đầu (mặc định 4)
  aliveCount?: number;     // số mô hình còn sống (mặc định = modelCount)
  leadership?: number;     // chỉ số Ld (mặc định 7)
}

/**
 * Tạo một Unit thử nghiệm. Nếu aliveCount < modelCount, "giết" bớt
 * (modelCount - aliveCount) mô hình đầu tiên (mỗi mô hình 1 máu).
 */
function makeShockUnit(options: ShockUnitOptions = {}): Unit {
  const modelCount = options.modelCount ?? 4;
  const aliveCount = options.aliveCount ?? modelCount;
  const leadership = options.leadership ?? SHOCK_TEST_CONFIG.DEFAULT_LEADERSHIP;

  const models = Array.from({ length: modelCount }, (_, i) => ({
    id: `shock_m${i + 1}`,
    is_leader: false,
  }));

  const data: UnitData = {
    unit_id: 'shock_unit',
    name: 'Shock Unit',
    keywords: ['INFANTRY'],
    stats: {
      movement: 6,
      toughness: 4,
      save: 3,
      invulnerable_save: null,
      wounds_per_model: 1,
      leadership,
      objective_control: SHOCK_TEST_CONFIG.OBJECTIVE_CONTROL,
    },
    base_size_mm: 32,
    models,
    weapons: [],
  };

  const unit = new Unit(data);
  const toKill = modelCount - aliveCount;
  for (let i = 0; i < toKill; i++) {
    unit.models[i].takeDamage(1);
  }
  return unit;
}

interface ShockCase {
  name: string;
  note: string;              // giải thích luật / lý do kỳ vọng
  dice: [number, number];    // 2 mặt xúc xắc cho lần gieo 2D6
  modelCount?: number;
  aliveCount?: number;
  leadership?: number;
  expectedWasTested: boolean;
  expectedPassed: boolean;
  expectedRoll: number;      // 0 khi đơn vị KHÔNG phải test
  expectedShocked: boolean;
  expectedOC: number;        // OC cuối cùng sau test (0 nếu shocked)
}

// Bảng dữ liệu test: bao phủ 4 nhóm — không test / vượt / thất bại / biên.
const shockCases: ShockCase[] = [
  // --- Nhóm 1: KHÔNG phải test (còn trên hoặc đúng nửa quân số) ---
  {
    name: 'Đủ quân 4/4 → không cần test',
    note: 'alive 4 không < 4×0.5=2 → không dưới 50%',
    dice: [1, 1],
    modelCount: 4,
    aliveCount: 4,
    leadership: 7,
    expectedWasTested: false,
    expectedPassed: true,
    expectedRoll: 0,
    expectedShocked: false,
    expectedOC: 8,
  },
  {
    name: 'Đúng một nửa 2/4 → chưa tính là dưới 50%',
    note: 'điều kiện là alive < 2, mà 2 không < 2',
    dice: [1, 1],
    modelCount: 4,
    aliveCount: 2,
    leadership: 7,
    expectedWasTested: false,
    expectedPassed: true,
    expectedRoll: 0,
    expectedShocked: false,
    expectedOC: 4,
  },
  {
    name: 'Đơn vị 1 mô hình còn sống → không bao giờ dưới 50%',
    note: '1 không < 0.5; đơn vị đơn lẻ miễn nhiễm Battle-shock',
    dice: [1, 1],
    modelCount: 1,
    aliveCount: 1,
    leadership: 7,
    expectedWasTested: false,
    expectedPassed: true,
    expectedRoll: 0,
    expectedShocked: false,
    expectedOC: 2,
  },
  {
    name: 'Đơn vị 5 mô hình còn 3 → chưa dưới 50% (ngưỡng nửa không nguyên)',
    note: 'ngưỡng = 2.5; alive 3 không < 2.5',
    dice: [1, 1],
    modelCount: 5,
    aliveCount: 3,
    leadership: 7,
    expectedWasTested: false,
    expectedPassed: true,
    expectedRoll: 0,
    expectedShocked: false,
    expectedOC: 6,
  },

  // --- Nhóm 2: VƯỢT test (2D6 >= Ld) ---
  {
    name: 'Dưới 50% (1/4), 2D6=12 ≥ Ld 7 → vượt qua, giữ OC',
    note: '12 ≥ 7 nên không bị Battle-shocked',
    dice: [6, 6],
    modelCount: 4,
    aliveCount: 1,
    leadership: 7,
    expectedWasTested: true,
    expectedPassed: true,
    expectedRoll: 12,
    expectedShocked: false,
    expectedOC: 2,
  },
  {
    name: 'Ld 10 với 4/10 lính (dưới 50%), 2D6=10 → vừa đủ vượt',
    note: '4 < 5 → dưới nửa; 10 ≥ 10',
    dice: [5, 5],
    modelCount: 10,
    aliveCount: 4,
    leadership: 10,
    expectedWasTested: true,
    expectedPassed: true,
    expectedRoll: 10,
    expectedShocked: false,
    expectedOC: 8,
  },
  {
    name: 'Ld thấp 2, 2D6=2 → tối thiểu vẫn vượt',
    note: 'biên dưới của 2D6; 2 ≥ 2',
    dice: [1, 1],
    modelCount: 4,
    aliveCount: 1,
    leadership: 2,
    expectedWasTested: true,
    expectedPassed: true,
    expectedRoll: 2,
    expectedShocked: false,
    expectedOC: 2,
  },

  // --- Nhóm 3: THẤT BẠI (2D6 < Ld → Battle-shocked, OC = 0) ---
  {
    name: 'Dưới 50% (1/4), 2D6=2 < Ld 7 → Battle-shocked',
    note: '2 < 7 → OC về 0',
    dice: [1, 1],
    modelCount: 4,
    aliveCount: 1,
    leadership: 7,
    expectedWasTested: true,
    expectedPassed: false,
    expectedRoll: 2,
    expectedShocked: true,
    expectedOC: 0,
  },
  {
    name: 'Đơn vị 5 mô hình còn 2 (2 < 2.5) → dưới 50%, 2D6=4 thất bại',
    note: 'ngưỡng nửa không nguyên; 4 < 7',
    dice: [2, 2],
    modelCount: 5,
    aliveCount: 2,
    leadership: 7,
    expectedWasTested: true,
    expectedPassed: false,
    expectedRoll: 4,
    expectedShocked: true,
    expectedOC: 0,
  },

  // --- Nhóm 4: BIÊN (đúng ngưỡng Ld) ---
  {
    name: 'Biên: 2D6 = Ld (7) → vẫn vượt qua',
    note: 'điều kiện là roll >= Ld (dấu bằng vẫn qua)',
    dice: [3, 4],
    modelCount: 4,
    aliveCount: 1,
    leadership: 7,
    expectedWasTested: true,
    expectedPassed: true,
    expectedRoll: 7,
    expectedShocked: false,
    expectedOC: 2,
  },
  {
    name: 'Biên: 2D6 = Ld-1 (6) → thất bại sát nút',
    note: '6 < 7 → Battle-shocked',
    dice: [3, 3],
    modelCount: 4,
    aliveCount: 1,
    leadership: 7,
    expectedWasTested: true,
    expectedPassed: false,
    expectedRoll: 6,
    expectedShocked: true,
    expectedOC: 0,
  },
  {
    name: 'Biên: Ld 12 (cao nhất), 2D6=12 → vừa đủ vượt',
    note: 'biên trên của 2D6 trùng Ld',
    dice: [6, 6],
    modelCount: 4,
    aliveCount: 1,
    leadership: 12,
    expectedWasTested: true,
    expectedPassed: true,
    expectedRoll: 12,
    expectedShocked: false,
    expectedOC: 2,
  },
];

// =========================================================================
// 📦 MODULE IMPLEMENTATION (TEST SUITES)
// =========================================================================
describe('BattleShockRule.performTest — bảng ca dữ liệu', () => {
  it.each(shockCases)('$name', (c) => {
    const unit = makeShockUnit({
      modelCount: c.modelCount,
      aliveCount: c.aliveCount,
      leadership: c.leadership,
    });
    const rule = new BattleShockRule(new DiceEngine(createDeterministicRng(c.dice)));
    const result = rule.performTest(unit);

    // Trạng thái trả về
    expect(result.wasTested, c.note).toBe(c.expectedWasTested);
    expect(result.passed, c.note).toBe(c.expectedPassed);
    expect(result.roll, c.note).toBe(c.expectedRoll);
    expect(result.leadership, c.note).toBe(c.leadership ?? SHOCK_TEST_CONFIG.DEFAULT_LEADERSHIP);
    expect(result.unitId, c.note).toBe('shock_unit');

    // Trạng thái phải đồng bộ giữa object kết quả và cờ trên đơn vị
    expect(result.isBattleShocked, c.note).toBe(c.expectedShocked);
    expect(unit.statusFlags.isBattleShocked, c.note).toBe(c.expectedShocked);

    // Tác động lên Objective Control (shocked → OC = 0)
    expect(unit.getTotalOC(), c.note).toBe(c.expectedOC);
  });
});

describe('BattleShockRule — hằng số luật chơi', () => {
  it('Battle-shock luôn gieo đúng 2D6', () => {
    expect(BATTLE_SHOCK_CONFIG.MIN_DICE_FOR_TEST).toBe(2);
  });

  it('kết quả gieo 2D6 luôn nằm trong đoạn [2, 12]', () => {
    const pairs: Array<[number, number]> = [
      [1, 1],
      [1, 6],
      [6, 1],
      [3, 4],
      [6, 6],
    ];
    for (const pair of pairs) {
      const unit = makeShockUnit({ modelCount: 4, aliveCount: 1, leadership: 7 });
      const rule = new BattleShockRule(new DiceEngine(createDeterministicRng(pair)));
      const result = rule.performTest(unit);
      expect(result.roll).toBeGreaterThanOrEqual(2);
      expect(result.roll).toBeLessThanOrEqual(12);
      // roll phải bằng đúng tổng 2 mặt xúc xắc đã nạp
      expect(result.roll).toBe(pair[0] + pair[1]);
    }
  });
});

describe('BattleShockRule.clear', () => {
  it('xóa trạng thái Battle-shocked và khôi phục Objective Control', () => {
    const unit = makeShockUnit({ modelCount: 4, aliveCount: 1, leadership: 7 });
    const rule = new BattleShockRule(new DiceEngine(createDeterministicRng([1, 1])));

    rule.performTest(unit); // 2D6=2 < 7 → thất bại
    expect(unit.statusFlags.isBattleShocked).toBe(true);
    expect(unit.getTotalOC()).toBe(0);

    rule.clear(unit);
    expect(unit.statusFlags.isBattleShocked).toBe(false);
    expect(unit.getTotalOC()).toBe(2); // 1 mô hình còn sống × OC 2
  });

  it('không gây lỗi khi đơn vị vốn không bị Battle-shocked', () => {
    const unit = makeShockUnit({ modelCount: 4, aliveCount: 4 });
    const rule = new BattleShockRule(new DiceEngine(createDeterministicRng([1, 1])));

    rule.clear(unit);
    expect(unit.statusFlags.isBattleShocked).toBe(false);
    expect(unit.getTotalOC()).toBe(8);
  });
});

describe('Battle-shock và chuyển trạng thái giữa các lượt', () => {
  it('vượt test sẽ gỡ cờ shocked còn sót từ lượt trước', () => {
    const unit = makeShockUnit({ modelCount: 4, aliveCount: 1, leadership: 7 });
    unit.statusFlags.isBattleShocked = true; // giả lập bị shocked từ lượt trước

    const rule = new BattleShockRule(new DiceEngine(createDeterministicRng([6, 6])));
    const result = rule.performTest(unit);

    expect(result.passed).toBe(true);
    expect(unit.statusFlags.isBattleShocked).toBe(false);
    expect(unit.getTotalOC()).toBe(2); // OC được khôi phục sau khi hết shocked
  });

  it('đơn vị đủ quân tự động gỡ cờ shocked dù không phải test', () => {
    const unit = makeShockUnit({ modelCount: 4, aliveCount: 4 });
    unit.statusFlags.isBattleShocked = true;

    const rule = new BattleShockRule(new DiceEngine(createDeterministicRng([1, 1])));
    const result = rule.performTest(unit);

    expect(result.wasTested).toBe(false);
    expect(unit.statusFlags.isBattleShocked).toBe(false);
  });
});
