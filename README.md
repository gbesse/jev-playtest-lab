# Jev Playtest Lab

Replayable, revision-safe game decisions. **Code simulates. Jev evaluates.** The engine supplies the current world state, a finite list of legal actions, and—when available—code-simulated outcomes. Jev ranks only those actions; the host retains execution authority.

## Run the offline demo

```bash
npm test
npm run demo
npm run serve
```

Open `http://127.0.0.1:8798`, then run the sample observation. No account or API key is used. Pass `--live` and set `TYPESAFE_API_KEY` only for live inference.

## Contract

`POST /v1/observe` accepts `{ runId, step, revision, goal, state, legalActions }`. Each action needs a unique `id` and `label`; an optional `simulatedOutcome` is evidence produced by code. Records are appended to `local-data/runs.jsonl` for replay and audit.

The runtime supports `shadow`, `assist`, and `autopilot`. Autopilot executes nothing itself: it marks a decision executable only when the revision still matches, the chosen action is legal, confidence and safety clear the threshold, and the loop guard is quiet. The engine must check revision again at its own execution boundary.

The Unity adapter is intentionally thin. The HTTP protocol is engine-neutral so Unreal, Godot, Bevy and Roblox adapters can share the same lab.

## Boundaries

This is an experimental community integration, not an autonomous-agent framework. It does not make arbitrary plans, simulate hidden consequences, or grant Jev direct engine access. Never ship a TypeSafe key in a game client. Use a trusted gateway, authentication, rate limits and TLS for remote or multiplayer deployments.

MIT licensed. See [SECURITY.md](SECURITY.md) and [CONTRIBUTING.md](CONTRIBUTING.md).
