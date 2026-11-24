import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { app } from './server/app.ts';
import { getStore } from './server/dataAdapter.ts';

async function startServer() {
  const PORT = 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Ensure database schema and seed records exist at startup
  const store = await getStore();
  console.log(`[Kytura Naturals] Active database backend: ${store.mode}`);

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kytura Naturals server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
