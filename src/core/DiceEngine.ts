// =========================================================================
// ⚙️ MODULE CONFIGURATION & CONSTANTS
// =========================================================================
export const DICE_ENGINE_CONFIG = {
  D6_MIN: 1,
  D6_MAX: 6,
  DEFAULT_RE_ROLL_CONDITION: 'ONES',
} as const;

export type ReRollCondition = 'ONES' | 'FAILURES' | 'ALL';

export interface RollBatchResult {
  rolls: number[];
  successes: number;
  failures: number;
  criticalSuccesses: number;
  criticalFailures: number;
}

// =========================================================================
// 📦 MODULE IMPLEMENTATION
// =========================================================================
export class DiceEngine {
  private rng: () => number;

  constructor(rng?: () => number) {
    this.rng = rng ?? Math.random;
  }

  rollD6(): number {
    const range = DICE_ENGINE_CONFIG.D6_MAX - DICE_ENGINE_CONFIG.D6_MIN + 1;
    return Math.floor(this.rng() * range) + DICE_ENGINE_CONFIG.D6_MIN;
  }

  roll2D6(): number {
    return this.rollD6() + this.rollD6();
  }

  rollBatch(count: number): number[] {
    if (count < 0) {
      throw new Error('DiceEngine.rollBatch: count cannot be negative');
    }
    const result: number[] = [];
    for (let i = 0; i < count; i++) {
      result.push(this.rollD6());
    }
    return result;
  }

  rollBatchWithStats(count: number, target: number): RollBatchResult {
    const rolls = this.rollBatch(count);
    return this.evaluateBatch(rolls, target);
  }

  evaluateBatch(rolls: number[], target: number): RollBatchResult {
    let successes = 0;
    let failures = 0;
    let criticalSuccesses = 0;
    let criticalFailures = 0;

    for (const roll of rolls) {
      const isCritSuccess = roll === DICE_ENGINE_CONFIG.D6_MAX;
      const isCritFailure = roll === DICE_ENGINE_CONFIG.D6_MIN;
      const isSuccess = isCritSuccess || (roll >= target && !isCritFailure);

      if (isCritSuccess) criticalSuccesses++;
      if (isCritFailure) criticalFailures++;
      if (isSuccess) successes++;
      else failures++;
    }

    return { rolls, successes, failures, criticalSuccesses, criticalFailures };
  }

  rerollFailures(
    rolls: number[],
    target: number,
    condition: ReRollCondition = DICE_ENGINE_CONFIG.DEFAULT_RE_ROLL_CONDITION,
  ): number[] {
    const rerolled: number[] = [];

    for (const roll of rolls) {
      let shouldReroll = false;

      switch (condition) {
        case 'ONES':
          shouldReroll = roll === DICE_ENGINE_CONFIG.D6_MIN;
          break;
        case 'FAILURES': {
          const isCritSuccess = roll === DICE_ENGINE_CONFIG.D6_MAX;
          const isCritFailure = roll === DICE_ENGINE_CONFIG.D6_MIN;
          const isSuccess = isCritSuccess || (roll >= target && !isCritFailure);
          shouldReroll = !isSuccess;
          break;
        }
        case 'ALL':
          shouldReroll = true;
          break;
        default:
          shouldReroll = false;
      }

      rerolled.push(shouldReroll ? this.rollD6() : roll);
    }

    return rerolled;
  }
}
