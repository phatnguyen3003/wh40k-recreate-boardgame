// =========================================================================
// ⚙️ MODULE CONFIGURATION & CONSTANTS
// =========================================================================
export const WEAPON_CONFIG = {
  MELEE_RANGE: 0,
  MIN_AP: 0,
  MAX_AP: -6,
} as const;

export type WeaponType = 'RANGED' | 'MELEE';

export interface WeaponData {
  weapon_id: string;
  name: string;
  type: WeaponType;
  range: number;
  attacks: string;
  skill: number;
  strength: number;
  ap: number;
  damage: string;
  abilities: string[];
}

// =========================================================================
// 📦 MODULE IMPLEMENTATION
// =========================================================================
export class Weapon {
  readonly weaponId: string;
  readonly name: string;
  readonly type: WeaponType;
  readonly range: number;
  readonly attacks: string;
  readonly skill: number;
  readonly strength: number;
  readonly ap: number;
  readonly damage: string;
  readonly abilities: readonly string[];

  constructor(data: WeaponData) {
    this.weaponId = data.weapon_id;
    this.name = data.name;
    this.type = data.type;
    this.range = data.type === 'MELEE' ? WEAPON_CONFIG.MELEE_RANGE : data.range;
    this.attacks = data.attacks;
    this.skill = data.skill;
    this.strength = data.strength;
    this.ap = data.ap;
    this.damage = data.damage;
    this.abilities = Object.freeze([...data.abilities]);
  }

  hasAbility(keyword: string): boolean {
    const upper = keyword.toUpperCase();
    return this.abilities.some((a) => a.toUpperCase() === upper);
  }

  hasAbilityPartial(keyword: string): boolean {
    const upper = keyword.toUpperCase();
    return this.abilities.some((a) => a.toUpperCase().startsWith(upper));
  }

  isRanged(): boolean {
    return this.type === 'RANGED';
  }

  isMelee(): boolean {
    return this.type === 'MELEE';
  }

  toData(): WeaponData {
    return {
      weapon_id: this.weaponId,
      name: this.name,
      type: this.type,
      range: this.range,
      attacks: this.attacks,
      skill: this.skill,
      strength: this.strength,
      ap: this.ap,
      damage: this.damage,
      abilities: [...this.abilities],
    };
  }
}
