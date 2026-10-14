// =========================================================================
// ⚙️ MODULE CONFIGURATION & CONSTANTS
// =========================================================================
export const OBJECTIVE_MARKER_CONFIG = {
  MARKER_RADIUS_MM: 40,
  CONTROL_RADIUS_INCHES: 3.0,
  MM_PER_INCH: 25.4,
} as const;

import type { Position2D } from './Model';

export interface ObjectiveMarkerData {
  id: string;
  position: Position2D;
  radius_mm?: number;
  control_radius_inches?: number;
  controlling_player?: number | null;
}

// =========================================================================
// 📦 MODULE IMPLEMENTATION
// =========================================================================
export class ObjectiveMarker {
  readonly id: string;
  position: Position2D;
  readonly radius: number;
  readonly controlRadius: number;
  controllingPlayer: number | null;

  constructor(data: ObjectiveMarkerData) {
    this.id = data.id;
    this.position = { ...data.position };
    const radiusMm = data.radius_mm ?? OBJECTIVE_MARKER_CONFIG.MARKER_RADIUS_MM;
    this.radius = radiusMm / 2 / OBJECTIVE_MARKER_CONFIG.MM_PER_INCH;
    this.controlRadius =
      data.control_radius_inches ?? OBJECTIVE_MARKER_CONFIG.CONTROL_RADIUS_INCHES;
    this.controllingPlayer = data.controlling_player ?? null;
  }

  setControllingPlayer(player: number | null): void {
    this.controllingPlayer = player;
  }

  isContested(): boolean {
    return this.controllingPlayer === null;
  }

  isControlledBy(player: number): boolean {
    return this.controllingPlayer === player;
  }

  toData(): ObjectiveMarkerData {
    return {
      id: this.id,
      position: { ...this.position },
      radius_mm: this.radius * 2 * OBJECTIVE_MARKER_CONFIG.MM_PER_INCH,
      control_radius_inches: this.controlRadius,
      controlling_player: this.controllingPlayer,
    };
  }
}
