import express from "express";
import cors from "cors";
import path from "path";
import trainsRoute from "./routes/trains.route";
import authRoutes from "./routes/auth.route";
import flightsRoutes from './routes/flights.route';
import locationsRoutes from './routes/location.route';
import hotelsRoutes from './routes/hotel.route';

export function createApp() {
  const app = express();

  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:4200').split(',').map(o => o.trim());
  app.use(cors({
    origin: (origin, callback) => {
      // Permetti richieste senza origin (es. Postman, server-to-server) solo in sviluppo
      if (!origin && process.env.NODE_ENV !== 'production') return callback(null, true);
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS non autorizzato per origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }));
  app.use(express.json());

  // Middleware
  app.use("/", (req, res, next) => {
    const parts = [`RICHIESTA: ${req.method} - ${req.url}`];

    if (req.query && Object.keys(req.query).length > 0) {
      parts.push(`query: ${JSON.stringify(req.query)}`);
    }

    if (req.body && Object.keys(req.body).length > 0) {
      const safeBody = { ...req.body };
      if (safeBody.password) safeBody.password = '[REDACTED]';
      if (safeBody.idToken) safeBody.idToken = '[REDACTED]';
      parts.push(`body: ${JSON.stringify(safeBody)}`);
    }

    console.log(parts.join(" - "));
    next();
  });

  // Static
  app.use(express.static(path.join(process.cwd(), "/public")));

  // Route home
  app.get("/", (req, res) => {
    res.sendFile(path.join(process.cwd(), "/public", "index.html"));
  });

  // API Routes
  app.use("/api/locations", locationsRoutes);
  app.use("/api/hotels", hotelsRoutes);
  app.use("/api/trains", trainsRoute);
  app.use("/api/flights", flightsRoutes);
  app.use("/auth", authRoutes);

  // Error handling
  app.use((err: any, req: any, res: any, next: any) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
  
  return app;
}
