import cluster from 'cluster';
import os from 'os';
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

if (cluster.isMaster) {
  const numWorkers = Math.max(1, os.cpus().length - 1);
  const workers: { port: number; proc: cluster.Worker }[] = [];
  const dbState = new Map<string, any>();

  for (let i = 0; i < numWorkers; i++) {
    const workerEnv = { ...process.env, PORT: String(PORT + 1 + i), WORKER_INDEX: String(i) };
    const worker = cluster.fork(workerEnv);
    workers.push({ port: PORT + 1 + i, proc: worker });

    worker.on('message', (msg: any) => {
      if (!msg || !msg.type) return;
      if (msg.type === 'getState') {
        worker.send({ type: 'state', state: Array.from(dbState.entries()) });
      } else if (msg.type === 'create') {
        dbState.set(msg.payload.id, msg.payload);
        for (const w of Object.values(cluster.workers || {})) w?.send({ type: 'stateUpdate', action: 'create', payload: msg.payload });
      } else if (msg.type === 'update') {
        dbState.set(msg.payload.id, msg.payload);
        for (const w of Object.values(cluster.workers || {})) w?.send({ type: 'stateUpdate', action: 'update', payload: msg.payload });
      } else if (msg.type === 'delete') {
        dbState.delete(msg.payload.id);
        for (const w of Object.values(cluster.workers || {})) w?.send({ type: 'stateUpdate', action: 'delete', payload: msg.payload });
      } else if (msg.type === 'clear') {
        dbState.clear();
        for (const w of Object.values(cluster.workers || {})) w?.send({ type: 'stateUpdate', action: 'clear' });
      }
    });
  }

  // load balancer proxy
  const http = require('http');
  const httpProxy = require('http-proxy');
  const proxy = httpProxy.createProxyServer({});
  let idx = 0;

  const server = http.createServer((req: any, res: any) => {
    if (workers.length === 0) {
      res.writeHead(500);
      res.end('No workers');
      return;
    }
    const target = `http://127.0.0.1:${workers[idx].port}`;
    idx = (idx + 1) % workers.length;
    proxy.web(req, res, { target }, (e: any) => {
      res.writeHead(502);
      res.end('Bad gateway');
    });
  });

  server.listen(PORT, () => {
    console.log(`Load balancer listening on port ${PORT}, forwarding to workers on ports ${workers.map(w => w.port).join(', ')}`);
  });

  process.on('SIGINT', () => {
    server.close();
    for (const w of Object.values(cluster.workers || {})) w?.kill();
    process.exit(0);
  });
} else {
  
  import('./index').catch((err) => {
    console.error('Worker failed to start', err);
    process.exit(1);
  });
}
