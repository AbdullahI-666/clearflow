import { describe, it, expect } from 'vitest';
import { haversineDistance } from '../../src/utils/haversine.js';

describe('Haversine Distance Calculator', () => {
  it('should calculate 0 km for identical coordinates', () => {
    const dist = haversineDistance(31.5204, 74.3587, 31.5204, 74.3587);
    expect(dist).toBeCloseTo(0, 1);
  });

  it('should calculate correct distance between Lahore points', () => {
    // Distance between Gulberg (31.5204, 74.3587) and DHA Phase 5 (31.4697, 74.4101) ~ 7.5km
    const dist = haversineDistance(31.5204, 74.3587, 31.4697, 74.4101);
    expect(dist).toBeGreaterThan(5);
    expect(dist).toBeLessThan(12);
  });
});
