import express from 'express';
import moderationTokens from '../services/moderation/moderation-tokens.json';

const router = express.Router();

router.get('/moderation/tokens', (_req, res) => {
  try {
    res.json(moderationTokens);
  } catch (err) {
    console.error('[moderation] failed to read tokens', err);
    res.status(500).json({ ok: false });
  }
});

export default router;
