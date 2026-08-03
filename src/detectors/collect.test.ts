import { describe, expect, it, vi } from 'vitest';
import { collectFindings } from './collect.js';
import type { Detector } from './types.js';
import { DetectorError } from './types.js';

const okDetector: Detector = {
  ecosystem: 'node',
  detect: () => [{ ecosystem: 'node', kind: 'manifestPresence', name: 'package.json' }],
};

const failingDetector: Detector = {
  ecosystem: 'python',
  detect: () => {
    throw new DetectorError('boom');
  },
};

describe('collectFindings', () => {
  it('aggregates findings across all registered detectors', () => {
    const result = collectFindings({ cwd: '/irrelevant' }, {}, [okDetector]);

    expect(result.findings).toEqual([
      { ecosystem: 'node', kind: 'manifestPresence', name: 'package.json' },
    ]);
    expect(result.errors).toEqual([]);
  });

  it('turns a failing detector into an error and continues with the rest', () => {
    const result = collectFindings({ cwd: '/irrelevant' }, {}, [okDetector, failingDetector]);

    expect(result.findings).toEqual([
      { ecosystem: 'node', kind: 'manifestPresence', name: 'package.json' },
    ]);
    expect(result.errors).toEqual(['[python] boom']);
  });

  it('restricts detection to the requested ecosystems', () => {
    const detectSpy = vi.fn(() => []);
    const spiedDetector: Detector = { ecosystem: 'python', detect: detectSpy };

    collectFindings({ cwd: '/irrelevant' }, { ecosystems: ['node'] }, [okDetector, spiedDetector]);
    expect(detectSpy).not.toHaveBeenCalled();
  });
});
