import { Vector2D } from '../core/Vector2D';

// =========================================================================
// ⚙️ MODULE CONFIGURATION & CONSTANTS
// =========================================================================
export const SPATIAL_CONFIG = {
    PIXELS_PER_INCH: 20,                 // Tỉ lệ quy đổi 1 inch = 20 pixels
    ENGAGEMENT_RANGE_INCHES: 1.0,        // Vùng áp sát cận chiến (1 inch)
    COHERENCY_MAX_DISTANCE_INCHES: 2.0,  // Cự ly tối đa giữa các lính (2 inches)
    COHERENCY_MIN_NEIGHBORS: 1,          // Số đồng đội tối thiểu đứng gần (unit < 7 lính)
    COHERENCY_MIN_NEIGHBORS_LARGE: 2,    // Số đồng đội tối thiểu đứng gần (unit >= 7 lính)
    COHERENCY_LARGE_UNIT_THRESHOLD: 7,   // Ngưỡng kích thước để áp dụng luật coherency lớn
    OBJECTIVE_CONTROL_RADIUS_INCHES: 3.0, // Bán kính kiểm soát điểm cờ (3 inches)
} as const;

export interface Point2D {
    x: number;
    y: number;
}

// Interface cấu trúc tối thiểu để đo đạc — không phụ thuộc class Model cụ thể
export interface MeasurableModel {
    position: Point2D;
    baseRadius: number; // Đơn vị: inch
}

// =========================================================================
// 📦 MODULE IMPLEMENTATION
// =========================================================================
export class Measurement {
    /**
     * Quy đổi inch → pixel theo tỉ lệ cấu hình.
     */
    static inchesToPixels(inches: number): number {
        return inches * SPATIAL_CONFIG.PIXELS_PER_INCH;
    }

    /**
     * Quy đổi pixel → inch.
     */
    static pixelsToInches(pixels: number): number {
        return pixels / SPATIAL_CONFIG.PIXELS_PER_INCH;
    }

    /**
     * Khoảng cách tâm-tâm giữa 2 mô hình (đơn vị: inch).
     */
    static getCenterDistance(a: Point2D, b: Point2D): number {
        return Vector2D.distance(a, b);
    }

    /**
     * Khoảng cách Base-to-base (mép đế gần nhất), đơn vị: inch.
     * d_base = max(0, distance(centerA, centerB) - (rA + rB))
     */
    static getBaseToBaseDistance(a: MeasurableModel, b: MeasurableModel): number {
        const centerDistance = Measurement.getCenterDistance(a.position, b.position);
        return Math.max(0, centerDistance - (a.baseRadius + b.baseRadius));
    }

    /**
     * Khoảng cách Base-to-base quy đổi ra pixel.
     */
    static getBaseToBasePixels(a: MeasurableModel, b: MeasurableModel): number {
        return Measurement.inchesToPixels(Measurement.getBaseToBaseDistance(a, b));
    }

    /**
     * Kiểm tra 2 mô hình có nằm trong Engagement Range (<= 1") hay không.
     */
    static isInEngagementRange(a: MeasurableModel, b: MeasurableModel): boolean {
        return (
            Measurement.getBaseToBaseDistance(a, b) <= SPATIAL_CONFIG.ENGAGEMENT_RANGE_INCHES
        );
    }
}
