import type { Ecosystem, Finding } from '../core/types.js';
import { detectorRegistry } from './registry.js';
import type { Detector, DetectorContext } from './types.js';

export interface CollectOptions {
  ecosystems?: Ecosystem[];
}

export interface CollectResult {
  findings: Finding[];
  errors: string[];
}

// `detectors` defaults to the real registry so callers never need to pass it;
// tests override it with fakes to exercise collection/error logic in isolation.
export function collectFindings(
  ctx: DetectorContext,
  options: CollectOptions = {},
  detectors: Detector[] = detectorRegistry,
): CollectResult {
  const findings: Finding[] = [];
  const errors: string[] = [];
  const activeDetectors = options.ecosystems
    ? detectors.filter((detector) => options.ecosystems!.includes(detector.ecosystem))
    : detectors;

  for (const detector of activeDetectors) {
    try {
      findings.push(...detector.detect(ctx));
    } catch (error) {
      errors.push(`[${detector.ecosystem}] ${(error as Error).message}`);
    }
  }

  return { findings, errors };
}
