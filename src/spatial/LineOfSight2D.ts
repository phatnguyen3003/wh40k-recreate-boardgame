import type { TerrainPiece, Vertex2D } from '../entities/TerrainPiece';
import type { Point2D, MeasurableModel } from './Measurement';

// =========================================================================
// ⚙️ MODULE CONFIGURATION & CONSTANTS
// =========================================================================
export const LINE_OF_SIGHT_CONFIG = {
  EPSILON: 1e-9,
} as const;

// =========================================================================
// 📦 GEOMETRY HELPERS (Nội bộ module)
// =========================================================================

/** Xác định hướng của 3 điểm. */
function orientation(a: Point2D, b: Point2D, c: Point2D): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/** Kiểm tra đoạn AB cắt đoạn CD. */
function segmentsIntersect(a: Point2D, b: Point2D, c: Point2D, d: Point2D): boolean {
  const d1 = orientation(c, d, a);
  const d2 = orientation(c, d, b);
  const d3 = orientation(a, b, c);
  const d4 = orientation(a, b, d);
  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  );
}

/** Kiểm tra 1 điểm có nằm trong đa giác (thuật toán Ray Casting). */
function pointInPolygon(p: Point2D, polygon: readonly Vertex2D[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    // Tia nằm ngang từ p: đếm số lần cắt cạnh đa giác
    const intersects = yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

/** Kiểm tra đoạn AB có cắt qua BẤT KỲ cạnh nào của đa giác. */
function segmentIntersectsPolygonEdges(
  a: Point2D,
  b: Point2D,
  polygon: readonly Vertex2D[],
): boolean {
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    if (segmentsIntersect(a, b, polygon[i], polygon[j])) {
      return true;
    }
  }
  return false;
}

// =========================================================================
// 📦 MODULE IMPLEMENTATION
// =========================================================================
export class LineOfSight2D {
  /**
   * Kiểm tra mô hình nguồn có nhìn thấy mô hình mục tiêu hay không.
   * Tầm nhìn bị chặn nếu tia nối 2 tâm cắt ngang footprint của Ruins Obscuring
   * TRONG KHI cả 2 mô hình đều đứng ngoài footprint đó.
   */
  static hasLineOfSight(
    source: MeasurableModel,
    target: MeasurableModel,
    terrainList: readonly TerrainPiece[],
  ): boolean {
    return !LineOfSight2D.checkObscured(source, target, terrainList);
  }

  /**
   * Kiểm tra tia bắn có bị che khuất bởi Ruins (Obscuring) hay không.
   */
  static checkObscured(
    source: MeasurableModel,
    target: MeasurableModel,
    terrainList: readonly TerrainPiece[],
  ): boolean {
    const sourcePos = source.position;
    const targetPos = target.position;

    for (const terrain of terrainList) {
      if (!terrain.isObscuring) continue;

      // Nếu mô hình đứng bên trong tàn tích → nhìn thấy (không bị che)
      const sourceInside = pointInPolygon(sourcePos, terrain.bounds);
      const targetInside = pointInPolygon(targetPos, terrain.bounds);
      if (sourceInside || targetInside) continue;

      // Tia nối 2 tâm cắt qua ranh giới tàn tích → tầm nhìn bị chặn
      if (segmentIntersectsPolygonEdges(sourcePos, targetPos, terrain.bounds)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Kiểm tra mô hình mục tiêu có được hưởng Benefit of Cover hay không:
   * mục tiêu đứng TRONG vùng địa hình có providesCover,
   * hoặc tia bắn từ xạ thủ đi qua vùng địa hình đó.
   */
  static checkBenefitOfCover(
    target: MeasurableModel,
    shooter: MeasurableModel,
    terrainList: readonly TerrainPiece[],
  ): boolean {
    for (const terrain of terrainList) {
      if (!terrain.providesCover) continue;

      // Mục tiêu đứng trong footprint địa hình
      if (pointInPolygon(target.position, terrain.bounds)) {
        return true;
      }
      // Tia bắn đi xuyên qua footprint địa hình (địa hình nằm giữa 2 bên)
      if (
        segmentIntersectsPolygonEdges(shooter.position, target.position, terrain.bounds)
      ) {
        return true;
      }
    }
    return false;
  }
}
