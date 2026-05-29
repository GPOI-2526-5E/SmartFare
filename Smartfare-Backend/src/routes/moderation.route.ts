import express from 'express';
import path from 'path';
import fs from 'fs';

const router = express.Router();

const TOKENS_PATH = path.join(process.cwd(), 'src', 'services', 'moderation', 'moderation-tokens.json');

router.get('/moderation/tokens', (_req, res) => {
  try {
    if (!fs.existsSync(TOKENS_PATH)) {
      return res.status(404).json({ ok: false, message: 'tokens not found' });
    }
    const raw = fs.readFileSync(TOKENS_PATH, 'utf8');
    const json = JSON.parse(raw);
    // Serve without sensitive meta if needed
    res.json(json);
  } catch (err) {
    console.error('[moderation] failed to read tokens', err);
    res.status(500).json({ ok: false });
  }
});

export default router;
