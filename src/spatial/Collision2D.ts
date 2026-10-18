import type { TerrainPiece } from '../entities/TerrainPiece';
import { Measurement, Point2D, MeasurableModel } from './Measurement';

// =========================================================================
// ⚙️ MODULE CONFIGURATION & CONSTANTS
// =========================================================================
export const COLLISION_CONFIG = {
  EPSILON: 1e-9,
} as const;

// =========================================================================
// 📦 GEOMETRY HELPERS (Nội bộ module)
// =========================================================================

/** Khoảng cách từ điểm P đến đoạn thẳng AB. */
function pointToSegmentDistance(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;

  // Đoạn suy biến thành điểm
  if (lengthSquared < COLLISION_CONFIG.EPSILON) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }

  // Chiếu P lên đường thẳng AB, kẹp tham số t trong [0,1]
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

/** Xác định hướng của 3 điểm (cross product). */
function cross(o: Point2D, a: Point2D, b: Point2D): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/** Kiểm tra 2 đoạn thẳng AB và CD có cắt nhau không. */
function segmentsIntersect(a: Point2D, b: Point2D, c: Point2D, d: Point2D): boolean {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);

  // Trường hợp cắt thực sự (2 đầu đoạn này nằm khác phía đường thẳng kia)
  if (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  ) {
    return true;
  }
  return false;
}

/** Khoảng cách ngắn nhất giữa 2 đoạn thẳng. */
function segmentToSegmentDistance(a1: Point2D, a2: Point2D, b1: Point2D, b2: Point2D): number {
  // Nếu 2 đoạn cắt nhau → khoảng cách = 0
  if (segmentsIntersect(a1, a2, b1, b2)) {
    return 0;
  }
  // Ngược lại: lấy min khoảng cách từ 4 đầu mút tới đoạn đối diện
  return Math.min(
    pointToSegmentDistance(a1, b1, b2),
    pointToSegmentDistance(a2, b1, b2),
    pointToSegmentDistance(b1, a1, a2),
    pointToSegmentDistance(b2, a1, a2),
  );
}

// =========================================================================
// 📦 MODULE IMPLEMENTATION
// =========================================================================
export class Collision2D {
  /**
   * Kiểm tra vị trí mới của mô hình có bị chồng lấn đế với bất kỳ mô hình nào khác.
   * Hai đế mô hình coi là chồng lấn khi khoảng cách tâm < tổng 2 bán kính.
   * `others` phải là danh sách các mô hình KHÁC (loại trừ chính nó).
   */
  static checkCircleOverlap(
    model: MeasurableModel,
    newPos: Point2D,
    others: readonly MeasurableModel[],
  ): boolean {
    for (const other of others) {
      const distance = Measurement.getCenterDistance(newPos, other.position);
      const minDistance = model.baseRadius + other.baseRadius;
      // Trừ epsilon để cho phép 2 đế chạm nhau (touching) mà không tính là đè
      if (distance < minDistance - COLLISION_CONFIG.EPSILON) {
        return true;
      }
    }
    return false;
  }

  /**
   * Kiểm tra đường di chuyển từ startPos → endPos (bán kính mô hình) có bị chặn
   * bởi tường của các khối địa hình không thể xuyên qua hay không.
   */
  static checkTerrainCollision(
    startPos: Point2D,
    endPos: Point2D,
    modelRadius: number,
    terrainList: readonly TerrainPiece[],
  ): boolean {
    for (const terrain of terrainList) {
      for (const wall of terrain.walls) {
        // Khoảng cách từ đoạn di chuyển tới đoạn tường < bán kính đế → bị chặn
        const distance = segmentToSegmentDistance(startPos, endPos, wall.from, wall.to);
        if (distance < modelRadius) {
          return true;
        }
      }
    }
    return false;
  }
}
