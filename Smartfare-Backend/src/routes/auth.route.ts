import { Router, Request, Response } from "express";
import { AuthService } from '../services/auth/auth.service';

const router = Router();

const authService = new AuthService();

router.post("/login", async (req: Request, res: Response) => {

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: "Parametri mancanti",
            });
        }

        const result = await authService.Login({ email, password });

        if (!result.success) {
            return res.status(401).json(result);
        }

        return res.status(200).json(result);
    } catch (error: any) {
        console.log("❌ Errore nel server: ", error);
        return res.status(500).json({
            error: "Errore durante il login",
            message: error.message
        });
    }
});

router.post("/register", async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: "Parametri mancanti",
            });
        }

        const result = await authService.Register({ email, password });

        if (!result.success) {
            return res.status(401).json(result);
        }

        return res.status(200).json(result);
    } catch (error: any) {
        console.log("❌ Errore nel server: ", error);
        return res.status(500).json({
            error: "Errore durante il login",
            message: error.message
        });
    }
});

router.get('/user', async (req: Request, res: Response) => {

});

export default router;