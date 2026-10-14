import { TerrainPiece, TerrainPieceData, Vertex2D } from './TerrainPiece';
import { ObjectiveMarker, ObjectiveMarkerData } from './ObjectiveMarker';
import type { Position2D } from './Model';

// =========================================================================
// ⚙️ MODULE CONFIGURATION & CONSTANTS
// =========================================================================
export const BATTLEFIELD_CONFIG = {
  DEFAULT_WIDTH_INCHES: 60,
  DEFAULT_HEIGHT_INCHES: 44,
} as const;

export interface BattlefieldDimensions {
  width: number;
  height: number;
}

export interface DeploymentZone {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface DeploymentZoneData {
  min_x: number;
  max_x: number;
  min_y: number;
  max_y: number;
}

export interface DeploymentZonesData {
  type: string;
  player_1: DeploymentZoneData;
  player_2: DeploymentZoneData;
}

export interface ObjectiveData {
  id: string;
  x: number;
  y: number;
}

export interface BattlefieldMapData {
  map_id: string;
  name: string;
  dimensions: { width_inches: number; height_inches: number };
  deployment_zones: DeploymentZonesData;
  objectives: ObjectiveData[];
  terrain_pieces: TerrainPieceData[];
}

// =========================================================================
// 📦 MODULE IMPLEMENTATION
// =========================================================================
export class Battlefield {
  readonly mapId: string;
  readonly name: string;
  readonly dimensions: BattlefieldDimensions;
  readonly deploymentType: string;
  private _deploymentZones: { player1: DeploymentZone; player2: DeploymentZone };
  private _terrains: TerrainPiece[];
  private _objectives: ObjectiveMarker[];

  constructor(data: BattlefieldMapData) {
    this.mapId = data.map_id;
    this.name = data.name;
    this.dimensions = {
      width: data.dimensions.width_inches,
      height: data.dimensions.height_inches,
    };
    this.deploymentType = data.deployment_zones.type;
    this._deploymentZones = {
      player1: this.parseZone(data.deployment_zones.player_1),
      player2: this.parseZone(data.deployment_zones.player_2),
    };
    this._terrains = data.terrain_pieces.map((t) => new TerrainPiece(t));
    this._objectives = data.objectives.map(
      (o) =>
        new ObjectiveMarker({
          id: o.id,
          position: { x: o.x, y: o.y },
        }),
    );
  }

  private parseZone(z: DeploymentZoneData): DeploymentZone {
    return {
      minX: z.min_x,
      maxX: z.max_x,
      minY: z.min_y,
      maxY: z.max_y,
    };
  }

  get terrains(): readonly TerrainPiece[] {
    return this._terrains;
  }

  get objectives(): readonly ObjectiveMarker[] {
    return this._objectives;
  }

  get width(): number {
    return this.dimensions.width;
  }

  get height(): number {
    return this.dimensions.height;
  }

  isWithinBounds(pos: Position2D, radius = 0): boolean {
    return (
      pos.x - radius >= 0 &&
      pos.x + radius <= this.dimensions.width &&
      pos.y - radius >= 0 &&
      pos.y + radius <= this.dimensions.height
    );
  }

  getDeploymentZone(player: 1 | 2): DeploymentZone {
    return player === 1 ? this._deploymentZones.player1 : this._deploymentZones.player2;
  }

  getObscuringTerrains(): TerrainPiece[] {
    return this._terrains.filter((t) => t.isObscuring);
  }

  getCoverTerrains(): TerrainPiece[] {
    return this._terrains.filter((t) => t.providesCover);
  }

  getObjectiveById(id: string): ObjectiveMarker | undefined {
    return this._objectives.find((o) => o.id === id);
  }

  addTerrain(terrain: TerrainPiece): void {
    this._terrains.push(terrain);
  }

  addObjective(objective: ObjectiveMarker): void {
    this._objectives.push(objective);
  }

  containsPoint(pos: Position2D): boolean {
    return (
      pos.x >= 0 &&
      pos.x <= this.dimensions.width &&
      pos.y >= 0 &&
      pos.y <= this.dimensions.height
    );
  }

  toData(): BattlefieldMapData {
    return {
      map_id: this.mapId,
      name: this.name,
      dimensions: {
        width_inches: this.dimensions.width,
        height_inches: this.dimensions.height,
      },
      deployment_zones: {
        type: this.deploymentType,
        player_1: {
          min_x: this._deploymentZones.player1.minX,
          max_x: this._deploymentZones.player1.maxX,
          min_y: this._deploymentZones.player1.minY,
          max_y: this._deploymentZones.player1.maxY,
        },
        player_2: {
          min_x: this._deploymentZones.player2.minX,
          max_x: this._deploymentZones.player2.maxX,
          min_y: this._deploymentZones.player2.minY,
          max_y: this._deploymentZones.player2.maxY,
        },
      },
      objectives: this._objectives.map((o) => ({
        id: o.id,
        x: o.position.x,
        y: o.position.y,
      })),
      terrain_pieces: this._terrains.map((t) => t.toData()),
    };
  }
}

export type { Vertex2D, ObjectiveMarkerData };
