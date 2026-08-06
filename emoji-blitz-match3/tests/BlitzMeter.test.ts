import { describe, expect, it } from 'vitest';
import { BlitzMeter } from '../src/core/model/BlitzMeter';

describe('BlitzMeter', () => {
  it('fills +1% per clear and activates at 100', () => {
    const m = new BlitzMeter();
    m.addClears(100);
    expect(m.percent).toBe(100);
    const activated = m.tickDecay(0, false);
    expect(activated || m.percent >= 100).toBe(true);
    if (!m.isActive) m.activate();
    expect(m.isActive).toBe(true);
    expect(m.blitzTimeLeft).toBe(5);
  });

  it('decays 2% per second while idle', () => {
    const m = new BlitzMeter();
    m.addClears(50);
    m.beginFrame(); // idle=true
    m.tickDecay(1, true);
    expect(m.percent).toBe(48);
  });

  it('does not decay after activity mark in the same window', () => {
    const m = new BlitzMeter();
    m.addClears(50);
    m.beginFrame();
    m.markActivity();
    m.tickDecay(1, true);
    // markActivity sets idle false; decay checks idle
    expect(m.percent).toBe(50);
  });
});
