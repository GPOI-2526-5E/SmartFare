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

  app.use(cors());
  app.use(express.json());

  // Middleware
  app.use("/", (req, res, next) => {
    const parts = [`RICHIESTA: ${req.method} - ${req.url}`];

    if (req.query && Object.keys(req.query).length > 0) {
      parts.push(`query: ${JSON.stringify(req.query)}`);
    }

    if (req.body && Object.keys(req.body).length > 0) {
      parts.push(`body: ${JSON.stringify(req.body)}`);
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
  app.use("/auth", authRoutes);

  // Error handling
  app.use((err: any, req: any, res: any, next: any) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
  
  return app;
}
