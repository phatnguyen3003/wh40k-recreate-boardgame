import type { Battlefield } from '../entities/Battlefield';
import { Measurement } from '../spatial/Measurement';

// =========================================================================
// ⚙️ MODULE CONFIGURATION & CONSTANTS
// =========================================================================
export const MAP_RENDERER_CONFIG = {
  PLAYMAT_FILL: '#26221d',
  PLAYMAT_BORDER: '#4a443c',
  PLAYMAT_BORDER_WIDTH: 4,

  DEPLOYMENT_LINE_COLOR: '#c5a059',
  DEPLOYMENT_LINE_WIDTH: 2,
  DEPLOYMENT_LINE_DASH: [10, 8],
  DEPLOYMENT_FILL: 'rgba(197, 160, 89, 0.07)',

  TERRAIN_FOOTPRINT_FILL: 'rgba(120, 124, 138, 0.18)',
  TERRAIN_FOOTPRINT_BORDER: 'rgba(150, 155, 170, 0.55)',
  TERRAIN_WALL_COLOR: '#8a8578',
  TERRAIN_WALL_WIDTH: 4,

  OBJECTIVE_MARKER_FILL: '#e63946',
  OBJECTIVE_MARKER_BORDER: '#ffd9dd',
  OBJECTIVE_CONTROL_STROKE: 'rgba(197, 160, 89, 0.85)',
  OBJECTIVE_CONTROL_FILL: 'rgba(197, 160, 89, 0.10)',
  OBJECTIVE_CONTROL_LINE_WIDTH: 2,
  OBJECTIVE_CONTROL_DASH: [6, 6],
} as const;

// =========================================================================
// 📦 MODULE IMPLEMENTATION
// =========================================================================
export class MapRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /** Vẽ toàn bộ lớp bản đồ theo thứ tự: nền → vạch xuất quân → địa hình → điểm cờ. */
  draw(battlefield: Battlefield): void {
    this.drawPlaymat(battlefield);
    this.drawDeploymentZones(battlefield);
    this.drawTerrains(battlefield);
    this.drawObjectives(battlefield);
  }

  /** Vẽ nền sa bàn với viền bao quanh. */
  drawPlaymat(battlefield: Battlefield): void {
    const { ctx } = this;
    const width = Measurement.inchesToPixels(battlefield.width);
    const height = Measurement.inchesToPixels(battlefield.height);

    ctx.fillStyle = MAP_RENDERER_CONFIG.PLAYMAT_FILL;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = MAP_RENDERER_CONFIG.PLAYMAT_BORDER;
    ctx.lineWidth = MAP_RENDERER_CONFIG.PLAYMAT_BORDER_WIDTH;
    ctx.strokeRect(0, 0, width, height);
  }

  /** Vẽ vạch nét đứt phân định vùng xuất quân của 2 bên. */
  drawDeploymentZones(battlefield: Battlefield): void {
    const { ctx } = this;
    for (const player of [1, 2] as const) {
      const zone = battlefield.getDeploymentZone(player);
      const x = Measurement.inchesToPixels(zone.minX);
      const y = Measurement.inchesToPixels(zone.minY);
      const w = Measurement.inchesToPixels(zone.maxX - zone.minX);
      const h = Measurement.inchesToPixels(zone.maxY - zone.minY);

      ctx.fillStyle = MAP_RENDERER_CONFIG.DEPLOYMENT_FILL;
      ctx.fillRect(x, y, w, h);

      ctx.save();
      ctx.strokeStyle = MAP_RENDERER_CONFIG.DEPLOYMENT_LINE_COLOR;
      ctx.lineWidth = MAP_RENDERER_CONFIG.DEPLOYMENT_LINE_WIDTH;
      ctx.setLineDash([...MAP_RENDERER_CONFIG.DEPLOYMENT_LINE_DASH]);
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }
  }

  /** Vẽ footprint (mờ) và tường (dày, đặc) của từng khối địa hình. */
  drawTerrains(battlefield: Battlefield): void {
    const { ctx } = this;
    for (const terrain of battlefield.terrains) {
      // Footprint đa giác
      if (terrain.bounds.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(
          Measurement.inchesToPixels(terrain.bounds[0].x),
          Measurement.inchesToPixels(terrain.bounds[0].y),
        );
        for (let i = 1; i < terrain.bounds.length; i++) {
          ctx.lineTo(
            Measurement.inchesToPixels(terrain.bounds[i].x),
            Measurement.inchesToPixels(terrain.bounds[i].y),
          );
        }
        ctx.closePath();
        ctx.fillStyle = MAP_RENDERER_CONFIG.TERRAIN_FOOTPRINT_FILL;
        ctx.fill();
        ctx.strokeStyle = MAP_RENDERER_CONFIG.TERRAIN_FOOTPRINT_BORDER;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Tường cản (đoạn thẳng dày)
      ctx.strokeStyle = MAP_RENDERER_CONFIG.TERRAIN_WALL_COLOR;
      ctx.lineWidth = MAP_RENDERER_CONFIG.TERRAIN_WALL_WIDTH;
      ctx.lineCap = 'round';
      for (const wall of terrain.walls) {
        ctx.beginPath();
        ctx.moveTo(
          Measurement.inchesToPixels(wall.from.x),
          Measurement.inchesToPixels(wall.from.y),
        );
        ctx.lineTo(
          Measurement.inchesToPixels(wall.to.x),
          Measurement.inchesToPixels(wall.to.y),
        );
        ctx.stroke();
      }
    }
  }

  /** Vẽ marker điểm cờ (40mm) và vòng hào quang kiểm soát 3". */
  drawObjectives(battlefield: Battlefield): void {
    const { ctx } = this;
    for (const objective of battlefield.objectives) {
      const cx = Measurement.inchesToPixels(objective.position.x);
      const cy = Measurement.inchesToPixels(objective.position.y);

      // Vòng hào quang kiểm soát (3")
      ctx.beginPath();
      ctx.arc(cx, cy, Measurement.inchesToPixels(objective.controlRadius), 0, Math.PI * 2);
      ctx.fillStyle = MAP_RENDERER_CONFIG.OBJECTIVE_CONTROL_FILL;
      ctx.fill();
      ctx.save();
      ctx.setLineDash([...MAP_RENDERER_CONFIG.OBJECTIVE_CONTROL_DASH]);
      ctx.strokeStyle = MAP_RENDERER_CONFIG.OBJECTIVE_CONTROL_STROKE;
      ctx.lineWidth = MAP_RENDERER_CONFIG.OBJECTIVE_CONTROL_LINE_WIDTH;
      ctx.stroke();
      ctx.restore();

      // Marker điểm cờ (bán kính thực 40mm quy đổi)
      ctx.beginPath();
      ctx.arc(cx, cy, Measurement.inchesToPixels(objective.radius), 0, Math.PI * 2);
      ctx.fillStyle = MAP_RENDERER_CONFIG.OBJECTIVE_MARKER_FILL;
      ctx.fill();
      ctx.strokeStyle = MAP_RENDERER_CONFIG.OBJECTIVE_MARKER_BORDER;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}
