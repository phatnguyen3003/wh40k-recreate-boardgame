// =========================================================================
// ⚙️ MODULE CONFIGURATION & CONSTANTS
// =========================================================================
export const VECTOR2D_CONFIG = {
  DEGREES_PER_RADIAN: 180 / Math.PI,
  RADIANS_PER_DEGREE: Math.PI / 180,
  EPSILON: 1e-9,
} as const;

// =========================================================================
// 📦 MODULE IMPLEMENTATION
// =========================================================================
export interface Vector2DData {
  x: number;
  y: number;
}

export class Vector2D {
  public x: number;
  public y: number;

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  static from(data: Vector2DData): Vector2D {
    return new Vector2D(data.x, data.y);
  }

  static zero(): Vector2D {
    return new Vector2D(0, 0);
  }

  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  copy(v: Vector2DData): this {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  clone(): Vector2D {
    return new Vector2D(this.x, this.y);
  }

  equals(v: Vector2DData): boolean {
    return (
      Math.abs(this.x - v.x) < VECTOR2D_CONFIG.EPSILON &&
      Math.abs(this.y - v.y) < VECTOR2D_CONFIG.EPSILON
    );
  }

  add(v: Vector2DData): this {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  static add(a: Vector2DData, b: Vector2DData): Vector2D {
    return new Vector2D(a.x + b.x, a.y + b.y);
  }

  subtract(v: Vector2DData): this {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  static subtract(a: Vector2DData, b: Vector2DData): Vector2D {
    return new Vector2D(a.x - b.x, a.y - b.y);
  }

  multiply(scalar: number): this {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  static multiply(v: Vector2DData, scalar: number): Vector2D {
    return new Vector2D(v.x * scalar, v.y * scalar);
  }

  divide(scalar: number): this {
    if (scalar === 0) {
      throw new Error('Vector2D.divide: division by zero');
    }
    this.x /= scalar;
    this.y /= scalar;
    return this;
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  normalize(): this {
    const len = this.length();
    if (len < VECTOR2D_CONFIG.EPSILON) {
      this.x = 0;
      this.y = 0;
      return this;
    }
    this.x /= len;
    this.y /= len;
    return this;
  }

  static normalize(v: Vector2DData): Vector2D {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len < VECTOR2D_CONFIG.EPSILON) {
      return new Vector2D(0, 0);
    }
    return new Vector2D(v.x / len, v.y / len);
  }

  dot(v: Vector2DData): number {
    return this.x * v.x + this.y * v.y;
  }

  static dot(a: Vector2DData, b: Vector2DData): number {
    return a.x * b.x + a.y * b.y;
  }

  cross(v: Vector2DData): number {
    return this.x * v.y - this.y * v.x;
  }

  static cross(a: Vector2DData, b: Vector2DData): number {
    return a.x * b.y - a.y * b.x;
  }

  distanceTo(v: Vector2DData): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static distance(a: Vector2DData, b: Vector2DData): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  distanceSquaredTo(v: Vector2DData): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return dx * dx + dy * dy;
  }

  angleTo(v: Vector2DData): number {
    return Math.atan2(v.y - this.y, v.x - this.x);
  }

  static angleBetween(a: Vector2DData, b: Vector2DData): number {
    const dot = a.x * b.x + a.y * b.y;
    const lenA = Math.sqrt(a.x * a.x + a.y * a.y);
    const lenB = Math.sqrt(b.x * b.x + b.y * b.y);
    if (lenA < VECTOR2D_CONFIG.EPSILON || lenB < VECTOR2D_CONFIG.EPSILON) {
      return 0;
    }
    const cos = Math.max(-1, Math.min(1, dot / (lenA * lenB)));
    return Math.acos(cos);
  }

  rotate(radians: number): this {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const newX = this.x * cos - this.y * sin;
    const newY = this.x * sin + this.y * cos;
    this.x = newX;
    this.y = newY;
    return this;
  }

  static rotate(v: Vector2DData, radians: number): Vector2D {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return new Vector2D(v.x * cos - v.y * sin, v.x * sin + v.y * cos);
  }

  rotateDegrees(degrees: number): this {
    return this.rotate(degrees * VECTOR2D_CONFIG.RADIANS_PER_DEGREE);
  }

  toDegrees(radians: number): number {
    return radians * VECTOR2D_CONFIG.DEGREES_PER_RADIAN;
  }

  toRadians(degrees: number): number {
    return degrees * VECTOR2D_CONFIG.RADIANS_PER_DEGREE;
  }

  toData(): Vector2DData {
    return { x: this.x, y: this.y };
  }

  toString(): string {
    return `Vector2D(${this.x}, ${this.y})`;
  }
}
