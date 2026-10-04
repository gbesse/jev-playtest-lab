#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { PlaytestLab } from './lab.js';
import { callTypeSafe } from './client.js';

const fixture = {
  runId: 'gridworld-demo', step: 7, revision: 7, goal: 'Reach the exit without taking damage',
  state: { room: 'west_hall', health: 3, exit: 'north' },
  legalActions: [
    { id: 'north', label: 'Open the north door', simulatedOutcome: { progress: 0.9, damageRisk: 0.05 } },
    { id: 'east', label: 'Enter the east room', simulatedOutcome: { progress: 0.3, damageRisk: 0.6 } },
    { id: 'wait', label: 'Wait', simulatedOutcome: { progress: 0, damageRisk: 0 } }
  ]
};

async function demo() {
  const lab = new PlaytestLab({ mode: 'autopilot' });
  const result = await lab.observe(fixture);
  console.log(JSON.stringify(result, null, 2));
}

async function serve() {
  const live = process.argv.includes('--live');
  const lab = new PlaytestLab({ mode: process.env.JEV_PLAYTEST_MODE ?? 'shadow', provider: live ? request => callTypeSafe(request) : undefined });
  const server = createServer(async (request, response) => {
    if (request.method === 'GET' && request.url === '/') {
      const html = await readFile(new URL('../web/index.html', import.meta.url));
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html);
      return;
    }
    if (request.method === 'POST' && request.url === '/v1/observe') {
      try {
        let body = '';
        for await (const chunk of request) { body += chunk; if (body.length > 256_000) throw new Error('body too large'); }
        const record = await lab.observe(JSON.parse(body));
        response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(record));
      } catch (error) {
        response.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error: error.message }));
      }
      return;
    }
    response.writeHead(404).end();
  });
  server.listen(Number(process.env.PORT ?? 8798), '127.0.0.1', () => console.log('Jev Playtest Lab: http://127.0.0.1:8798'));
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const command = process.argv[2] ?? 'demo';
  if (command === 'demo') await demo();
  else if (command === 'serve') await serve();
  else throw new Error(`Unknown command: ${command}`);
}
