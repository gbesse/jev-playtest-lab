import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDecisionRequest, fakeResponse, LoopGuard, parseDecision } from '../src/core.js';

const observation = { runId: 'r', step: 1, revision: 4, goal: 'finish', state: { x: 1 }, legalActions: [{ id: 'go', label: 'Go', simulatedOutcome: { progress: 1 } }, { id: 'wait', label: 'Wait' }] };

test('request exposes only declared legal actions', () => assert.deepEqual(Object.keys(buildDecisionRequest(observation).questions.action.criteria), ['go', 'wait']));
test('stale revisions never execute', () => assert.equal(parseDecision(fakeResponse(observation), observation, { currentRevision: 5 }).status, 'stale'));
test('fake decision selects code-owned best simulated progress', () => assert.equal(parseDecision(fakeResponse(observation), observation).actionId, 'go'));
test('loop guard detects repeated state-action pairs', () => { const guard = new LoopGuard({ maxRepeats: 2 }); assert.equal(guard.inspect(observation, 'go').loop, false); assert.equal(guard.inspect(observation, 'go').loop, true); });
test('invented actions are rejected', () => assert.equal(parseDecision({ answers: { action: { choice: 'hack', confidence: 1 }, safe_to_execute: { type: 'noul', noul: 1 } } }, observation).reason, 'non_legal_action'));
