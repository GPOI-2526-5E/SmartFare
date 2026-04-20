import { Router, Request, Response } from "express";
import { AuthService } from '../services/auth/auth.service';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

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
router.post("/login", authLimiter, async (req: Request, res: Response) => {
    try {        
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                error: "Dati non validi"
            });
        }
        const result = await authService.Login({ email, password });

        if (!result.success) {
            return res.status(401).json(result);
        }

        return res.status(200).json(result);
    } catch (error: any) {
        console.log("❌ Errore nel server durante il login");
        return res.status(500).json({
            error: "Errore durante il login"
        });
    }
});

// ─── POST /auth/register ──────────────────────────────────────────────────────
router.post("/register", authLimiter, async (req: Request, res: Response) => {
    try {
        
        const { email, password, name, surname, avatarUrl} = req.body;
        
        if (!email || !password || !name || !surname || !avatarUrl) {
            return res.status(400).json({
                error: "Dati non validi",
            });
        }
        const result = await authService.Register({
            email,
            password,
            name,
            surname,
            avatarUrl
        });

        if (!result.success) {
            // 409 Conflict per email già esistente, 400 per altri errori
            const status = result.message === 'Email già esistente' ? 409 : 400;
            return res.status(status).json(result);
        }

        return res.status(201).json(result);
    } catch (error: any) {
        console.log("❌ Errore nel server durante la registrazione");
        return res.status(500).json({
            error: "Errore durante la registrazione"
        });
    }
});

// ─── POST /auth/google ────────────────────────────────────────────────────────
router.post("/google", authLimiter, async (req: Request, res: Response) => {
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
    } catch (error: any) {
        console.log("❌ Errore nel server durante il login Google");
        return res.status(500).json({
            error: "Errore durante il login con Google"
        });
    }
});

router.get('/user', async (req: Request, res: Response) => {

});

export default router;