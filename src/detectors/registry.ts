import type { Detector } from './types.js';
import { nodeDetector } from './node.js';
import { pythonDetector } from './python.js';

// Adding a new ecosystem (Rust/Go/Java/...) is just: write `detectors/<eco>.ts`,
// write `rules/<eco>.json`, and add one entry here.
export const detectorRegistry: Detector[] = [nodeDetector, pythonDetector];
