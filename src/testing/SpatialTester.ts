import { Unit, UnitData } from '../entities/Unit';
import { TerrainPiece, TerrainPieceData } from '../entities/TerrainPiece';
import { Point2D } from '../spatial/Measurement';
import { Measurement } from '../spatial/Measurement';
import { Collision2D } from '../spatial/Collision2D';
import { LineOfSight2D } from '../spatial/LineOfSight2D';
import { CoherencyValidator } from '../spatial/CoherencyValidator';

// =========================================================================
// ⚙️ MODULE CONFIGURATION & CONSTANTS
// =========================================================================
export const SPATIAL_TESTER_CONFIG = {
  DEFAULT_BASE_SIZE_MM: 25,
  DISTANCE_TOLERANCE: 1e-9,
} as const;

export interface SpatialCheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

// =========================================================================
// 📦 FIXTURE BUILDERS
// =========================================================================

/** Tạo nhanh một Unit với danh sách vị trí mô hình cho trước (đơn vị: inch). */
export function buildTestUnit(unitId: string, positions: Point2D[]): Unit {
  const data: UnitData = {
    unit_id: unitId,
    name: unitId,
    keywords: ['INFANTRY'],
    stats: {
      movement: 6,
      toughness: 4,
      save: 3,
      invulnerable_save: null,
      wounds_per_model: 1,
      leadership: 6,
      objective_control: 1,
    },
    base_size_mm: SPATIAL_TESTER_CONFIG.DEFAULT_BASE_SIZE_MM,
    models: positions.map((_, i) => ({ id: `${unitId}_m${i + 1}`, is_leader: false })),
    weapons: [],
  };
  const unit = new Unit(data);
  unit.getAliveModels().forEach((model, i) => {
    model.setPosition(positions[i].x, positions[i].y);
  });
  return unit;
}

/** Tạo nhanh một khối địa hình (mặc định Ruins che khuất). */
export function buildTerrain(
  id: string,
  vertices: Point2D[],
  options: Partial<TerrainPieceData> = {},
): TerrainPiece {
  const data: TerrainPieceData = {
    id,
    type: 'RUINS',
    vertices,
    walls: [],
    is_obscuring: true,
    provides_cover: true,
    ...options,
  };
  return new TerrainPiece(data);
}

// =========================================================================
// 📦 RUNNABLE SCENARIO CHECKS
// =========================================================================
export class SpatialTester {
  /** Kịch bản 1: đo khoảng cách base-to-base chính xác. */
  static runDistanceCheck(): SpatialCheckResult {
    const a = { position: { x: 0, y: 0 }, baseRadius: 0.5 };
    const b = { position: { x: 3, y: 4 }, baseRadius: 0.75 };
    // Tâm cách nhau 5" → base-to-base = 5 - (0.5 + 0.75) = 3.75"
    const distance = Measurement.getBaseToBaseDistance(a, b);
    const expected = 5 - 1.25;
    const passed = Math.abs(distance - expected) < SPATIAL_TESTER_CONFIG.DISTANCE_TOLERANCE;
    return {
      name: 'Đo khoảng cách base-to-base',
      passed,
      detail: `nhận ${distance}" (kỳ vọng ${expected}")`,
    };
  }

  /** Kịch bản 2: tia bắn bị nhà (Ruins obscuring) che khuất. */
  static runObscuredRaycastCheck(): SpatialCheckResult {
    // Ruins hình vuông từ (4,4) đến (8,8) nằm giữa 2 mô hình
    const ruins = buildTerrain('ruin_1', [
      { x: 4, y: 4 },
      { x: 8, y: 4 },
      { x: 8, y: 8 },
      { x: 4, y: 8 },
    ]);
    const shooter = { position: { x: 0, y: 6 }, baseRadius: 0.5 };
    const targetOutside = { position: { x: 12, y: 6 }, baseRadius: 0.5 };
    const targetInside = { position: { x: 6, y: 6 }, baseRadius: 0.5 };

    const blocked = !LineOfSight2D.hasLineOfSight(shooter, targetOutside, [ruins]);
    const visibleWhenInside = LineOfSight2D.hasLineOfSight(shooter, targetInside, [ruins]);

    const passed = blocked && visibleWhenInside;
    return {
      name: 'Raycast bị tàn tích che khuất',
      passed,
      detail: `che_khuất=${blocked}, thấy_khi_đứng_trong=${visibleWhenInside}`,
    };
  }

  /** Kịch bản 3: cảnh báo đứt gãy đội hình (coherency). */
  static runCoherencyCheck(): SpatialCheckResult {
    // 3 lính: 2 lính đứng sát nhau, 1 lính "lạc đàn" cách xa 6"
    const unit = buildTestUnit('coherency_unit', [
      { x: 10, y: 10 },
      { x: 11, y: 10 },
      { x: 20, y: 10 },
    ]);
    const violations = CoherencyValidator.validateUnitCoherency(unit);
    const stragglerFlagged = violations.includes('coherency_unit_m3');
    const frontPairClean = !violations.includes('coherency_unit_m1') && !violations.includes('coherency_unit_m2');
    const passed = stragglerFlagged && frontPairClean;
    return {
      name: 'Cảnh báo đứt gãy đội hình',
      passed,
      detail: `vi_phạm=[${violations.join(', ')}]`,
    };
  }

  /** Kịch bản 4: chặn di chuyển xuyên tường. */
  static runWallCollisionCheck(): SpatialCheckResult {
    const wallTerrain = buildTerrain(
      'wall_1',
      [
        { x: 4, y: 0 },
        { x: 8, y: 0 },
        { x: 8, y: 8 },
        { x: 4, y: 8 },
      ],
      {
        type: 'BARRICADE',
        is_obscuring: false,
        provides_cover: true,
        walls: [{ from: { x: 8, y: 0 }, to: { x: 8, y: 8 } }],
      },
    );
    // Đường đi từ trái (x=2) sang phải (x=10), cắt ngang bức tường x=8
    const blocked = Collision2D.checkTerrainCollision({ x: 2, y: 4 }, { x: 10, y: 4 }, 0.5, [
      wallTerrain,
    ]);
    // Đường đi không chạm tường
    const free = Collision2D.checkTerrainCollision({ x: 2, y: 4 }, { x: 3, y: 4 }, 0.5, [wallTerrain]);

    const passed = blocked && !free;
    return {
      name: 'Chặn di chuyển xuyên tường',
      passed,
      detail: `bị_chặn=${blocked}, tự_do=${free}`,
    };
  }

  /** Chạy toàn bộ kịch bản tự kiểm tra. */
  static runAll(): SpatialCheckResult[] {
    return [
      SpatialTester.runDistanceCheck(),
      SpatialTester.runObscuredRaycastCheck(),
      SpatialTester.runCoherencyCheck(),
      SpatialTester.runWallCollisionCheck(),
    ];
  }
}
