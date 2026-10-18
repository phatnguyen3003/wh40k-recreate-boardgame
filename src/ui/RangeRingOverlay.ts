import { Measurement, Point2D } from '../spatial/Measurement';

// =========================================================================
// ⚙️ MODULE CONFIGURATION & CONSTANTS
// =========================================================================
export const RANGE_RING_CONFIG = {
  DEFAULT_LINE_WIDTH: 2,
  DEFAULT_DASH: [8, 6],
  MOVE_RING_COLOR: '#10b981',   // Vòng xanh: phạm vi di chuyển M"
  WEAPON_RING_COLOR: '#e63946', // Vòng đỏ: tầm bắn tối đa của vũ khí
  ENGAGEMENT_COLOR: '#c5a059',  // Viền vàng: Engagement Range 1"
} as const;

export interface RangeRing {
  center: Point2D;        // Tâm vòng (inch)
  radiusInches: number;   // Bán kính (inch)
  color: string;
  dashed?: boolean;
  lineWidth?: number;
  fill?: boolean;
  label?: string;
}

// =========================================================================
// 📦 MODULE IMPLEMENTATION
// =========================================================================
export class RangeRingOverlay {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /** Vẽ danh sách các vòng hỗ trợ chiến thuật (bán trong suốt). */
  drawRings(rings: readonly RangeRing[]): void {
    const { ctx } = this;
    for (const ring of rings) {
      const cx = Measurement.inchesToPixels(ring.center.x);
      const cy = Measurement.inchesToPixels(ring.center.y);
      const radius = Measurement.inchesToPixels(ring.radiusInches);

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);

      if (ring.fill) {
        ctx.fillStyle = ring.color;
        ctx.fill();
      }

      ctx.strokeStyle = ring.color;
      ctx.lineWidth = ring.lineWidth ?? RANGE_RING_CONFIG.DEFAULT_LINE_WIDTH;
      if (ring.dashed) {
        ctx.setLineDash([...RANGE_RING_CONFIG.DEFAULT_DASH]);
      }
      ctx.stroke();

      // Nhãn văn bản (VD: 'M"', '24"')
      if (ring.label) {
        ctx.setLineDash([]);
        ctx.fillStyle = ring.color;
        ctx.font = '12px monospace';
        ctx.fillText(ring.label, cx + radius + 4, cy);
      }
      ctx.restore();
    }
  }

  /** Tạo nhanh bộ 3 vòng: di chuyển M", tầm bắn, engagement 1". */
  static buildStandardRings(center: Point2D, moveInches: number, weaponRangeInches?: number): RangeRing[] {
    const rings: RangeRing[] = [
      {
        center,
        radiusInches: moveInches,
        color: RANGE_RING_CONFIG.MOVE_RING_COLOR,
        dashed: true,
        label: `${moveInches}"`,
      },
      {
        center,
        radiusInches: 1,
        color: RANGE_RING_CONFIG.ENGAGEMENT_COLOR,
        lineWidth: 1,
        label: '1"',
      },
    ];

    if (weaponRangeInches !== undefined) {
      rings.push({
        center,
        radiusInches: weaponRangeInches,
        color: RANGE_RING_CONFIG.WEAPON_RING_COLOR,
        dashed: true,
        label: `${weaponRangeInches}"`,
      });
    }

    return rings;
  }
}
