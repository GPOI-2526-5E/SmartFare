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
import { errorHandler } from "./middleware/error.middleware";


export function createApp() {
  const app = express();

  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false
  }));

  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 500, // limite di 500 richieste ogni 15 minuti
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Troppe richieste. Riprova più tardi.' }
  });
  app.use(globalLimiter);

  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:4200').split(',').map(o => o.trim());
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin && process.env.NODE_ENV !== 'production') return callback(null, true);
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS non autorizzato per origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }));
  app.use(express.json());

  // Static
  app.use(express.static(path.join(process.cwd(), "/public")));

  // Route home
  app.get("/", (req, res) => {
    res.sendFile(path.join(process.cwd(), "/public", "index.html"));
  });

  // API Routes
  app.use("/api/locations", locationsRoutes);
  app.use("/api/itineraries", itineraryRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/activity", activityRoutes);
  app.use("/api/accommodation", accommodationRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/auth", authRoutes);

  // Global Error handling
  app.use(errorHandler);


  return app;
}
