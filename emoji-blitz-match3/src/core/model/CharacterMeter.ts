import { CHARACTER_CHARGE_PER_HERO_CLEAR } from '../../config/constants';

/** Secondary meter charged by clearing the active hero emoji. Does not decay. */
export class CharacterMeter {
  private value = 0;
  private readonly chargePerClear: number;

  constructor(chargePerClear = CHARACTER_CHARGE_PER_HERO_CLEAR) {
    this.chargePerClear = chargePerClear;
  }

  get percent(): number {
    return this.value;
  }

  get isReady(): boolean {
    return this.value >= 100;
  }

  addHeroClears(count: number): void {
    if (count <= 0) return;
    this.value = Math.min(100, this.value + count * this.chargePerClear);
  }

  /** @returns true if successfully consumed */
  tryConsume(): boolean {
    if (!this.isReady) return false;
    this.value = 0;
    return true;
  }

  reset(): void {
    this.value = 0;
  }
}
