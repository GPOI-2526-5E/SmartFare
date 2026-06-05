import express from "express";
import cors from "cors";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.route";
import locationsRoutes from './routes/location.route';
import itineraryRoutes from './routes/itinerary.route';
import aiRoutes from './routes/ai.route';
import activityRoutes from './routes/activity.route';
import accommodationRoutes from './routes/accommodation.route';
import uploadRoutes from './routes/upload.route';
import chatRoutes from './routes/chat.route';
import profileRoutes from './routes/profile.route';
import followRoutes from './routes/follow.route';
import moderationRoute from './routes/moderation.route';
import { errorHandler } from "./middleware/error.middleware";
import { contentModerationMiddleware } from './middleware/content-moderation.middleware';


export function createApp() {
  const app = express();
  const startedAt = Date.now();

  // Required behind Render/other reverse proxies for correct client IP and rate-limiting.
  app.set('trust proxy', 1);

  app.use((req, res, next) => {
    const requestStartedAt = Date.now();
    const requestId = `${requestStartedAt}-${Math.random().toString(36).slice(2, 8)}`;
    (req as express.Request & { requestId?: string }).requestId = requestId;

    console.info(`[REQ] ${requestId} ${req.method} ${req.originalUrl} ip=${req.ip} ua=${req.get('user-agent') || 'n/a'}`);

    res.on('finish', () => {
      const durationMs = Date.now() - requestStartedAt;
      console.info(`[RES] ${requestId} ${req.method} ${req.originalUrl} status=${res.statusCode} durationMs=${durationMs}`);
    });

    next();
  });

  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false
  }));

  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
   skip: (req) => {
      // 1. Escludi sempre le richieste preflight CORS (OPTIONS)
      if (req.method === 'OPTIONS') return true;

      // 2. ECCEZIONE ANDROID (Sia tramite User-Agent che tramite IP dell'emulatore)
      const userAgent = req.get('user-agent') || '';
      const clientIp = req.ip || '';

      if (
        userAgent.toLowerCase().includes('android') || 
        clientIp.includes('10.0.2.2') || 
        clientIp.includes('::ffff:10.0.2.2')
      ) {
        console.info(`[RATE-LIMIT] Richiesta esentata per dispositivo Android/Emulatore. IP: ${clientIp}`);
        return true; // Salta il controllo del rate limit
      }

      return false; // Applica il limite normalmente a tutti gli altri (Browser/Sito web)
    },
    message: { error: 'Troppe richieste. Riprova più tardi.' }
  });
  app.use(globalLimiter);

  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:4200')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
    
  allowedOrigins.push('https://localhost');
  const allowVercelPreviewOrigins = process.env.ALLOW_VERCEL_PREVIEW_ORIGINS === 'true';
  const vercelPreviewRegex = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin && process.env.NODE_ENV !== 'production') return callback(null, true);
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      if (allowVercelPreviewOrigins && origin && vercelPreviewRegex.test(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS non autorizzato per origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(contentModerationMiddleware);

  // Static
  app.use(express.static(path.join(process.cwd(), "/public")));

  // Route home
  app.get("/", (req, res) => {
    res.sendFile(path.join(process.cwd(), "/public", "index.html"));
  });

  // Health endpoint for Render checks
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  console.info(`[BOOT] Backend initialized in ${Date.now() - startedAt}ms`);

  // API Routes
  app.use("/api/locations", locationsRoutes);
  app.use("/api/itineraries", itineraryRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/activity", activityRoutes);
  app.use("/api/accommodation", accommodationRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/profile", profileRoutes);
  app.use("/api/follow", followRoutes);
  app.use("/auth", authRoutes);

  // Cloudinary webhook (removed image moderation)

  // Public moderation tokens (for frontend sync)
  app.use('/public', moderationRoute);

  // Global Error handling
  app.use(errorHandler);

  return app;
}
