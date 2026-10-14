// =========================================================================
// ⚙️ MODULE CONFIGURATION & CONSTANTS
// =========================================================================
export const TERRAIN_CONFIG = {
  SHAPE_POLYGON: 'POLYGON',
  SHAPE_RECTANGLE: 'RECTANGLE',
} as const;

export type TerrainType = 'RUINS' | 'CRATER' | 'BARRICADE';

export interface Vertex2D {
  x: number;
  y: number;
}

export interface WallSegment {
  from: Vertex2D;
  to: Vertex2D;
}

export interface TerrainPieceData {
  id: string;
  type: TerrainType;
  shape?: string;
  vertices: Vertex2D[];
  walls?: WallSegment[];
  is_obscuring: boolean;
  provides_cover: boolean;
}

// =========================================================================
// 📦 MODULE IMPLEMENTATION
// =========================================================================
export class TerrainPiece {
  readonly id: string;
  readonly type: TerrainType;
  readonly shape: string;
  readonly bounds: readonly Vertex2D[];
  readonly walls: readonly WallSegment[];
  readonly isObscuring: boolean;
  readonly providesCover: boolean;

  constructor(data: TerrainPieceData) {
    this.id = data.id;
    this.type = data.type;
    this.shape = data.shape ?? TERRAIN_CONFIG.SHAPE_POLYGON;
    this.bounds = Object.freeze(data.vertices.map((v) => ({ ...v })));
    this.walls = Object.freeze(
      (data.walls ?? []).map((w) => ({
        from: { ...w.from },
        to: { ...w.to },
      })),
    );
    this.isObscuring = data.is_obscuring;
    this.providesCover = data.provides_cover;
  }

  isRuins(): boolean {
    return this.type === 'RUINS';
  }

  getVertexCount(): number {
    return this.bounds.length;
  }

  toData(): TerrainPieceData {
    return {
      id: this.id,
      type: this.type,
      shape: this.shape,
      vertices: this.bounds.map((v) => ({ ...v })),
      walls: this.walls.map((w) => ({
        from: { ...w.from },
        to: { ...w.to },
      })),
      is_obscuring: this.isObscuring,
      provides_cover: this.providesCover,
    };
  }
}
