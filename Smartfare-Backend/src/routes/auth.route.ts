import { Router, Request, Response, NextFunction } from "express";
import { AuthService } from '../services/auth/auth.service';
import rateLimit from 'express-rate-limit';
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from "../schemas/auth.schema";


const router = Router();
const authService = new AuthService();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Troppi tentativi. Riprova tra 15 minuti.'
    }
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────
router.post("/login", authLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const body = loginSchema.parse(req.body);
        const result = await authService.Login(body);

        if (!result.success) {
            return res.status(401).json(result);
        }

        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

// ─── POST /auth/register ──────────────────────────────────────────────────────
router.post("/register", authLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const body = registerSchema.parse(req.body);
        const result = await authService.Register(body);

        if (!result.success) {
            const status = result.message === 'Email già esistente' ? 409 : 400;
            return res.status(status).json(result);
        }

        return res.status(201).json(result);
    } catch (error) {
        next(error);
    }
});

// ─── POST /auth/google ────────────────────────────────────────────────────────
router.post("/google", authLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { idToken } = req.body;

        if (!idToken || typeof idToken !== 'string') {
            return res.status(400).json({
                error: "Token mancante o non valido",
            });
        }

        const result = await authService.GoogleLogin(idToken);

        if (!result.success) {
            return res.status(401).json(result);
        }

        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

// ─── POST /auth/forgot-password ───────────────────────────────────────────────
router.post("/forgot-password", authLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = forgotPasswordSchema.parse(req.body);
        const result = await authService.ForgotPassword(email);

        if (!result.success) {
            return res.status(500).json(result);
        }

        return res.status(200).json({ success: true, message: "Se l'email è registrata, riceverai un link per il reset" });
    } catch (error) {
        next(error);
    }
});

// ─── POST /auth/reset-password ────────────────────────────────────────────────
router.post("/reset-password", authLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const body = resetPasswordSchema.parse(req.body);
        const result = await authService.ResetPassword(body);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({ success: true, message: "Password aggiornata con successo" });
    } catch (error) {
        next(error);
    }
});

export default router;