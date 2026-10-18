import { describe, it, expect } from 'vitest';
import { DiceEngine } from '../core/DiceEngine';
import { EventBus } from '../core/EventBus';
import {
  CombatPipeline,
  CombatOptions,
  CombatResult,
  COMBAT_PIPELINE_CONFIG,
} from '../rules/CombatPipeline';
import { Weapon, WeaponData } from '../entities/Weapon';
import { Unit, UnitData } from '../entities/Unit';
import { createDeterministicRng } from './CombatSimulator';

// =========================================================================
// 🧱 FIXTURE BUILDERS
// =========================================================================

/** Tùy chọn cấu hình cho đơn vị mục tiêu giả lập. */
interface TargetOptions {
  modelCount?: number;      // Số mô hình
  toughness?: number;       // T (mặc định 3)
  save?: number;            // Sv (mặc định 6+)
  invuln?: number | null;   // Invuln Save (mặc định null)
  woundsPerModel?: number;  // Wounds/mô hình (mặc định 1)
}

/**
 * Tạo đơn vị mục tiêu giả lập. Mặc định: T3, Sv6+, 3 mô hình 1 máu — dễ chết
 * để quan sát rõ chuỗi sát thương.
 */
function makeTarget(opts: TargetOptions = {}): Unit {
  const {
    modelCount = 3,
    toughness = 3,
    save = 6,
    invuln = null,
    woundsPerModel = 1,
  } = opts;

  const models = Array.from({ length: modelCount }, (_, i) => ({
    id: `t${i + 1}`,
    is_leader: false,
  }));

  const data: UnitData = {
    unit_id: 'test_target',
    name: 'Test Target',
    keywords: ['INFANTRY'],
    stats: {
      movement: 6,
      toughness,
      save,
      invulnerable_save: invuln,
      wounds_per_model: woundsPerModel,
      leadership: 6,
      objective_control: 1,
    },
    base_size_mm: 25,
    models,
    weapons: [],
  };
  return new Unit(data);
}

/** Tạo vũ khí test. Mặc định: 2 đòn, BS3, S4, AP0, D1, không keyword. */
function makeWeapon(overrides: Partial<WeaponData> = {}): Weapon {
  const data: WeaponData = {
    weapon_id: 'test_weapon',
    name: 'Test Weapon',
    type: 'RANGED',
    range: 24,
    attacks: '2',
    skill: 3,
    strength: 4,
    ap: 0,
    damage: '1',
    abilities: [],
    ...overrides,
  };
  return new Weapon(data);
}

// =========================================================================
// 🧪 BẢNG KỊCH BẢN PIPELINE (DATA-DRIVEN)
// =========================================================================
// Mỗi ca test chỉ định: chuỗi RNG tất định, vũ khí, mục tiêu, options và các
// trường kỳ vọng. Cách này giúp mọi kịch bản giao tranh nằm chung 1 bảng dễ
// đối chiếu, đồng thời tài liệu hóa rõ thứ tự tiêu tốn xúc xắc của pipeline:
//   Hit Roll → Wound Roll → Save Roll → Damage Roll
interface PipelineCase {
  name: string;
  note: string;
  rng: number[];
  weapon?: Partial<WeaponData>;
  target?: TargetOptions;
  options?: CombatOptions;
  expect: Partial<CombatResult>;
  expectHitRolls?: number;     // Độ dài mảng hitRolls
  expectWoundRolls?: number;   // Độ dài mảng woundRolls
  expectSaveRolls?: number;    // Độ dài mảng saveRolls
  expectDamageRolls?: number;  // Độ dài mảng damageRolls (số đòn lọt giáp)
  expectModelsSlain?: string[];
}

const pipelineCases: PipelineCase[] = [
  // ---------------------------------------------------------------------
  // 1) Chuỗi 4 bước cơ bản — 2 đòn, 1 trúng thường, 1 crit; 1 wound; bị save
  // ---------------------------------------------------------------------
  {
    name: 'chuỗi 4 bước cơ bản: Hit → Wound → Save → Damage',
    note: 'rng hit [3,6] → 2 trúng (1 crit); wound [3,1] → 1 wound; save [6] → chặn',
    rng: [3, 6, 3, 1, 6],
    expect: {
      attacks: 2,
      hits: 2,
      criticalHits: 1,
      woundTarget: 3, // S4 vs T3 → 3+
      wounds: 1,
      criticalWounds: 0,
      saveTarget: 6, // Sv6 - AP0
      unsavedWounds: 0,
      totalDamage: 0,
      slainCount: 0,
    },
    expectHitRolls: 2,
    expectWoundRolls: 2,
    expectSaveRolls: 1,
  },

  // ---------------------------------------------------------------------
  // 2) Torrent — tự động trúng toàn bộ, KHÔNG gieo Hit Roll → không crit
  // ---------------------------------------------------------------------
  {
    name: 'Torrent: tự động trúng, không gieo Hit Roll',
    note: 'rng [2,3,1,2]: 3 đòn auto-hit; wound [2,3,1] → 1 wound; save [2] → fail',
    rng: [2, 3, 1, 2],
    weapon: { attacks: '3', abilities: ['TORRENT'] },
    expect: { attacks: 3, hits: 3, criticalHits: 0, wounds: 1, unsavedWounds: 1, totalDamage: 1 },
    expectHitRolls: 0,
    expectSaveRolls: 1,
  },

  // ---------------------------------------------------------------------
  // 3) Devastating Wounds — Critical Wound bỏ qua Save & Invuln
  // ---------------------------------------------------------------------
  {
    name: 'Devastating Wounds: Critical Wound bỏ qua Save',
    note: 'rng [6,6]: hit crit, wound crit → không gieo save, sát thương đi thẳng',
    rng: [6, 6],
    weapon: { attacks: '1', abilities: ['DEVASTATING_WOUNDS'] },
    expect: {
      criticalHits: 1,
      criticalWounds: 1,
      devastatingWounds: 1,
      unsavedWounds: 1,
      totalDamage: 1,
      slainCount: 1,
    },
    expectSaveRolls: 0,
  },

  // ---------------------------------------------------------------------
  // 4) Lethal Hits — Critical Hit tự động gây vết thương (bỏ Wound Roll)
  // ---------------------------------------------------------------------
  {
    name: 'Lethal Hits: Critical Hit → auto-wound',
    note: 'rng hit [6,6] → 2 crit auto-wound; không gieo wound; save [1,1] → fail hết',
    rng: [6, 6, 1, 1],
    weapon: { abilities: ['LETHAL_HITS'] },
    expect: {
      hits: 2,
      criticalHits: 2,
      wounds: 2,
      unsavedWounds: 2,
      totalDamage: 2,
      slainCount: 2,
    },
    expectWoundRolls: 0,
  },

  // ---------------------------------------------------------------------
  // 5) Blast — cộng thêm đòn bắn theo số mô hình mục tiêu (10 → +2)
  // ---------------------------------------------------------------------
  {
    name: 'Blast: +1 đòn bắn mỗi 5 mô hình mục tiêu',
    note: 'rng [1]: attacks 1 + floor(10/5) = 3; cả 3 hit roll đều là 1 (auto-fail)',
    rng: [1],
    weapon: { attacks: '1', abilities: ['BLAST'] },
    target: { modelCount: 10 },
    expect: { attacks: 3, hits: 0, criticalHits: 0, wounds: 0, unsavedWounds: 0, totalDamage: 0 },
  },

  // ---------------------------------------------------------------------
  // 6) Feel No Pain — triệt tiêu sát thương theo từng điểm
  // ---------------------------------------------------------------------
  {
    name: 'Feel No Pain 5+: triệt tiêu điểm sát thương',
    note: 'rng [6,6,1,6]: hit crit, wound crit → 1 đòn lọt; fnp roll 6 → triệt tiêu',
    rng: [6, 6, 1, 6],
    weapon: { attacks: '1' },
    options: { feelNoPain: 5 },
    expect: { unsavedWounds: 1, ignoredByFNP: 1, totalDamage: 0, slainCount: 0 },
  },

  // ---------------------------------------------------------------------
  // 7) Sustained Hits 1 — Critical Hit sinh thêm 1 đòn trúng
  // ---------------------------------------------------------------------
  {
    name: 'Sustained Hits 1: Critical Hit sinh thêm 1 đòn trúng',
    note: 'rng [6,1,1]: 1 crit → +1 sustained → cần 2 wound roll, cả 2 đều trượt',
    rng: [6, 1, 1],
    weapon: { attacks: '1', abilities: ['SUSTAINED_HITS_1'] },
    expect: { hits: 1, criticalHits: 1, wounds: 0 },
    expectWoundRolls: 2,
  },

  // ---------------------------------------------------------------------
  // 8) Heavy — +1 to Hit nếu đơn vị đứng yên
  // ---------------------------------------------------------------------
  {
    name: 'Heavy + đứng yên: skill 4 được cải thiện thành 3+',
    note: 'rng [3,3,1,1]: skill hiệu dụng 3 → 2 hit; cả 2 wound roll đều trượt',
    rng: [3, 3, 1, 1],
    weapon: { skill: 4, abilities: ['HEAVY'] },
    options: { attackerRemainedStationary: true },
    expect: { hits: 2, wounds: 0 },
    expectHitRolls: 2,
  },
  {
    name: 'Heavy nhưng đã di chuyển: giữ skill 4 → 3 trượt',
    note: 'rng [3,3]: không được +1 to Hit nên 2 mặt 3 đều trượt',
    rng: [3, 3],
    weapon: { skill: 4, abilities: ['HEAVY'] },
    options: { attackerRemainedStationary: false },
    expect: { hits: 0, wounds: 0 },
    expectHitRolls: 2,
  },

  // ---------------------------------------------------------------------
  // 9) Lance — +1 to Wound nếu đơn vị vừa Charge
  // ---------------------------------------------------------------------
  {
    name: 'Lance + Charge: ngưỡng Wound giảm 1 bậc',
    note: 'S3 vs T4: bình thường 5+ (rng [4]) trượt; có Lance → 4+ → trúng',
    rng: [4, 4, 2],
    weapon: { attacks: '1', strength: 3, abilities: ['LANCE'] },
    target: { toughness: 4 },
    options: { attackerCharged: true },
    expect: { hits: 1, woundTarget: 4, wounds: 1, unsavedWounds: 1, totalDamage: 1 },
  },
  {
    name: 'Lance không Charge: giữ ngưỡng Wound gốc',
    note: 'S3 vs T4 → 5+; rng [4] trượt → 0 wound',
    rng: [4, 4],
    weapon: { attacks: '1', strength: 3, abilities: ['LANCE'] },
    target: { toughness: 4 },
    options: { attackerCharged: false },
    expect: { hits: 1, woundTarget: 5, wounds: 0 },
  },

  // ---------------------------------------------------------------------
  // 10) Invulnerable Save — dùng giá trị tốt hơn giữa Sv-AP và Invuln
  // ---------------------------------------------------------------------
  {
    name: 'Invuln Save: ngưỡng save = min(Sv - AP, Invuln)',
    note: 'Sv5+ & Invuln4+ với AP0 → saveTarget = min(5,4) = 4; rng [2] fail',
    rng: [4, 4, 2],
    weapon: { attacks: '1' },
    target: { save: 5, invuln: 4 },
    expect: { saveTarget: 4, unsavedWounds: 1, totalDamage: 1 },
  },

  // ---------------------------------------------------------------------
  // 11) Benefit of Cover (AP0) — +1 Save nhưng không tốt hơn 3+
  // ---------------------------------------------------------------------
  {
    name: 'Cover AP0: Sv6 → 5+ (giới hạn trần 3+)',
    note: 'rng save [5] → 5 >= 5 → save thành công',
    rng: [4, 4, 5],
    weapon: { attacks: '1', ap: 0 },
    target: { save: 6 },
    options: { inCover: true },
    expect: { saveTarget: 5, unsavedWounds: 0, totalDamage: 0 },
  },
  {
    name: 'Cover AP-1: Sv4 → 3, saveTarget = 3 - (-1) = 4+',
    note: 'rng save [4] → 4 >= 4 → save thành công',
    rng: [4, 4, 4],
    weapon: { attacks: '1', ap: -1 },
    target: { save: 4 },
    options: { inCover: true },
    expect: { saveTarget: 4, unsavedWounds: 0, totalDamage: 0 },
  },

  // ---------------------------------------------------------------------
  // 12) Twin-linked — gieo lại toàn bộ Wound Roll thất bại
  // ---------------------------------------------------------------------
  {
    name: 'Twin-linked: gieo lại Wound Roll thất bại',
    note: 'wound [1,2] trượt hết → reroll thành [4,5]; save [1,1] fail → 2 sát thương',
    rng: [4, 4, 1, 2, 4, 5, 1, 1],
    weapon: { abilities: ['TWIN_LINKED'] },
    expect: { hits: 2, wounds: 2, unsavedWounds: 2, totalDamage: 2 },
    expectWoundRolls: 2,
  },

  // ---------------------------------------------------------------------
  // 13) Precision — dồn sát thương vào mô hình chỉ định trước
  // ---------------------------------------------------------------------
  {
    name: 'Precision: dồn đòn vào mô hình chỉ định (targetModelId)',
    note: 'rng hit [4,4], wound [4,4], save [2,2] → 2 đòn lọt; dồn vào t2 rồi t1',
    rng: [4, 4, 4, 4, 2, 2],
    weapon: { attacks: '2' },
    target: { modelCount: 3 },
    options: { targetModelId: 't2' },
    expect: { unsavedWounds: 2, totalDamage: 2, slainCount: 2 },
    expectModelsSlain: ['t2', 't1'],
  },

  // ---------------------------------------------------------------------
  // 14) Sát thương dư thừa KHÔNG lan sang mô hình kế tiếp (no spillover)
  // ---------------------------------------------------------------------
  {
    name: 'Overkill: sát thương dư không lan sang mô hình khác',
    note: '2 mô hình 2 máu; mỗi đòn D3 gieo ra 3 → mỗi mô hình chỉ nhận 2, dư 1 bị bỏ',
    rng: [4, 4, 4, 4, 1, 1, 6, 6],
    weapon: { attacks: '2', damage: 'D3' },
    target: { modelCount: 2, woundsPerModel: 2 },
    expect: { unsavedWounds: 2, rawDamage: 6, totalDamage: 4, slainCount: 2 },
  },

  // ---------------------------------------------------------------------
  // 15) Đơn vị bị xóa sổ → dừng phân bổ sát thương
  // ---------------------------------------------------------------------
  {
    name: 'Xóa sổ mục tiêu: dừng vòng lặp phân bổ sát thương',
    note: 'mục tiêu chỉ 1 mô hình; 3 đòn lọt nhưng mô hình chết ngay đòn đầu',
    rng: [4, 4, 4, 4, 4, 4, 1, 1, 1],
    weapon: { attacks: '3', damage: '2' },
    target: { modelCount: 1, woundsPerModel: 1 },
    expect: { unsavedWounds: 3, rawDamage: 2, totalDamage: 1, slainCount: 1 },
    expectDamageRolls: 1,
  },

  // ---------------------------------------------------------------------
  // 16) Biên: số đòn tấn công = 0
  // ---------------------------------------------------------------------
  {
    name: 'Biên: Attacks = 0 → không gieo xúc xắc nào',
    note: 'attacks = 0 → bỏ qua toàn bộ chuỗi Hit/Wound/Save/Damage',
    rng: [1],
    weapon: { attacks: '0' },
    expect: { attacks: 0, hits: 0, wounds: 0, unsavedWounds: 0, totalDamage: 0 },
    expectHitRolls: 0,
  },

  // ---------------------------------------------------------------------
  // 17) Mặt 6 tự nhiên luôn trúng (kể cả skill 6+), mặt 1 luôn trượt
  // ---------------------------------------------------------------------
  {
    name: 'Mặt 6 tự nhiên luôn trúng dù skill 6+',
    note: 'rng [6,1]: hit 6 → crit tự trúng; wound roll 1 → auto-fail',
    rng: [6, 1],
    weapon: { attacks: '1', skill: 6 },
    expect: { hits: 1, criticalHits: 1, wounds: 0 },
  },
  {
    name: 'Mặt 1 tự nhiên luôn trượt dù skill 2+',
    note: 'rng [1]: hit 1 → auto-fail dù skill hiệu dụng là 2+',
    rng: [1],
    weapon: { attacks: '1', skill: 2 },
    expect: { hits: 0, wounds: 0 },
    expectHitRolls: 1,
  },
];

describe('CombatPipeline.resolve', () => {
  // -----------------------------------------------------------------------
  // Bảng kịch bản chính
  // -----------------------------------------------------------------------
  it.each(pipelineCases)('$name', (c) => {
    const engine = new DiceEngine(createDeterministicRng(c.rng));
    const pipeline = new CombatPipeline(engine);
    const result = pipeline.resolve(makeWeapon(c.weapon), makeTarget(c.target), c.options);

    // Đối chiếu các trường vô hướng được khai báo
    for (const key of Object.keys(c.expect) as Array<keyof CombatResult>) {
      expect(result[key], `trường "${String(key)}" (${c.note})`).toBe(c.expect[key]);
    }
    // Đối chiếu độ dài các mảng (thứ tự tiêu tốn xúc xắc)
    if (c.expectHitRolls !== undefined) expect(result.hitRolls).toHaveLength(c.expectHitRolls);
    if (c.expectWoundRolls !== undefined) expect(result.woundRolls).toHaveLength(c.expectWoundRolls);
    if (c.expectSaveRolls !== undefined) expect(result.saveRolls).toHaveLength(c.expectSaveRolls);
    if (c.expectDamageRolls !== undefined) expect(result.damageRolls).toHaveLength(c.expectDamageRolls);
    if (c.expectModelsSlain !== undefined) expect(result.modelsSlain).toEqual(c.expectModelsSlain);
  });

  // -----------------------------------------------------------------------
  // Kiểm chứng tính tất định: cùng RNG → cùng kết quả
  // -----------------------------------------------------------------------
  it('tất định: cùng chuỗi RNG cho ra cùng kết quả', () => {
    const rng = [3, 6, 3, 1, 6];
    const first = new CombatPipeline(new DiceEngine(createDeterministicRng(rng))).resolve(
      makeWeapon(),
      makeTarget(),
    );
    const second = new CombatPipeline(new DiceEngine(createDeterministicRng(rng))).resolve(
      makeWeapon(),
      makeTarget(),
    );
    expect(second).toEqual(first);
  });

  // -----------------------------------------------------------------------
  // Trường weaponId phải được sao chép đúng từ vũ khí
  // -----------------------------------------------------------------------
  it('gán đúng weaponId vào kết quả', () => {
    const pipeline = new CombatPipeline(new DiceEngine(createDeterministicRng([1])));
    const result = pipeline.resolve(makeWeapon({ weapon_id: 'gatling' }), makeTarget());
    expect(result.weaponId).toBe('gatling');
  });

  // -----------------------------------------------------------------------
  // Phát sự kiện COMBAT:ATTACK_RESOLVED qua EventBus
  // -----------------------------------------------------------------------
  it('phát sự kiện COMBAT:ATTACK_RESOLVED kèm đúng payload', () => {
    const bus = new EventBus();
    let received: CombatResult | null = null;
    bus.on<CombatResult>(COMBAT_PIPELINE_CONFIG.EVENT_ATTACK_RESOLVED, (payload) => {
      received = payload;
    });

    const engine = new DiceEngine(createDeterministicRng([3, 6, 3, 1, 6]));
    const pipeline = new CombatPipeline(engine, bus);
    const result = pipeline.resolve(makeWeapon(), makeTarget());

    expect(received).toBe(result);
  });

  // -----------------------------------------------------------------------
  // Không truyền EventBus → resolve vẫn hoạt động bình thường (không ném lỗi)
  // -----------------------------------------------------------------------
  it('không có EventBus vẫn resolve bình thường', () => {
    const pipeline = new CombatPipeline(new DiceEngine(createDeterministicRng([1, 1])));
    expect(() => pipeline.resolve(makeWeapon({ attacks: '1' }), makeTarget())).not.toThrow();
  });

  // -----------------------------------------------------------------------
  // Mục tiêu bị thương tích lũy: đòn sau ưu tiên mô hình đã mất máu
  // -----------------------------------------------------------------------
  it('ưu tiên dồn sát thương vào mô hình đã bị thương trước đó', () => {
    const target = makeTarget({ modelCount: 2, woundsPerModel: 3 });
    // Gây sẵn 1 vết thương lên mô hình đầu để kiểm chứng cơ chế "focus fire"
    target.models[0].takeDamage(1);

    const engine = new DiceEngine(createDeterministicRng([4, 4, 4, 4, 2, 2]));
    const pipeline = new CombatPipeline(engine);
    const result = pipeline.resolve(makeWeapon({ attacks: '2' }), target);

    // 2 đòn lọt (mỗi đòn 1 damage) đều dồn vào t1 (đang 2 máu) → t1 còn 0... chưa chết
    expect(result.unsavedWounds).toBe(2);
    expect(result.totalDamage).toBe(2);
    expect(target.models[0].currentWounds).toBe(0); // 3 - 1 - 2
  });
});
