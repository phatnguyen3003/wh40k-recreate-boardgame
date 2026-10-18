import { describe, it, expect } from 'vitest';
import { DiceEngine } from '../core/DiceEngine';
import { Weapon, WeaponData } from '../entities/Weapon';
import { Unit, UnitData } from '../entities/Unit';
import { CombatOptions } from '../rules/CombatPipeline';
import { CombatSimulator, createDeterministicRng, COMBAT_SIMULATOR_CONFIG } from './CombatSimulator';

// =========================================================================
// ⚙️ TEST CONFIGURATION & FIXTURES
// =========================================================================
// CombatSimulator có 2 nhiệm vụ:
//   1. calculateExpectedDamage — "Mathhammer": tính kỳ vọng sát thương đại số
//      (KHÔNG dùng xúc xắc thật), theo công thức:
//          n_đòn × P(trúng) × P(thương) × P(save thất bại) × sát_thương_trung_bình
//   2. simulate — Monte Carlo: gieo xúc xắc thật N lần rồi lấy trung bình,
//      dùng để kiểm chứng công thức Mathhammer.
//
// Xác suất gieo 1D6 >= target (mặt 1 luôn trượt, target hiệu dụng 2..6):
//   P = (6 - target + 1) / 6

const WEAPON_DEFAULTS: WeaponData = {
  weapon_id: 'test_weapon',
  name: 'Test Weapon',
  type: 'RANGED',
  range: 24,
  attacks: '1',
  skill: 3,
  strength: 4,
  ap: 0,
  damage: '1',
  abilities: [],
};

function makeWeapon(overrides: Partial<WeaponData> = {}): Weapon {
  return new Weapon({ ...WEAPON_DEFAULTS, ...overrides });
}

interface TargetOptions {
  toughness?: number;
  save?: number;
  invulnerableSave?: number | null;
  woundsPerModel?: number;
  objectiveControl?: number;
  modelCount?: number;
}

const TARGET_DEFAULTS: Required<TargetOptions> = {
  toughness: 4,
  save: 3,
  invulnerableSave: null,
  woundsPerModel: 1,
  objectiveControl: 1,
  modelCount: 10,
};

function makeTarget(options: TargetOptions = {}): Unit {
  const cfg = { ...TARGET_DEFAULTS, ...options };
  const models = Array.from({ length: cfg.modelCount }, (_, i) => ({
    id: `sim_target_m${i + 1}`,
    is_leader: false,
  }));
  const data: UnitData = {
    unit_id: 'sim_target',
    name: 'Simulation Target',
    keywords: ['INFANTRY'],
    stats: {
      movement: 6,
      toughness: cfg.toughness,
      save: cfg.save,
      invulnerable_save: cfg.invulnerableSave,
      wounds_per_model: cfg.woundsPerModel,
      leadership: 7,
      objective_control: cfg.objectiveControl,
    },
    base_size_mm: 32,
    models,
    weapons: [],
  };
  return new Unit(data);
}

// Intercessor (Space Marines) với Bolt Rifle — vũ khí "chuẩn" để đối chiếu
function makeIntercessorWeapon(): Weapon {
  return makeWeapon({
    weapon_id: 'bolt_rifle',
    name: 'Bolt Rifle',
    attacks: '2',
    skill: 3,
    strength: 4,
    ap: -1,
    damage: '1',
    abilities: ['ASSAULT', 'HEAVY'],
  });
}

// Đơn vị Termagants (Tyranids): T3, Sv6+, 10 mô hình 1 máu
function makeTermagantUnit(): Unit {
  const models = Array.from({ length: 10 }, (_, i) => ({
    id: `tyr_ter_${i + 1}`,
    is_leader: false,
  }));
  const data: UnitData = {
    unit_id: 'tyr_termagants',
    name: 'Termagant Brood',
    keywords: ['INFANTRY', 'SWARM'],
    stats: {
      movement: 6,
      toughness: 3,
      save: 6,
      invulnerable_save: null,
      wounds_per_model: 1,
      leadership: 6,
      objective_control: 1,
    },
    base_size_mm: 25,
    models,
    weapons: [],
  };
  return new Unit(data);
}

/** PRNG tất định (mulberry32) — dùng cho test thống kê Monte Carlo. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// =========================================================================
// 📦 MODULE IMPLEMENTATION (TEST SUITES)
// =========================================================================
describe('CombatSimulator — hằng số cấu hình', () => {
  it('giá trị mặc định đúng như thiết kế', () => {
    expect(COMBAT_SIMULATOR_CONFIG.DEFAULT_ITERATIONS).toBe(10000);
    expect(COMBAT_SIMULATOR_CONFIG.DIE_FACES).toBe(6);
  });
});

describe('createDeterministicRng — nguồn xúc xắc tất định', () => {
  it('lặp lại chuỗi mặt xúc xắc đã nạp (quấn vòng)', () => {
    const engine = new DiceEngine(createDeterministicRng([6, 3, 1]));
    // 5 lần gieo phải cho 6,3,1 rồi quay lại 6,3
    expect([
      engine.rollD6(),
      engine.rollD6(),
      engine.rollD6(),
      engine.rollD6(),
      engine.rollD6(),
    ]).toEqual([6, 3, 1, 6, 3]);
  });

  it('chuỗi 1 phần tử luôn trả cùng 1 mặt', () => {
    const engine = new DiceEngine(createDeterministicRng([4]));
    expect(engine.rollD6()).toBe(4);
    expect(engine.rollD6()).toBe(4);
    expect(engine.rollD6()).toBe(4);
  });

  it('roll2D6 trả về tổng 2 mặt liên tiếp', () => {
    const engine = new DiceEngine(createDeterministicRng([2, 6, 5, 1]));
    expect(engine.roll2D6()).toBe(8); // 2 + 6
    expect(engine.roll2D6()).toBe(6); // 5 + 1
  });
});

describe('CombatSimulator.averageOfDiceExpression — kỳ vọng biểu thức xúc xắc', () => {
  const sim = new CombatSimulator();

  // [biểu thức, kỳ vọng]. D_n trung bình = (n+1)/2.
  const avgCases: Array<[string, number]> = [
    ['0', 0],
    ['1', 1],
    ['2', 2],
    ['D3', 2],          // (3+1)/2 = 2
    ['d3', 2],          // không phân biệt hoa/thường
    ['D6', 3.5],        // (6+1)/2
    ['2D6', 7],         // 2 × 3.5
    ['3D6', 10.5],      // 3 × 3.5
    ['D6+1', 4.5],      // 3.5 + 1
    ['2D6+2', 9],       // 7 + 2
    ['D3+3', 5],        // 2 + 3
    ['10D6', 35],       // 10 × 3.5
    [' D6 + 1 ', 4.5],  // bỏ khoảng trắng trước khi phân tích
  ];

  it.each(avgCases)('averageOfDiceExpression("%s") = %f', (expr, expected) => {
    expect(sim.averageOfDiceExpression(expr)).toBeCloseTo(expected, 10);
  });

  // Biểu thức không hợp lệ phải ném lỗi (không âm thầm trả NaN)
  const invalidCases = ['abc', 'D', 'D6+X', '2X6', 'D+1'];

  it.each(invalidCases)('ném lỗi với biểu thức không hợp lệ "%s"', (expr) => {
    expect(() => sim.averageOfDiceExpression(expr)).toThrow();
  });
});

describe('CombatSimulator.calculateExpectedDamage — công thức Mathhammer', () => {
  const sim = new CombatSimulator();

  interface MathhammerCase {
    name: string;
    note: string;
    weapon: Partial<WeaponData>;
    target?: TargetOptions;
    options?: CombatOptions;
    expected: number;
  }

  // Mỗi ca ghi rõ công thức trong `note` để dễ kiểm chứng lại bằng tay.
  const cases: MathhammerCase[] = [
    {
      name: 'Bolt Rifle vs T3 Sv6+ (giáp không cứu được)',
      note: '2 × (4/6 trúng) × (4/6 thương S4>T3→3+) × (save 6−(−1)=7 → luôn thất bại) × 1 = 8/9',
      weapon: { attacks: '2', skill: 3, strength: 4, ap: -1, damage: '1' },
      target: { toughness: 3, save: 6 },
      expected: 8 / 9,
    },
    {
      name: 'Cùng vũ khí vs T4 Sv3+',
      note: '2 × (4/6) × (3/6 thương S=T→4+) × (3/6 save thất bại, save 3−(−1)=4) × 1 = 1/3',
      weapon: { attacks: '2', skill: 3, strength: 4, ap: -1, damage: '1' },
      target: { toughness: 4, save: 3 },
      expected: 1 / 3,
    },
    {
      name: 'Torrent — tự động trúng (hit = 100%)',
      note: 'attacks D6=3.5 × 1 × (4/6 thương S5>T4→3+) × (2/6 save thất bại, save 3) × 1 = 7/9',
      weapon: { attacks: 'D6', skill: 3, strength: 5, ap: 0, damage: '1', abilities: ['TORRENT'] },
      target: { toughness: 4, save: 3 },
      expected: 7 / 9,
    },
    {
      name: 'Blast — +1 đòn mỗi 5 mô hình mục tiêu',
      note: 'attacks 3.5 + floor(10/5)=2 = 5.5; ×(4/6) ×(3/6 S=T→4+) ×(3/6 save thất bại) ×1 = 11/12',
      weapon: { attacks: 'D6', skill: 3, strength: 4, ap: 0, damage: '1', abilities: ['BLAST'] },
      target: { toughness: 4, save: 4, modelCount: 10 },
      expected: 11 / 12,
    },
    {
      name: 'Heavy — cải thiện skill khi đứng yên (skill 4+ → 3+)',
      note: '2 × (4/6 trúng do Heavy 4+→3+) × (3/6 S=T→4+) × (3/6 save thất bại, save 4) × 1 = 1/3',
      weapon: { attacks: '2', skill: 4, strength: 4, ap: 0, damage: '1', abilities: ['HEAVY'] },
      target: { toughness: 4, save: 4 },
      options: { attackerRemainedStationary: true },
      expected: 1 / 3,
    },
    {
      name: 'Heavy — KHÔNG đứng yên giữ nguyên skill 4+',
      note: '2 × (3/6 trúng) × (3/6 thương) × (3/6 save thất bại) × 1 = 1/4',
      weapon: { attacks: '2', skill: 4, strength: 4, ap: 0, damage: '1', abilities: ['HEAVY'] },
      target: { toughness: 4, save: 4 },
      options: { attackerRemainedStationary: false },
      expected: 1 / 4,
    },
    {
      name: 'Lance — cải thiện wound khi charge (5+ → 4+)',
      note: '2 × (4/6) × (3/6 thương do Lance 5+→4+) × (3/6 save thất bại, save 4) × 1 = 1/3',
      weapon: { attacks: '2', skill: 3, strength: 4, ap: 0, damage: '1', abilities: ['LANCE'] },
      target: { toughness: 5, save: 4 },
      options: { attackerCharged: true },
      expected: 1 / 3,
    },
    {
      name: 'Lance — KHÔNG charge giữ nguyên wound 5+',
      note: '2 × (4/6) × (2/6 thương, S4 vs T5→5+) × (3/6 save thất bại) × 1 = 2/9',
      weapon: { attacks: '2', skill: 3, strength: 4, ap: 0, damage: '1', abilities: ['LANCE'] },
      target: { toughness: 5, save: 4 },
      options: { attackerCharged: false },
      expected: 2 / 9,
    },
    {
      name: 'Invulnerable save giới hạn AP nặng (AP-4)',
      note: 'save 3−(−4)=7 luôn thất bại, nhưng invuln 4+ → (3/6 save thất bại); 1×(4/6)×(3/6)×(3/6)×1 = 1/6',
      weapon: { attacks: '1', skill: 3, strength: 4, ap: -4, damage: '1' },
      target: { toughness: 4, save: 3, invulnerableSave: 4 },
      expected: 1 / 6,
    },
    {
      name: 'Không invuln — AP-4 khoan thủng hoàn toàn giáp',
      note: 'save 7 luôn thất bại → 1×(4/6 trúng)×(3/6 thương)×1×1 = 1/3',
      weapon: { attacks: '1', skill: 3, strength: 4, ap: -4, damage: '1' },
      target: { toughness: 4, save: 3 },
      expected: 1 / 3,
    },
    {
      name: 'Cover — Sv4+ hưởng lợi (vũ khí AP0)',
      note: 'cover nâng save 4+→3+ (trần 3+); 2×(4/6)×(3/6)×(2/6 save thất bại)×1 = 2/9',
      weapon: { attacks: '2', skill: 3, strength: 4, ap: 0, damage: '1' },
      target: { toughness: 4, save: 4 },
      options: { inCover: true },
      expected: 2 / 9,
    },
    {
      name: 'Không cover — Sv4+ (vũ khí AP0)',
      note: 'save 4+ → 3/6 thất bại; 2×(4/6)×(3/6)×(3/6)×1 = 1/3',
      weapon: { attacks: '2', skill: 3, strength: 4, ap: 0, damage: '1' },
      target: { toughness: 4, save: 4 },
      options: { inCover: false },
      expected: 1 / 3,
    },
    {
      name: 'Sát thương biến thiên D3 — nhân kỳ vọng sát thương ×2',
      note: '2×(4/6)×(3/6)×(3/6)×(D3 trung bình 2) = 2 × 1/6 × 2 = 2/3',
      weapon: { attacks: '2', skill: 3, strength: 4, ap: 0, damage: 'D3' },
      target: { toughness: 4, save: 4 },
      expected: 2 / 3,
    },
    {
      name: '0 đòn tấn công → kỳ vọng bằng 0',
      note: 'attacks = 0 → toàn bộ tích bằng 0',
      weapon: { attacks: '0', skill: 3, strength: 4, ap: 0, damage: '1' },
      target: { toughness: 4, save: 4 },
      expected: 0,
    },
  ];

  it.each(cases)('$name', (c) => {
    const weapon = makeWeapon(c.weapon);
    const target = makeTarget(c.target);
    const result = sim.calculateExpectedDamage(weapon, target, c.options ?? {});
    // Dùng c.note làm thông điệp lỗi để tra công thức khi sai
    expect(result, c.note).toBeCloseTo(c.expected, 10);
  });

  it('Blast đọc số mô hình từ options.targetModelCount khi được cung cấp', () => {
    const weapon = makeWeapon({
      attacks: 'D6',
      skill: 3,
      strength: 4,
      ap: 0,
      damage: '1',
      abilities: ['BLAST'],
    });
    const target = makeTarget({ toughness: 4, save: 4, modelCount: 10 });

    // 10 mô hình: attacks = 3.5 + 2 = 5.5 → 5.5 × (1/6) = 11/12
    expect(sim.calculateExpectedDamage(weapon, target)).toBeCloseTo(11 / 12, 10);
    // Ghi đè 20 mô hình: attacks = 3.5 + 4 = 7.5 → 7.5 × (1/6) = 1.25
    expect(
      sim.calculateExpectedDamage(weapon, target, { targetModelCount: 20 }),
    ).toBeCloseTo(1.25, 10);
  });
});

describe('CombatSimulator.simulate — Monte Carlo', () => {
  it('hội tụ về kỳ vọng lý thuyết với 10.000 lượt (sai số < 10%)', () => {
    const sim = new CombatSimulator(new DiceEngine(mulberry32(12345)));
    const weapon = makeIntercessorWeapon();
    const target = makeTermagantUnit();

    const stats = sim.simulate(weapon, target, { iterations: 10000 });

    expect(stats.iterations).toBe(10000);
    // expectedDamage luôn lấy từ công thức Mathhammer, không từ mô phỏng
    expect(stats.expectedDamage).toBeCloseTo(8 / 9, 10);
    // Trung bình mô phỏng phải tiệm cận kỳ vọng lý thuyết
    expect(stats.relativeError).toBeLessThan(0.1);
    expect(stats.averageDamage).toBeGreaterThan(0);
    expect(stats.averageKills).toBeGreaterThanOrEqual(0);
    expect(stats.averageUnsavedWounds).toBeGreaterThanOrEqual(0);
    // Bất biến: min <= trung bình <= max
    expect(stats.minDamage).toBeLessThanOrEqual(stats.averageDamage);
    expect(stats.averageDamage).toBeLessThanOrEqual(stats.maxDamage);
  });

  it('tất định: cùng seed cho ra cùng kết quả mô phỏng', () => {
    const weapon = makeIntercessorWeapon();
    const a = new CombatSimulator(new DiceEngine(mulberry32(42))).simulate(
      weapon,
      makeTermagantUnit(),
      { iterations: 500 },
    );
    const b = new CombatSimulator(new DiceEngine(mulberry32(42))).simulate(
      weapon,
      makeTermagantUnit(),
      { iterations: 500 },
    );

    expect(a.averageDamage).toBe(b.averageDamage);
    expect(a.averageKills).toBe(b.averageKills);
    expect(a.maxDamage).toBe(b.maxDamage);
    expect(a.minDamage).toBe(b.minDamage);
  });

  it('vũ khí 0 đòn → không sát thương, sai số bằng 0', () => {
    const sim = new CombatSimulator(new DiceEngine(mulberry32(7)));
    const weapon = makeWeapon({ attacks: '0', strength: 4, ap: 0, damage: '1' });
    const target = makeTermagantUnit();

    const stats = sim.simulate(weapon, target, { iterations: 200 });

    expect(stats.expectedDamage).toBe(0);
    expect(stats.averageDamage).toBe(0);
    expect(stats.averageKills).toBe(0);
    expect(stats.minDamage).toBe(0);
    expect(stats.maxDamage).toBe(0);
    expect(stats.relativeError).toBe(0); // tránh chia cho 0 khi kỳ vọng = 0
  });

  it('tái tạo mục tiêu mỗi lượt (không tích lũy sát thương giữa các vòng)', () => {
    const sim = new CombatSimulator(new DiceEngine(mulberry32(999)));
    // Vũ khí rất mạnh để bảo đảm quét sạch mục tiêu trong 1 lượt
    const weapon = makeWeapon({ attacks: '20', skill: 2, strength: 8, ap: -3, damage: '2' });
    const target = makeTermagantUnit(); // 10 mô hình × 1 máu = tối đa 10 sát thương

    const stats = sim.simulate(weapon, target, { iterations: 300 });

    // Nếu mục tiêu bị tái tạo mỗi lượt, tổng sát thương không vượt quá 10 (không tràn máu)
    expect(stats.maxDamage).toBeLessThanOrEqual(10);
    // Và trung bình số mô hình bị hạ không vượt quá 10
    expect(stats.averageKills).toBeLessThanOrEqual(10);
  });

  it('iterations tùy chỉnh được tôn trọng', () => {
    const sim = new CombatSimulator(new DiceEngine(mulberry32(1)));
    const stats = sim.simulate(makeIntercessorWeapon(), makeTermagantUnit(), { iterations: 250 });
    expect(stats.iterations).toBe(250);
  });
});
