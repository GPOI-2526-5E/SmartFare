import express from "express";
import cors from "cors";
import path from "path";
import healthRoutes from "./routes/health.route";
import searchRoutes from "./routes/search.route";
import authRoutes from "./routes/auth.route";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/", (req, res, next) => {
    console.log("RICHIESTA: " + req.method + " - " + req.url);
    next();
  });

  // Static
  app.use(express.static(path.join(process.cwd(), "/public")));

  // Route home
  app.get("/", (req, res) => {
    res.sendFile(path.join(process.cwd(), "/public", "index.html"));
  });

  // API Routes
  app.use("/api/health", healthRoutes);
  app.use("/api/search", searchRoutes);
  app.use("/auth", authRoutes);

  // Error handling
  app.use((err: any, req: any, res: any, next: any) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
  
  return app;
}