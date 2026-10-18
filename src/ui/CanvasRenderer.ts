import type { Battlefield } from '../entities/Battlefield';
import type { Unit } from '../entities/Unit';
import type { Model } from '../entities/Model';
import { Measurement } from '../spatial/Measurement';
import { CoherencyValidator } from '../spatial/CoherencyValidator';
import { MapRenderer } from './MapRenderer';
import { RangeRingOverlay, RangeRing } from './RangeRingOverlay';

// =========================================================================
// ⚙️ MODULE CONFIGURATION & CONSTANTS
// =========================================================================
export const CANVAS_RENDERER_CONFIG = {
  FACTION_COLORS: {
    'Space Marines': '#0284c7',
    Tyranids: '#7c3aed',
    DEFAULT: '#94a3b8',
  } as Record<string, string>,
  MODEL_BORDER_COLOR: '#0a0c10',
  MODEL_BORDER_WIDTH: 2,
  SELECTED_RING_COLOR: '#c5a059',
  SELECTED_RING_WIDTH: 3,
  VIOLATION_RING_COLOR: '#e63946',
  VIOLATION_RING_WIDTH: 3,
  LEADER_MARK_COLOR: '#ffd166',
  LEADER_MARK_RADIUS_RATIO: 0.35,
  WOUND_ARC_COLOR: '#10b981',
} as const;

export interface RenderScene {
  battlefield: Battlefield;
  units: readonly Unit[];
  selectedUnitId?: string | null;
  rangeRings?: readonly RangeRing[];
}

// =========================================================================
// 📦 MODULE IMPLEMENTATION
// =========================================================================
export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mapRenderer: MapRenderer;
  private ringOverlay: RangeRingOverlay;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('CanvasRenderer: không lấy được 2D context từ canvas');
    }
    this.ctx = ctx;
    this.mapRenderer = new MapRenderer(ctx);
    this.ringOverlay = new RangeRingOverlay(ctx);
  }

  /** Điều chỉnh kích thước canvas khớp với kích thước sa bàn (inch → pixel). */
  resizeToBattlefield(battlefield: Battlefield): void {
    this.canvas.width = Measurement.inchesToPixels(battlefield.width);
    this.canvas.height = Measurement.inchesToPixels(battlefield.height);
  }

  /**
   * Vẽ toàn bộ scene theo thứ tự lớp (Z-index):
   * Map → Deployment Lines → Range Overlays → Units → UI FX.
   */
  render(scene: RenderScene): void {
    const { ctx } = this;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Lớp 1+2: Bản đồ + vạch xuất quân (MapRenderer tự vẽ nội bộ theo thứ tự)
    this.mapRenderer.draw(scene.battlefield);

    // Lớp 3: Vòng hỗ trợ chiến thuật
    if (scene.rangeRings && scene.rangeRings.length > 0) {
      this.ringOverlay.drawRings(scene.rangeRings);
    }

    // Lớp 4: Mô hình quân
    this.drawUnits(scene.units, scene.selectedUnitId ?? null);

    // Lớp 5: UI FX (không vẽ gì thêm ở giai đoạn này)
  }

  /** Lấy màu theo tên faction (mặc định xám). */
  private getFactionColor(faction: string): string {
    return (
      CANVAS_RENDERER_CONFIG.FACTION_COLORS[faction] ??
      CANVAS_RENDERER_CONFIG.FACTION_COLORS.DEFAULT
    );
  }

  /** Vẽ toàn bộ mô hình còn sống của các đơn vị, kèm cảnh báo coherency. */
  private drawUnits(units: readonly Unit[], selectedUnitId: string | null): void {
    const { ctx } = this;

    for (const unit of units) {
      const baseColor = this.getFactionColor(unit.faction);
      const isSelected = unit.unitId === selectedUnitId;
      // BƯỚC: kiểm tra coherency để tô viền đỏ các mô hình vi phạm
      const violations = CoherencyValidator.validateUnitCoherency(unit);
      const violationSet = new Set(violations);

      for (const model of unit.getAliveModels()) {
        const cx = Measurement.inchesToPixels(model.position.x);
        const cy = Measurement.inchesToPixels(model.position.y);
        const radius = Measurement.inchesToPixels(model.baseRadius);

        // Thân đế mô hình
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();
        ctx.strokeStyle = CANVAS_RENDERER_CONFIG.MODEL_BORDER_COLOR;
        ctx.lineWidth = CANVAS_RENDERER_CONFIG.MODEL_BORDER_WIDTH;
        ctx.stroke();

        // Viền cảnh báo mô hình vi phạm đội hình
        if (violationSet.has(model.id)) {
          ctx.beginPath();
          ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
          ctx.strokeStyle = CANVAS_RENDERER_CONFIG.VIOLATION_RING_COLOR;
          ctx.lineWidth = CANVAS_RENDERER_CONFIG.VIOLATION_RING_WIDTH;
          ctx.stroke();
        }

        // Viền vàng cho đơn vị đang được chọn
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
          ctx.strokeStyle = CANVAS_RENDERER_CONFIG.SELECTED_RING_COLOR;
          ctx.lineWidth = CANVAS_RENDERER_CONFIG.SELECTED_RING_WIDTH;
          ctx.stroke();
        }

        this.drawWounds(model, cx, cy, radius);
      }
    }
  }

  /** Vẽ cung máu của mô hình (chỉ khi mô hình có > 1 wound). */
  private drawWounds(model: Model, cx: number, cy: number, radius: number): void {
    if (model.maxWounds <= 1) return;

    const { ctx } = this;
    const ratio = Math.max(0, model.currentWounds / model.maxWounds);

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
    ctx.strokeStyle = CANVAS_RENDERER_CONFIG.WOUND_ARC_COLOR;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}
