// =========================================================================
// ⚙️ MODULE CONFIGURATION & CONSTANTS
// =========================================================================
export const MODEL_CONFIG = {
  MM_PER_INCH: 25.4,
  DEFAULT_POSITION: { x: 0, y: 0 },
} as const;

export interface Position2D {
  x: number;
  y: number;
}

export interface ModelData {
  id: string;
  base_size_mm?: number;
  base_radius?: number;
  position?: Position2D;
  current_wounds: number;
  max_wounds?: number;
  is_leader?: boolean;
}

// =========================================================================
// 📦 MODULE IMPLEMENTATION
// =========================================================================
export class Model {
  readonly id: string;
  readonly baseRadius: number;
  readonly maxWounds: number;
  position: Position2D;
  currentWounds: number;
  isLeader: boolean;
  isDestroyed: boolean;

  constructor(data: ModelData) {
    this.id = data.id;

    if (data.base_radius !== undefined) {
      this.baseRadius = data.base_radius;
    } else if (data.base_size_mm !== undefined) {
      this.baseRadius = data.base_size_mm / 2 / MODEL_CONFIG.MM_PER_INCH;
    } else {
      this.baseRadius = 0;
    }

    this.position = data.position
      ? { ...data.position }
      : { ...MODEL_CONFIG.DEFAULT_POSITION };

    this.maxWounds = data.max_wounds ?? data.current_wounds;
    this.currentWounds = data.current_wounds;
    this.isLeader = data.is_leader ?? false;
    this.isDestroyed = this.currentWounds <= 0;
  }

  takeDamage(amount: number): void {
    if (amount <= 0 || this.isDestroyed) return;
    this.currentWounds = Math.max(0, this.currentWounds - amount);
    if (this.currentWounds <= 0) {
      this.isDestroyed = true;
    }
  }

  heal(amount: number): void {
    if (amount <= 0) return;
    this.currentWounds = Math.min(this.maxWounds, this.currentWounds + amount);
    if (this.currentWounds > 0) {
      this.isDestroyed = false;
    }
  }

  setPosition(x: number, y: number): void {
    this.position.x = x;
    this.position.y = y;
  }

  getBaseDiameter(): number {
    return this.baseRadius * 2;
  }

  clone(): Model {
    return new Model({
      id: this.id,
      base_radius: this.baseRadius,
      position: { ...this.position },
      current_wounds: this.currentWounds,
      max_wounds: this.maxWounds,
      is_leader: this.isLeader,
    });
  }

  toData(): ModelData {
    return {
      id: this.id,
      base_radius: this.baseRadius,
      position: { ...this.position },
      current_wounds: this.currentWounds,
      max_wounds: this.maxWounds,
      is_leader: this.isLeader,
    };
  }
}
