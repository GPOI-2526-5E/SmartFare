import prisma from "../../lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { randomUUID } from "crypto";
import { RegisterData } from "../../models/auth.model";
import { LoginParams } from "../../models/auth.model";
import { OAuth2Client } from "google-auth-library";
import { EmailService } from "../email/email.service";

const emailService = new EmailService();

const JWT_SECRET: string = process.env.JWT_SECRET || "";
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "";

export class AuthService {

    async Login(loginData: LoginParams) {
        try {
            // password here is already hashed with SHA-256 on the client side
            const { email, password } = loginData;

            const user = await prisma.user.findUnique({
                where: { email },
                select: {
                    id: true,
                    email: true,
                    passwordHash: true,
                    sessionId: true,
                    profile: {
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
                where: { id: user.id },
                data: { sessionId }
            });

            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    username: user.email,
                    sessionId: sessionId,
                    avatarUrl: user.profile?.avatarUrl
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
                select: { id: true }
            });

            if (existingUser) {
                console.log("Email già esistente");
                return {
                    success: false,
                    message: "Email già esistente"
                };
            }

            console.log("DATI REGISTRAZIONE RICEVUTI:", JSON.stringify(registerData, null, 2));

            // registerData.password is already hashed with SHA-256 on the client side
            // We hash it again with Bcrypt for database security (Double Hashing)
            const hashedPassword = await bcrypt.hash(registerData.password, 10);

            // Use explicit provider when available, fallback to local.
            const provider = registerData.authProvider === "google" ? "google" : "local";

            await prisma.user.create({
                data: {
                    email: registerData.email,
                    passwordHash: hashedPassword,
                    authProvider: provider,
                    profile: {
                        create: {
                            name: registerData.name || null,
                            surname: registerData.surname || null,
                            avatarUrl: registerData.avatarUrl || null,
                            street: null,
                            city: null
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

            let user = await prisma.user.findUnique({
                where: { email },
                select: {
                    id: true,
                    email: true,
                    profile: {
                        select: {
                            avatarUrl: true
                        }
                    }
                }
            });

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

            const sessionId = randomUUID();
            console.log("Nuovo sessionId generato per l'accesso Google di " + email);

            await prisma.user.update({
                where: { id: user.id },
                data: { sessionId }
            });

            const token = jwt.sign(
                {
                    userId: user.id,
                    email: email,
                    username: email,
                    sessionId: sessionId,
                    avatarUrl: user.profile?.avatarUrl
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

    async ForgotPassword(email: string) {
        try {
            const user = await prisma.user.findUnique({
                where: { email },
            });

            if (!user) {
                // Return success even if not found to prevent user enumeration
                return { success: true };
            }

            // Create explicit random token
            const resetToken = crypto.randomBytes(32).toString("hex");

            // Hash token for database (security best practice)
            const resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");

            // Set expire to 10 mins from now
            const resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    resetPasswordToken,
                    resetPasswordExpires,
                },
            });

            // Send Email
            const frontendUrl = process.env.FRONTEND_URL || "http://localhost:4200";
            const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

            await emailService.sendPasswordResetEmail(user.email, resetLink);

            return { success: true };
        } catch (error) {
            console.error("❌ Errore durante ForgotPassword:", error);
            return {
                success: false,
                message: "Errore durante il processo di reset password",
            };
        }
    }

    async ResetPassword({ token, newPassword }: { token: string; newPassword: string }) {
        try {
            const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

            const user = await prisma.user.findFirst({
                where: {
                    resetPasswordToken: hashedToken,
                    resetPasswordExpires: {
                        gt: new Date(), // Check if not expired
                    },
                },
            });

            if (!user) {
                return {
                    success: false,
                    message: "Token non valido o scaduto",
                };
            }

            // In our system, frontend sends hashed password, but just in case we need to re-hash internally. 
            // In register we do bcrypt.hash(password, 10).
            const passwordHash = await bcrypt.hash(newPassword, 10);

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    passwordHash,
                    resetPasswordToken: null,
                    resetPasswordExpires: null,
                    sessionId: null, // Clear session to force re-login
                },
            });

            return { success: true };
        } catch (error) {
            console.error("❌ Errore durante ResetPassword:", error);
            return {
                success: false,
                message: "Errore durante l'aggiornamento della password",
            };
        }
    }
}