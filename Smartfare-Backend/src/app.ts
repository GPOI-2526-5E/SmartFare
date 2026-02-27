import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import healthRoutes from "./routes/health.route";
import searchRoutes from "./routes/search.route";

export function createApp() {
  const app = express();

  // Security headers con CSP configurato
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "fonts.googleapis.com"],
        fontSrc: ["'self'", "fonts.gstatic.com", "cdn.jsdelivr.net"],
        connectSrc: ["'self'", "localhost:*"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  app.use(cors());
  app.use(express.json());

  // Static
  app.use(express.static(path.join(process.cwd(), "/public")));

  // Route home
  app.get("/", (req, res) => {
    res.sendFile(path.join(process.cwd(), "/public", "index.html"));
  });

  // API Routes
  app.use("/api/health", healthRoutes);
  app.use("/api/search", searchRoutes);

  // Error handling
  app.use((err: any, req: any, res: any, next: any) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}