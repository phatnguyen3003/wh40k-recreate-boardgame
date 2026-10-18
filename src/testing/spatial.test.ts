import { describe, it, expect } from 'vitest';
import { Measurement, SPATIAL_CONFIG, MeasurableModel, Point2D } from '../spatial/Measurement';
import { Collision2D, COLLISION_CONFIG } from '../spatial/Collision2D';
import { LineOfSight2D, LINE_OF_SIGHT_CONFIG } from '../spatial/LineOfSight2D';
import { CoherencyValidator } from '../spatial/CoherencyValidator';
import {
  SpatialTester,
  buildTestUnit,
  buildTerrain,
  SPATIAL_TESTER_CONFIG,
} from './SpatialTester';

// =========================================================================
// ⚙️ TEST CONFIGURATION & FIXTURES
// =========================================================================
// Quy ước không gian:
//   - 1 inch = 20 pixel (tỉ lệ render sa bàn).
//   - Khoảng cách base-to-base = khoảng cách tâm − (bán kính 2 đế), không âm.
//   - Engagement Range = 1" (đo base-to-base).
//   - Coherency: mỗi mô hình phải có >=1 đồng đội (hoặc >=2 nếu unit >= 7 lính)
//     trong phạm vi <= 2", và cả đơn vị phải liên thông.

/** Mô hình tối giản đặt tại gốc, bán kính 0.5". */
const MODEL_A: MeasurableModel = { position: { x: 0, y: 0 }, baseRadius: 0.5 };

/** Tạo nhanh một mô hình đo đạc. */
function model(x: number, y: number, baseRadius = 0.5): MeasurableModel {
  return { position: { x, y }, baseRadius };
}

/** Ruins hình vuông (4,4)-(8,8): vừa che khuất (obscuring) vừa cho cover. */
const RUINS = buildTerrain('ruins', [
  { x: 4, y: 4 },
  { x: 8, y: 4 },
  { x: 8, y: 8 },
  { x: 4, y: 8 },
]);

/** Bức tường (barricade) ở x=5, từ y=0 đến y=8 — dùng cho test va chạm di chuyển. */
const WALL = buildTerrain(
  'wall',
  [
    { x: 4, y: 0 },
    { x: 5, y: 0 },
    { x: 5, y: 8 },
    { x: 4, y: 8 },
  ],
  {
    type: 'BARRICADE',
    is_obscuring: false,
    provides_cover: true,
    walls: [{ from: { x: 5, y: 0 }, to: { x: 5, y: 8 } }],
  },
);

// =========================================================================
// 📦 MODULE IMPLEMENTATION (TEST SUITES)
// =========================================================================
describe('SPATIAL_CONFIG & các hằng số không gian', () => {
  it('giá trị cấu hình đúng như thiết kế', () => {
    expect(SPATIAL_CONFIG.PIXELS_PER_INCH).toBe(20);
    expect(SPATIAL_CONFIG.ENGAGEMENT_RANGE_INCHES).toBe(1);
    expect(SPATIAL_CONFIG.COHERENCY_MAX_DISTANCE_INCHES).toBe(2);
    expect(SPATIAL_CONFIG.COHERENCY_MIN_NEIGHBORS).toBe(1);
    expect(SPATIAL_CONFIG.COHERENCY_MIN_NEIGHBORS_LARGE).toBe(2);
    expect(SPATIAL_CONFIG.COHERENCY_LARGE_UNIT_THRESHOLD).toBe(7);
  });

  it('epsilon hình học rất nhỏ để tránh sai số dấu phẩy động', () => {
    expect(COLLISION_CONFIG.EPSILON).toBe(1e-9);
    expect(LINE_OF_SIGHT_CONFIG.EPSILON).toBe(1e-9);
    expect(SPATIAL_TESTER_CONFIG.DEFAULT_BASE_SIZE_MM).toBe(25);
  });
});

describe('Measurement — quy đổi inch <-> pixel', () => {
  // [inch, pixel] theo tỉ lệ 1" = 20px
  const conversions: Array<[number, number]> = [
    [0, 0],
    [0.5, 10],
    [1, 20],
    [3.5, 70],
    [10, 200],
    [2.75, 55],
  ];

  it.each(conversions)('inchesToPixels(%f") = %f px', (inches, px) => {
    expect(Measurement.inchesToPixels(inches)).toBeCloseTo(px, 10);
  });

  it.each(conversions)('pixelsToInches(%f px) = %f"', (inches, px) => {
    expect(Measurement.pixelsToInches(px)).toBeCloseTo(inches, 10);
  });

  it('quy đổi vòng tròn: pixelsToInches(inchesToPixels(x)) = x', () => {
    for (const x of [0, 0.25, 1, 6, 12.5]) {
      expect(Measurement.pixelsToInches(Measurement.inchesToPixels(x))).toBeCloseTo(x, 10);
    }
  });
});

describe('Measurement — khoảng cách base-to-base', () => {
  interface DistanceCase {
    name: string;
    a: MeasurableModel;
    b: MeasurableModel;
    expected: number;
  }

  const cases: DistanceCase[] = [
    {
      name: 'tâm cách 5" (bộ ba 3-4-5), bán kính 0.5+0.5 → 4"',
      a: MODEL_A,
      b: model(3, 4, 0.5),
      expected: 4,
    },
    {
      name: 'chồng lấn hoàn toàn → kẹp về 0 (không âm)',
      a: MODEL_A,
      b: model(0, 0, 1.5),
      expected: 0,
    },
    {
      name: 'vừa chạm đế (tâm cách 1" = tổng bán kính) → 0"',
      a: MODEL_A,
      b: model(1, 0, 0.5),
      expected: 0,
    },
    {
      name: 'cách xa: tâm 10", bán kính 1"+2" → 7"',
      a: model(0, 0, 1),
      b: model(10, 0, 2),
      expected: 7,
    },
    {
      name: 'lệch trục: tâm cách đúng 1" theo trục Y → base-to-base 0',
      a: MODEL_A,
      b: model(0, 1, 0.5),
      expected: 0,
    },
  ];

  it.each(cases)('$name', (c) => {
    expect(Measurement.getBaseToBaseDistance(c.a, c.b)).toBeCloseTo(c.expected, 10);
    // Đối xứng: đo từ b sang a phải cho cùng kết quả
    expect(Measurement.getBaseToBaseDistance(c.b, c.a)).toBeCloseTo(c.expected, 10);
  });

  it('getBaseToBasePixels nhân kết quả inch với 20', () => {
    // base-to-base 4" → 80 px
    expect(Measurement.getBaseToBasePixels(MODEL_A, model(3, 4, 0.5))).toBeCloseTo(80, 10);
  });

  it('getCenterDistance đo khoảng cách tâm-tâm', () => {
    expect(Measurement.getCenterDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5, 10);
  });
});

describe('Measurement — Engagement Range (<= 1")', () => {
  // [khoảng cách tâm, kỳ vọng] với 2 mô hình bán kính 0.5 mỗi bên.
  // base-to-base = centerDistance − 1.0; trong engagement khi base-to-base <= 1.
  const cases: Array<[number, boolean]> = [
    [1.0, true],    // chạm đế: base 0
    [1.5, true],    // base 0.5
    [2.0, true],    // base 1.0 (đúng biên)
    [2.001, false], // base 1.001 (vượt biên nhẹ)
    [3.0, false],   // base 2.0
  ];

  it.each(cases)('tâm cách %f" → engagement = %s', (centerDistance, expected) => {
    const other = model(centerDistance, 0, 0.5);
    expect(Measurement.isInEngagementRange(MODEL_A, other)).toBe(expected);
    expect(Measurement.isInEngagementRange(other, MODEL_A)).toBe(expected);
  });
});

describe('Collision2D.checkCircleOverlap — chống đè đế', () => {
  interface OverlapCase {
    name: string;
    newPos: Point2D;
    others: MeasurableModel[];
    expected: boolean;
  }

  const cases: OverlapCase[] = [
    {
      name: 'chồng lấn đế người khác → true',
      newPos: { x: 1, y: 0 },
      others: [model(1.5, 0, 0.5)], // tâm cách 0.5 < 1.0
      expected: true,
    },
    {
      name: 'hai đế vừa chạm nhau → không tính là đè',
      newPos: { x: 1, y: 0 },
      others: [model(2, 0, 0.5)], // tâm cách đúng 1.0
      expected: false,
    },
    {
      name: 'cách xa → false',
      newPos: { x: 0, y: 0 },
      others: [model(5, 5, 0.5)],
      expected: false,
    },
    {
      name: 'danh sách rỗng → không bao giờ đè',
      newPos: { x: 0, y: 0 },
      others: [],
      expected: false,
    },
    {
      name: 'một trong nhiều mô hình bị đè → true',
      newPos: { x: 1, y: 0 },
      others: [model(10, 0, 0.5), model(1.2, 0, 0.5)],
      expected: true,
    },
    {
      name: 'mô hình khác có đế lớn (bán kính 1) → chồng dù ở xa hơn',
      newPos: { x: 2, y: 0 },
      others: [model(3, 0, 1)], // tổng bán kính 0.5+1 = 1.5, tâm cách 1.0 → đè
      expected: true,
    },
  ];

  it.each(cases)('$name', (c) => {
    expect(Collision2D.checkCircleOverlap(MODEL_A, c.newPos, c.others)).toBe(c.expected);
  });
});

describe('Collision2D.checkTerrainCollision — chặn di chuyển xuyên tường', () => {
  interface WallCase {
    name: string;
    start: Point2D;
    end: Point2D;
    radius: number;
    expected: boolean;
  }

  const cases: WallCase[] = [
    {
      name: 'đường đi cắt ngang bức tường x=5 → bị chặn',
      start: { x: 2, y: 4 },
      end: { x: 8, y: 4 },
      radius: 0.5,
      expected: true,
    },
    {
      name: 'đường đi ngắn, không chạm tường → tự do',
      start: { x: 2, y: 4 },
      end: { x: 3, y: 4 },
      radius: 0.5,
      expected: false,
    },
    {
      name: 'di chuyển song song cách tường 3" → tự do',
      start: { x: 2, y: 2 },
      end: { x: 2, y: 6 },
      radius: 0.5,
      expected: false,
    },
    {
      name: 'đế mô hình (bán kính 0.5) kề sát tường (cách 0.4") → bị chặn',
      start: { x: 4.6, y: 4 },
      end: { x: 4.6, y: 8 },
      radius: 0.5,
      expected: true,
    },
    {
      name: 'đế vừa chạm tường (cách đúng 0.5") → không tính là chặn',
      start: { x: 4.5, y: 4 },
      end: { x: 4.5, y: 8 },
      radius: 0.5,
      expected: false,
    },
  ];

  it.each(cases)('$name', (c) => {
    expect(
      Collision2D.checkTerrainCollision(c.start, c.end, c.radius, [WALL]),
    ).toBe(c.expected);
  });

  it('danh sách địa hình rỗng → luôn tự do', () => {
    expect(Collision2D.checkTerrainCollision({ x: 2, y: 4 }, { x: 8, y: 4 }, 0.5, [])).toBe(
      false,
    );
  });
});

describe('LineOfSight2D — tầm nhìn & che khuất (Obscuring Ruins)', () => {
  // Luật: tia nối 2 tâm bị chặn khi cắt ngang footprint Ruins Obscuring,
  // TRỪ KHI ít nhất một mô hình đứng bên trong footprint đó.
  interface LosCase {
    name: string;
    source: MeasurableModel;
    target: MeasurableModel;
    expectLos: boolean; // hasLineOfSight
  }

  const cases: LosCase[] = [
    {
      name: 'tàn tích nằm giữa 2 mô hình → bị che (LOS = false)',
      source: model(0, 6),
      target: model(12, 6),
      expectLos: false,
    },
    {
      name: 'mục tiêu đứng TRONG tàn tích → nhìn thấy (LOS = true)',
      source: model(0, 6),
      target: model(6, 6),
      expectLos: true,
    },
    {
      name: 'xạ thủ đứng TRONG tàn tích → nhìn thấy (LOS = true)',
      source: model(6, 6),
      target: model(12, 6),
      expectLos: true,
    },
    {
      name: 'tàn tích ở xa, tia bắn không cắt ngang → nhìn thấy',
      source: model(0, 0),
      target: model(10, 0),
      expectLos: true,
    },
    {
      name: 'tia bắn men theo mép dưới tàn tích (y=4) → không cắt ngang → nhìn thấy',
      source: model(0, 3),
      target: model(12, 3),
      expectLos: true,
    },
  ];

  it.each(cases)('$name', (c) => {
    const los = LineOfSight2D.hasLineOfSight(c.source, c.target, [RUINS]);
    expect(los).toBe(c.expectLos);
    // hasLineOfSight và checkObscured phải là phủ định của nhau
    expect(LineOfSight2D.checkObscured(c.source, c.target, [RUINS])).toBe(!c.expectLos);
  });

  it('địa hình không che khuất (is_obscuring = false) không chặn tầm nhìn', () => {
    const lowWall = buildTerrain(
      'low_wall',
      [
        { x: 4, y: 4 },
        { x: 8, y: 4 },
        { x: 8, y: 8 },
        { x: 4, y: 8 },
      ],
      { is_obscuring: false },
    );
    expect(LineOfSight2D.hasLineOfSight(model(0, 6), model(12, 6), [lowWall])).toBe(true);
  });

  it('danh sách địa hình rỗng → luôn nhìn thấy', () => {
    expect(LineOfSight2D.hasLineOfSight(model(0, 6), model(12, 6), [])).toBe(true);
  });
});

describe('LineOfSight2D.checkBenefitOfCover — hưởng lợi từ cover', () => {
  interface CoverCase {
    name: string;
    target: MeasurableModel;
    shooter: MeasurableModel;
    expected: boolean;
  }

  const cases: CoverCase[] = [
    {
      name: 'mục tiêu đứng trong footprint địa hình có cover → true',
      target: model(6, 6),
      shooter: model(0, 6),
      expected: true,
    },
    {
      name: 'tia bắn xạ thủ → mục tiêu xuyên qua footprint cover → true',
      target: model(12, 6),
      shooter: model(0, 6),
      expected: true,
    },
    {
      name: 'mục tiêu ngoài, không có địa hình nào cản → false',
      target: model(0, 0),
      shooter: model(10, 0),
      expected: false,
    },
  ];

  it.each(cases)('$name', (c) => {
    expect(LineOfSight2D.checkBenefitOfCover(c.target, c.shooter, [RUINS])).toBe(c.expected);
  });
});

describe('CoherencyValidator — kiểm tra độ gắn kết đội hình', () => {
  interface CoherencyCase {
    name: string;
    note: string;
    positions: Point2D[];
    expectEmpty: boolean;
    contains?: string[];
    absent?: string[];
    minViolations?: number;
  }

  // Đơn vị test tạo qua buildTestUnit('coh', ...) → id mô hình dạng coh_m1, coh_m2...
  const cases: CoherencyCase[] = [
    {
      name: 'đội hình gọn gàng 3 lính sát nhau → không vi phạm',
      note: 'khoảng cách base-to-base ~0.02" <= 2"',
      positions: [
        { x: 10, y: 10 },
        { x: 11, y: 10 },
        { x: 12, y: 10 },
      ],
      expectEmpty: true,
    },
    {
      name: '2 lính sát nhau → không vi phạm',
      note: 'mỗi mô hình có đúng 1 hàng xóm, đủ ngưỡng cho unit nhỏ',
      positions: [
        { x: 10, y: 10 },
        { x: 10.5, y: 10 },
      ],
      expectEmpty: true,
    },
    {
      name: 'mô hình lạc đàn cách xa 10" → đứt gãy đội hình',
      note: 'coh_m3 tách thành phần liên thông riêng',
      positions: [
        { x: 10, y: 10 },
        { x: 11, y: 10 },
        { x: 20, y: 10 },
      ],
      expectEmpty: false,
      contains: ['coh_m3'],
      absent: ['coh_m1', 'coh_m2'],
    },
    {
      name: 'unit 7 lính xếp hàng cách nhau 1.6" → 2 đầu mút vi phạm',
      note: 'unit >= 7 cần >= 2 hàng xóm; m1 và m7 chỉ có 1',
      positions: Array.from({ length: 7 }, (_, i) => ({ x: 10 + i * 1.6, y: 10 })),
      expectEmpty: false,
      contains: ['coh_m1', 'coh_m7'],
      minViolations: 2,
    },
    {
      name: 'chỉ 1 mô hình → luôn hợp lệ',
      note: 'không thể đánh giá coherency với đơn vị đơn lẻ',
      positions: [{ x: 10, y: 10 }],
      expectEmpty: true,
    },
    {
      name: 'đơn vị rỗng (0 mô hình) → hợp lệ',
      note: 'nhánh biên models.length <= 1',
      positions: [],
      expectEmpty: true,
    },
    {
      name: '2 mô hình cách xa 20" → cả hai đều vi phạm',
      note: 'mỗi mô hình tách riêng và đều thiếu hàng xóm',
      positions: [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
      ],
      expectEmpty: false,
      contains: ['coh_m1', 'coh_m2'],
      minViolations: 2,
    },
  ];

  it.each(cases)('$name', (c) => {
    const unit = buildTestUnit('coh', c.positions);
    const violations = CoherencyValidator.validateUnitCoherency(unit);

    if (c.expectEmpty) {
      expect(violations, c.note).toEqual([]);
    } else {
      expect(violations.length, c.note).toBeGreaterThan(0);
    }
    for (const id of c.contains ?? []) {
      expect(violations, c.note).toContain(id);
    }
    for (const id of c.absent ?? []) {
      expect(violations, c.note).not.toContain(id);
    }
    if (c.minViolations !== undefined) {
      expect(violations.length, c.note).toBeGreaterThanOrEqual(c.minViolations);
    }
  });

  it('mô hình bị tiêu diệt không tính vào coherency', () => {
    const unit = buildTestUnit('coh', [
      { x: 10, y: 10 },
      { x: 11, y: 10 },
      { x: 20, y: 10 },
    ]);
    // Giết mô hình lạc đàn → đội hình còn lại liền mạch, không còn vi phạm
    const straggler = unit.findModel('coh_m3');
    straggler?.takeDamage(1);
    expect(CoherencyValidator.validateUnitCoherency(unit)).toEqual([]);
  });
});

describe('SpatialTester — bộ kịch bản tự kiểm tra', () => {
  it('toàn bộ kịch bản tự kiểm tra đều đạt', () => {
    const results = SpatialTester.runAll();
    expect(results).toHaveLength(4);
    for (const result of results) {
      expect(result.passed, `${result.name}: ${result.detail}`).toBe(true);
    }
  });

  it('mỗi kịch bản chạy riêng lẻ đều đạt', () => {
    const individual = [
      SpatialTester.runDistanceCheck(),
      SpatialTester.runObscuredRaycastCheck(),
      SpatialTester.runCoherencyCheck(),
      SpatialTester.runWallCollisionCheck(),
    ];
    for (const result of individual) {
      expect(result.passed, `${result.name}: ${result.detail}`).toBe(true);
      expect(result.name.length).toBeGreaterThan(0);
    }
  });
});
