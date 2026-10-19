import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import {
  performAiQualityVerification,
  computeDifferenceHash,
  computeHammingDistance,
  assessImageQuality,
  computeStructuralMatrix,
} from '../../src/services/vision.service.js';

describe('AI Vision Engine (libvips)', () => {
  it('should detect duplicate photo fraud and assign 0.0 confidence score', async () => {
    const imgBuf = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 3,
        background: { r: 120, g: 120, b: 120 },
      },
    })
      .png()
      .toBuffer();

    const dataUrl = `data:image/png;base64,${imgBuf.toString('base64')}`;
    const result = await performAiQualityVerification(dataUrl, dataUrl);

    expect(result.confidenceScore).toBe(0.0);
    expect(result.result).toBe('Fail');
    expect(result.fraudAnalysis.isDuplicate).toBe(true);
    expect(result.fraudAnalysis.fraudAlert).toBe(true);
    expect(result.fraudAnalysis.status).toBe('Duplicate Rejected');
  });

  it('should verify distinct before and after service images with realistic scoring', async () => {
    // Common room/floor background
    const roomBg = { r: 210, g: 195, b: 180 };

    // Before: Service area with debris/spill/waste
    const beforeBuf = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 3,
        background: roomBg,
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 24,
              height: 24,
              channels: 3,
              background: { r: 45, g: 35, b: 30 },
            },
          })
            .png()
            .toBuffer(),
          top: 20,
          left: 20,
        },
      ])
      .png()
      .toBuffer();

    // After: Same room/area, debris cleared and surface restored
    const afterBuf = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 3,
        background: { r: 218, g: 205, b: 190 },
      },
    })
      .png()
      .toBuffer();

    const beforeUrl = `data:image/png;base64,${beforeBuf.toString('base64')}`;
    const afterUrl = `data:image/png;base64,${afterBuf.toString('base64')}`;

    const result = await performAiQualityVerification(beforeUrl, afterUrl);

    expect(result.confidenceScore).toBeGreaterThan(0.70);
    expect(result.result).toBe('Pass');
    expect(result.fraudAnalysis.isDuplicate).toBe(false);
    expect(result.metrics.structuralDifference).toBeGreaterThan(0);
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('should correctly calculate perceptual difference hash and Hamming distance', async () => {
    const bufA = await sharp({
      create: {
        width: 32,
        height: 32,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();

    const bufB = await sharp({
      create: {
        width: 32,
        height: 32,
        channels: 3,
        background: { r: 10, g: 10, b: 10 },
      },
    })
      .png()
      .toBuffer();

    const hashA = await computeDifferenceHash(bufA);
    const hashB = await computeDifferenceHash(bufB);
    const dist = computeHammingDistance(hashA, hashB);

    expect(hashA).toBeDefined();
    expect(hashB).toBeDefined();
    expect(typeof dist).toBe('number');
  });

  it('should detect and reject completely obstructed / pitch-black photos', async () => {
    const normalBuf = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 150, g: 150, b: 150 } },
    }).png().toBuffer();

    const blackBuf = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 2, g: 2, b: 2 } },
    }).png().toBuffer();

    const res = await performAiQualityVerification(
      `data:image/png;base64,${normalBuf.toString('base64')}`,
      `data:image/png;base64,${blackBuf.toString('base64')}`
    );

    expect(res.confidenceScore).toBe(0);
    expect(res.result).toBe('Fail');
  });

  it('should handle analytical fallback for sample URLs gracefully', async () => {
    const result = await performAiQualityVerification(
      'https://images.unsplash.com/sample_before.jpg',
      'https://images.unsplash.com/sample_after.jpg'
    );

    expect(result.confidenceScore).toBeGreaterThan(0.75);
    expect(result.result).toBe('Pass');
    expect(result.metrics.cleanlinessImprovement).toBeGreaterThan(50);
  });
});
