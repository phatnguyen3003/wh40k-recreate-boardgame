import type { Model } from '../entities/Model';
import type { Unit } from '../entities/Unit';
import { Measurement, Point2D } from '../spatial/Measurement';
import { Collision2D } from '../spatial/Collision2D';
import type { RenderScene } from './CanvasRenderer';

// =========================================================================
// ⚙️ MODULE CONFIGURATION & CONSTANTS
// =========================================================================
export const INPUT_CONTROLLER_CONFIG = {
  CURSOR_DEFAULT: 'default',
  CURSOR_HOVER: 'pointer',
  CURSOR_DRAG: 'grabbing',
} as const;

export interface InputControllerCallbacks {
  /** Lấy scene hiện tại để hit-test và kiểm tra va chạm. */
  getScene: () => RenderScene;
  /** Được gọi khi người chơi chọn / bỏ chọn đơn vị. */
  onSelectUnit?: (unitId: string | null) => void;
  /** Được gọi khi kéo thả xong 1 mô hình tới vị trí mới hợp lệ. */
  onModelMoved?: (unitId: string, modelId: string) => void;
  /** Yêu cầu vẽ lại canvas sau khi thay đổi dữ liệu. */
  requestRender?: () => void;
}

interface DragState {
  unit: Unit;
  model: Model;
  originPosition: Point2D;
  moved: boolean;
}

// =========================================================================
// 📦 MODULE IMPLEMENTATION
// =========================================================================
export class InputController {
  private canvas: HTMLCanvasElement;
  private callbacks: InputControllerCallbacks;
  private drag: DragState | null = null;
  private hoveredModelId: string | null = null;

  // Lưu handler để có thể gỡ bỏ khi destroy()
  private readonly onMouseDown: (e: MouseEvent) => void;
  private readonly onMouseMove: (e: MouseEvent) => void;
  private readonly onMouseUp: (e: MouseEvent) => void;
  private readonly onMouseLeave: (e: MouseEvent) => void;

  constructor(canvas: HTMLCanvasElement, callbacks: InputControllerCallbacks) {
    this.canvas = canvas;
    this.callbacks = callbacks;

    this.onMouseDown = (e) => this.handleMouseDown(e);
    this.onMouseMove = (e) => this.handleMouseMove(e);
    this.onMouseUp = (e) => this.handleMouseUp(e);
    this.onMouseLeave = () => this.handleMouseLeave();

    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('mouseleave', this.onMouseLeave);
  }

  /** Gỡ bỏ toàn bộ event listener. */
  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('mouseleave', this.onMouseLeave);
  }

  /** Chuyển toạ độ chuột (CSS pixel) → toạ độ bàn cờ (inch). */
  private toWorldPosition(event: MouseEvent): Point2D {
    const rect = this.canvas.getBoundingClientRect();
    // Canvas có thể bị CSS scale → quy đổi về pixel thật của canvas
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const pixelX = (event.clientX - rect.left) * scaleX;
    const pixelY = (event.clientY - rect.top) * scaleY;
    return {
      x: Measurement.pixelsToInches(pixelX),
      y: Measurement.pixelsToInches(pixelY),
    };
  }

  /** Tìm mô hình nằm dưới con trỏ chuột. */
  private hitTestModel(position: Point2D): { unit: Unit; model: Model } | null {
    const scene = this.callbacks.getScene();
    for (const unit of scene.units) {
      for (const model of unit.getAliveModels()) {
        const distance = Measurement.getCenterDistance(position, model.position);
        if (distance <= model.baseRadius) {
          return { unit, model };
        }
      }
    }
    return null;
  }

  private handleMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return; // chỉ xử lý chuột trái

    const world = this.toWorldPosition(event);
    const hit = this.hitTestModel(world);

    if (hit) {
      // Bắt đầu kéo thả và chọn đơn vị chứa mô hình đó
      this.drag = {
        unit: hit.unit,
        model: hit.model,
        originPosition: { ...hit.model.position },
        moved: false,
      };
      this.canvas.style.cursor = INPUT_CONTROLLER_CONFIG.CURSOR_DRAG;
      this.callbacks.onSelectUnit?.(hit.unit.unitId);
    } else {
      // Click ra ngoài → bỏ chọn
      this.drag = null;
      this.callbacks.onSelectUnit?.(null);
    }
    this.callbacks.requestRender?.();
  }

  private handleMouseMove(event: MouseEvent): void {
    const world = this.toWorldPosition(event);

    if (!this.drag) {
      // Cập nhật cursor khi hover lên mô hình
      const hovered = this.hitTestModel(world);
      const hoveredId = hovered ? hovered.model.id : null;
      if (hoveredId !== this.hoveredModelId) {
        this.hoveredModelId = hoveredId;
        this.canvas.style.cursor = hovered
          ? INPUT_CONTROLLER_CONFIG.CURSOR_HOVER
          : INPUT_CONTROLLER_CONFIG.CURSOR_DEFAULT;
      }
      return;
    }

    // Đang kéo: kiểm tra tính hợp lệ của vị trí mới
    const { model } = this.drag;
    const scene = this.callbacks.getScene();
    const battlefield = scene.battlefield;

    // 1. Mô hình phải nằm trọn trong mép bàn
    if (!battlefield.isWithinBounds(world, model.baseRadius)) {
      return;
    }

    // 2. Không được chồng lấn đế với mô hình khác
    const others: Model[] = [];
    for (const otherUnit of scene.units) {
      for (const otherModel of otherUnit.getAliveModels()) {
        if (otherModel !== model) others.push(otherModel);
      }
    }
    if (Collision2D.checkCircleOverlap(model, world, others)) {
      return;
    }

    // 3. Không được xuyên qua tường địa hình
    if (
      Collision2D.checkTerrainCollision(
        this.drag.originPosition,
        world,
        model.baseRadius,
        battlefield.terrains,
      )
    ) {
      return;
    }

    // Vị trí hợp lệ → di chuyển mô hình
    model.setPosition(world.x, world.y);
    this.drag.moved = true;
    this.callbacks.requestRender?.();
  }

  private handleMouseUp(event: MouseEvent): void {
    if (event.button !== 0) return;
    if (this.drag && this.drag.moved) {
      this.callbacks.onModelMoved?.(this.drag.unit.unitId, this.drag.model.id);
    }
    this.drag = null;
    this.canvas.style.cursor = INPUT_CONTROLLER_CONFIG.CURSOR_DEFAULT;
  }

  private handleMouseLeave(): void {
    if (this.drag && this.drag.moved) {
      this.callbacks.onModelMoved?.(this.drag.unit.unitId, this.drag.model.id);
    }
    this.drag = null;
    this.hoveredModelId = null;
    this.canvas.style.cursor = INPUT_CONTROLLER_CONFIG.CURSOR_DEFAULT;
  }
}
