import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    sessionId: string;
  };
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        return res.status(403).json({ error: 'Token non valido o scaduto' });
      }

      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ error: 'Autenticazione richiesta' });
  }
};
