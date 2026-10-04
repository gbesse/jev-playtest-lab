import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { buildDecisionRequest, fakeResponse, LoopGuard, parseDecision, validateObservation } from './core.js';

export class PlaytestLab {
  constructor({ provider, mode = 'shadow', minConfidence = 0.7, recordPath = 'local-data/runs.jsonl' } = {}) {
    if (!['shadow', 'assist', 'autopilot'].includes(mode)) throw new TypeError('mode must be shadow, assist or autopilot');
    this.provider = provider ?? (async (_request, observation) => fakeResponse(observation));
    this.mode = mode;
    this.minConfidence = minConfidence;
    this.recordPath = recordPath;
    this.guard = new LoopGuard();
  }

  async observe(raw, { currentRevision } = {}) {
    const observation = validateObservation(raw);
    const startedAt = Date.now();
    const response = await this.provider(buildDecisionRequest(observation), observation);
    const decision = parseDecision(response, observation, { currentRevision: currentRevision ?? observation.revision, minConfidence: this.minConfidence });
    const loop = decision.actionId ? this.guard.inspect(observation, decision.actionId) : { loop: false };
    const executable = this.mode === 'autopilot' && decision.status === 'ready' && !loop.loop;
    const record = { recordedAt: new Date().toISOString(), observation, decision: { ...decision, loop: loop.loop, executable }, model: response.model, usage: response.usage, latencyMs: Date.now() - startedAt };
    await mkdir(dirname(this.recordPath), { recursive: true });
    await appendFile(this.recordPath, `${JSON.stringify(record)}\n`, { mode: 0o600 });
    return record;
  }
}
