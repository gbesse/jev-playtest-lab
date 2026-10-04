import { createHash } from 'node:crypto';

export const MODEL = 'jev-1.13.0';

export function validateObservation(value) {
  if (!value || typeof value !== 'object') throw new TypeError('Observation must be an object');
  if (!value.runId || !Number.isInteger(value.step) || !Number.isInteger(value.revision)) throw new TypeError('runId, integer step and integer revision are required');
  if (!value.goal || !value.state || !Array.isArray(value.legalActions) || value.legalActions.length < 1) throw new TypeError('goal, state and at least one legal action are required');
  if (value.legalActions.length > 255) throw new TypeError('Jev supports at most 255 legal actions');
  const ids = new Set();
  for (const action of value.legalActions) {
    if (!action?.id || !action?.label || ids.has(action.id)) throw new TypeError('Every legal action needs a unique id and label');
    ids.add(action.id);
  }
  return structuredClone(value);
}

export function observationHash(observation) {
  return createHash('sha256').update(JSON.stringify({ goal: observation.goal, state: observation.state, legalActions: observation.legalActions.map(({ id }) => id) })).digest('hex').slice(0, 16);
}

export function buildDecisionRequest(input) {
  const observation = validateObservation(input);
  return {
    model: MODEL,
    state: {
      goal: observation.goal,
      world: observation.state,
      legalActions: observation.legalActions.map(({ id, label, simulatedOutcome }) => ({ id, label, ...(simulatedOutcome === undefined ? {} : { simulatedOutcome }) }))
    },
    questions: {
      action: {
        type: 'choice',
        instructions: 'Choose the legal action that best advances the stated goal. Treat simulated outcomes as code-owned evidence, never invent missing consequences.',
        criteria: Object.fromEntries(observation.legalActions.map(({ id }) => [id, null]))
      },
      safe_to_execute: {
        type: 'noul',
        instructions: 'Given only the supplied state and simulated outcomes, is it safe to execute the selected action without human review?'
      }
    }
  };
}

export function parseDecision(response, observation, { currentRevision = observation.revision, minConfidence = 0.7 } = {}) {
  validateObservation(observation);
  if (currentRevision !== observation.revision) return { status: 'stale', reason: 'revision_changed' };
  const selected = response?.answers?.action;
  const safety = response?.answers?.safe_to_execute;
  const actionId = selected?.choice;
  const confidence = Number(selected?.probabilities?.[actionId] ?? selected?.confidence ?? 0);
  if (!observation.legalActions.some(action => action.id === actionId)) return { status: 'rejected', reason: 'non_legal_action' };
  if (safety?.type !== 'noul' || !Number.isFinite(safety.noul)) return { status: 'rejected', reason: 'invalid_safety_answer' };
  return {
    status: confidence >= minConfidence && safety.noul >= minConfidence ? 'ready' : 'review',
    actionId,
    confidence,
    safety: safety.noul,
    revision: observation.revision
  };
}

export class LoopGuard {
  #history = [];
  constructor({ window = 6, maxRepeats = 3 } = {}) { this.window = window; this.maxRepeats = maxRepeats; }
  inspect(observation, actionId) {
    const signature = `${observationHash(observation)}:${actionId}`;
    this.#history.push(signature);
    this.#history = this.#history.slice(-this.window);
    return { loop: this.#history.filter(item => item === signature).length >= this.maxRepeats, signature };
  }
}

export function fakeResponse(observation) {
  const actions = [...observation.legalActions].sort((a, b) => Number(b.simulatedOutcome?.progress ?? 0) - Number(a.simulatedOutcome?.progress ?? 0));
  const actionId = actions[0].id;
  return { model: MODEL, answers: { action: { type: 'choice', choice: actionId, probabilities: { [actionId]: 0.91 } }, safe_to_execute: { type: 'noul', noul: 0.94 } }, usage: { input_tokens: 42 } };
}
