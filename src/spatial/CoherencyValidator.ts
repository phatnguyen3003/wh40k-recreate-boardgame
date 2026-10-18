import type { Unit } from '../entities/Unit';
import { Measurement, SPATIAL_CONFIG } from './Measurement';

// =========================================================================
// 📦 MODULE IMPLEMENTATION
// =========================================================================
export class CoherencyValidator {
  /**
   * Kiểm tra độ gắn kết (coherency) của một Unit.
   *
   * Quy tắc:
   *  - Mỗi mô hình phải đứng cách ít nhất 1 đồng đội trong phạm vi <= 2"
   *    (hoặc 2 đồng đội nếu unit có >= 7 lính).
   *  - Toàn bộ các mô hình phải tạo thành 1 đồ thị liên thông (không đứt gãy).
   *
   * Trả về danh sách ID các mô hình vi phạm (để vẽ viền đỏ cảnh báo).
   */
  static validateUnitCoherency(unit: Unit): string[] {
    const models = unit.getAliveModels();

    // Unit chỉ còn 0 hoặc 1 mô hình → luôn hợp lệ
    if (models.length <= 1) {
      return [];
    }

    const maxDistance = SPATIAL_CONFIG.COHERENCY_MAX_DISTANCE_INCHES;
    const requiredNeighbors =
      unit.modelCount >= SPATIAL_CONFIG.COHERENCY_LARGE_UNIT_THRESHOLD
        ? SPATIAL_CONFIG.COHERENCY_MIN_NEIGHBORS_LARGE
        : SPATIAL_CONFIG.COHERENCY_MIN_NEIGHBORS;

    const count = models.length;

    // BƯỚC 1: Xây dựng danh sách kề (adjacency list) dựa trên khoảng cách base-to-base <= 2"
    const adjacency: number[][] = Array.from({ length: count }, () => []);
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const distance = Measurement.getBaseToBaseDistance(models[i], models[j]);
        if (distance <= maxDistance) {
          adjacency[i].push(j);
          adjacency[j].push(i);
        }
      }
    }

    // BƯỚC 2: Duyệt DFS tìm các thành phần liên thông
    const componentId = new Array<number>(count).fill(-1);
    const componentSizes: number[] = [];
    let componentCount = 0;

    for (let start = 0; start < count; start++) {
      if (componentId[start] !== -1) continue;

      const stack = [start];
      componentId[start] = componentCount;
      let size = 0;

      while (stack.length > 0) {
        const node = stack.pop() as number;
        size++;
        for (const neighbor of adjacency[node]) {
          if (componentId[neighbor] === -1) {
            componentId[neighbor] = componentCount;
            stack.push(neighbor);
          }
        }
      }
      componentSizes.push(size);
      componentCount++;
    }

    // BƯỚC 3: Xác định thành phần chính (lớn nhất)
    let mainComponent = 0;
    for (let c = 1; c < componentCount; c++) {
      if (componentSizes[c] > componentSizes[mainComponent]) {
        mainComponent = c;
      }
    }

    // BƯỚC 4: Thu thập các mô hình vi phạm
    const violations = new Set<string>();
    for (let i = 0; i < count; i++) {
      // Mô hình nằm ngoài thành phần chính → đội hình bị đứt gãy
      if (componentId[i] !== mainComponent) {
        violations.add(models[i].id);
        continue;
      }
      // Mô hình không đủ số đồng đội tối thiểu trong phạm vi 2"
      if (adjacency[i].length < requiredNeighbors) {
        violations.add(models[i].id);
      }
    }

    return Array.from(violations);
  }
}
