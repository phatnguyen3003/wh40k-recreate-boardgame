import { Model } from './Model';
import { Weapon, WeaponData } from './Weapon';

// =========================================================================
// ⚙️ MODULE CONFIGURATION & CONSTANTS
// =========================================================================
export const UNIT_CONFIG = {
  HALF_STRENGTH_RATIO: 0.5,
} as const;

export interface DatasheetStats {
  movement: number;
  toughness: number;
  save: number;
  invulnerableSave: number | null;
  woundsPerModel: number;
  leadership: number;
  objectiveControl: number;
}

export interface DatasheetStatsData {
  movement: number;
  toughness: number;
  save: number;
  invulnerable_save: number | null;
  wounds_per_model: number;
  leadership: number;
  objective_control: number;
}

export interface UnitModelData {
  id: string;
  is_leader: boolean;
}

export interface UnitStatusFlags {
  isBattleShocked: boolean;
  hasMoved: boolean;
  hasAdvanced: boolean;
  hasFallenBack: boolean;
  hasShot: boolean;
  hasCharged: boolean;
  hasFought: boolean;
  remainedStationary: boolean;
}

export interface UnitData {
  unit_id: string;
  name: string;
  faction?: string;
  keywords: string[];
  stats: DatasheetStatsData;
  base_size_mm: number;
  models: UnitModelData[];
  weapons: WeaponData[];
}

// =========================================================================
// 📦 MODULE IMPLEMENTATION
// =========================================================================
export class Unit {
  readonly unitId: string;
  readonly name: string;
  readonly faction: string;
  readonly keywords: readonly string[];
  readonly datasheetStats: DatasheetStats;
  readonly baseSizeMm: number;
  private _models: Model[];
  private _weapons: Weapon[];
  statusFlags: UnitStatusFlags;

  constructor(data: UnitData, faction = '') {
    this.unitId = data.unit_id;
    this.name = data.name;
    this.faction = data.faction ?? faction;
    this.keywords = Object.freeze([...data.keywords]);
    this.baseSizeMm = data.base_size_mm;

    this.datasheetStats = {
      movement: data.stats.movement,
      toughness: data.stats.toughness,
      save: data.stats.save,
      invulnerableSave: data.stats.invulnerable_save,
      woundsPerModel: data.stats.wounds_per_model,
      leadership: data.stats.leadership,
      objectiveControl: data.stats.objective_control,
    };

    this._weapons = data.weapons.map((w) => new Weapon(w));

    this._models = data.models.map(
      (m) =>
        new Model({
          id: m.id,
          base_size_mm: data.base_size_mm,
          current_wounds: this.datasheetStats.woundsPerModel,
          is_leader: m.is_leader,
        }),
    );

    this.statusFlags = {
      isBattleShocked: false,
      hasMoved: false,
      hasAdvanced: false,
      hasFallenBack: false,
      hasShot: false,
      hasCharged: false,
      hasFought: false,
      remainedStationary: true,
    };
  }

  get models(): readonly Model[] {
    return this._models;
  }

  get weapons(): readonly Weapon[] {
    return this._weapons;
  }

  get modelCount(): number {
    return this._models.length;
  }

  get initialModelCount(): number {
    return this._models.length;
  }

  getAliveModels(): Model[] {
    return this._models.filter((m) => !m.isDestroyed);
  }

  getAliveModelCount(): number {
    return this._models.filter((m) => !m.isDestroyed).length;
  }

  getLeader(): Model | null {
    return this._models.find((m) => m.isLeader && !m.isDestroyed) ?? null;
  }

  getTotalOC(): number {
    if (this.statusFlags.isBattleShocked) {
      return 0;
    }
    return this.getAliveModels().length * this.datasheetStats.objectiveControl;
  }

  isBelowHalfStrength(): boolean {
    const alive = this.getAliveModelCount();
    return alive < this._models.length * UNIT_CONFIG.HALF_STRENGTH_RATIO;
  }

  resetTurnFlags(): void {
    this.statusFlags.hasMoved = false;
    this.statusFlags.hasAdvanced = false;
    this.statusFlags.hasFallenBack = false;
    this.statusFlags.hasShot = false;
    this.statusFlags.hasCharged = false;
    this.statusFlags.hasFought = false;
    this.statusFlags.remainedStationary = true;
  }

  addModel(model: Model): void {
    this._models.push(model);
  }

  removeModel(modelId: string): Model | null {
    const idx = this._models.findIndex((m) => m.id === modelId);
    if (idx === -1) return null;
    const [removed] = this._models.splice(idx, 1);
    return removed;
  }

  findModel(modelId: string): Model | undefined {
    return this._models.find((m) => m.id === modelId);
  }

  hasKeyword(keyword: string): boolean {
    const upper = keyword.toUpperCase();
    return this.keywords.some((k) => k.toUpperCase() === upper);
  }

  toData(): UnitData {
    return {
      unit_id: this.unitId,
      name: this.name,
      faction: this.faction,
      keywords: [...this.keywords],
      stats: {
        movement: this.datasheetStats.movement,
        toughness: this.datasheetStats.toughness,
        save: this.datasheetStats.save,
        invulnerable_save: this.datasheetStats.invulnerableSave,
        wounds_per_model: this.datasheetStats.woundsPerModel,
        leadership: this.datasheetStats.leadership,
        objective_control: this.datasheetStats.objectiveControl,
      },
      base_size_mm: this.baseSizeMm,
      models: this._models.map((m) => ({ id: m.id, is_leader: m.isLeader })),
      weapons: this._weapons.map((w) => w.toData()),
    };
  }
}
