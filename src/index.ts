/**
 * @deprecated — legacy local proxy (Pages era).
 * Naudok `npx wrangler dev --cwd web` (Workers su ASSETS) vietoj `npm run dev`.
 * Paliktas laikinai dev patogumui, bet nebedalyvauja production deploy.
 */
import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3000;
const WORKER_URL = process.env.WORKER_URL || 'https://api.reforgermods.com';

app.use(cors());
app.use(express.json());

// Proxy all requests to Cloudflare Worker (JSON Source)
app.all('*', async (req, res) => {
  const url = `${WORKER_URL}${req.originalUrl}`;
  console.log(`[Local Proxy] Fetching from JSON source: ${url}`);

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('[Proxy Error]', error);
    res.status(502).json({ error: 'Failed to fetch from JSON source' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Local JSON-Only Dev Server: http://localhost:${PORT}`);
  console.log(`📡 Mirroring data from: ${WORKER_URL}`);
});
