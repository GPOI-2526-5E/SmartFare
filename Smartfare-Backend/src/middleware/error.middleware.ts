import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
    constructor(
        public message: string,
        public statusCode: number = 500,
        public details?: any
    ) {
        super(message);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error(`[Error] ${err.message}`, err);

    if (err instanceof ZodError) {
        return res.status(400).json({
            error: "Errore di validazione",
            details: err.issues.map((e: any) => ({
                path: e.path.join('.'),
                message: e.message
            }))
        });
    }

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: err.message,
            details: err.details
        });
    }

    // Default error
    res.status(500).json({
        error: "Errore interno del server"
    });
};
