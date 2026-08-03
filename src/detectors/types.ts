import type { Ecosystem, Finding } from '../core/types.js';

export interface DetectorContext {
  cwd: string;
}

export interface Detector {
  ecosystem: Ecosystem;
  detect(ctx: DetectorContext): Finding[];
}

export class DetectorError extends Error {}
