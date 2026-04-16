import prisma from "../../lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { RegisterData } from "../../models/auth.model";
import { LoginParams } from "../../models/auth.model";
import { OAuth2Client } from "google-auth-library";

const JWT_SECRET: string = process.env.JWT_SECRET || "";
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "";

export class AuthService {

    async Login(loginData: LoginParams) {
        try {
            const { email, password } = loginData;

            const user = await prisma.user.findUnique({
                where: { email },
                select: {
                    userId: true,
                    email: true,
                    passwordHash: true,
                    sessionId: true,
                    userData: {
                        select: {
                            avatarUrl: true
                        }
                    }
                }
            });

            if (!user) {
                return {
                    success: false,
                    message: "Credenziali non valide",
                };
            }

            if (!user.passwordHash) {
                return {
                    success: false,
                    message: "Account configurato per accesso tramite provider esterno",
                };
            }

            const verificaPassword = await bcrypt.compare(password, user.passwordHash);

            if (!verificaPassword) {
                return {
                    success: false,
                    message: "Credenziali non valide",
                };
            }

            const sessionId = randomUUID();
            console.log("Nuovo sessionId generato per " + user.email);

            await prisma.user.update({
                where: { userId: user.userId },
                data: { sessionId }
            });

            const token = jwt.sign(
                {
                    userId: user.userId,
                    email: user.email,
                    username: user.email,
                    sessionId: sessionId,
                    avatarUrl: user.userData?.avatarUrl
                },
                JWT_SECRET,
                {
                    expiresIn: JWT_EXPIRES_IN,
                } as jwt.SignOptions
            );

            return {
                success: true,
                token
            };

        } catch (error) {
            console.log("❌ Errore durante il login: ", error);
            return {
                success: false,
                message: "Errore durante il login",
            };
        }
    }

    async Register(registerData: RegisterData) {
        try {
            const existingUser = await prisma.user.findUnique({
                where: { email: registerData.email },
                select: { userId: true }
            });

            if (existingUser) {
                console.log("Email già esistente");
                return {
                    success: false,
                    message: "Email già esistente"
                };
            }

            console.log("DATI REGISTRAZIONE RICEVUTI:", JSON.stringify(registerData, null, 2));

            const hashedPassword = await bcrypt.hash(registerData.password, 10);
            
            // If registering after Google pre-fill, keep google as provider
            const provider = registerData.avatarUrl ? "google" : "local";

            await prisma.user.create({
                data: {
                    email: registerData.email,
                    passwordHash: hashedPassword,
                    authProvider: provider,
                    userData: {
                        create: {
                            name: registerData.name || null,
                            surname: registerData.surname || null,
                            avatarUrl: registerData.avatarUrl || null,
                            street: registerData.street || null,
                            city: registerData.city || null
                        }
                    }
                }
            });

            console.log("Utente creato ", registerData.email);
            return {
                success: true
            };
        } catch (error) {
            console.log("❌ Errore durante la registrazione: ", error);
            return {
                success: false,
                message: "Errore durante la registrazione",
            };
        }
    }

    async GoogleLogin(idToken: string) {
        try {
            const client = new OAuth2Client(process.env.ID_CLIENT);

            const ticket = await client.verifyIdToken({
                idToken: idToken,
                audience: process.env.ID_CLIENT,
            });
            const payload = ticket.getPayload();

            if (!payload || !payload.email) {
                return {
                    success: false,
                    message: "Token Google non valido",
                };
            }

            const email = payload.email;

            // 1. Controlliamo se l'utente esiste già
            let user = await prisma.user.findUnique({
                where: { email },
                select: { 
                    userId: true, 
                    email: true,
                    userData: {
                        select: {
                            avatarUrl: true
                        }
                    }
                }
            });

            // 2. Se l'utente non esiste, NON lo registriamo automaticamente
            // Restituiamo i dati al frontend così può completare la registrazione
            if (!user) {
                console.log("Nuovo utente da Google, richiesta completamento registrazione:", email);
                return {
                    success: true,
                    needsRegistration: true,
                    userData: {
                        email: email,
                        name: payload.given_name,
                        surname: payload.family_name,
                        avatarUrl: payload.picture
                    }
                };
            }

            // 3. Se l'utente esiste, creiamo la sessione
            const sessionId = randomUUID();
            console.log("Nuovo sessionId generato per l'accesso Google di " + email);

            await prisma.user.update({
                where: { userId: user.userId },
                data: { sessionId }
            });

            // 4. Generiamo il nostro JWT
            const token = jwt.sign(
                {
                    userId: user.userId,
                    email: email,
                    username: email,
                    sessionId: sessionId,
                    avatarUrl: user.userData?.avatarUrl
                },
                JWT_SECRET,
                {
                    expiresIn: JWT_EXPIRES_IN,
                } as jwt.SignOptions
            );

            return {
                success: true,
                token
            };

        } catch (error) {
            console.log("❌ Errore durante il login con Google: ", error);
            return {
                success: false,
                message: "Errore durante il login con Google",
            };
        }
    }
}