import prisma from "../../config/prisma";
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
                    isEmailVerified: true,
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

            if (!user.isEmailVerified) {
                return {
                    success: false,
                    message: "Account non verificato. Controlla la tua email.",
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
                select: { id: true, isEmailVerified: true }
            });

            if (existingUser) {
                if (existingUser.isEmailVerified) {
                    console.log("Email già esistente");
                    return {
                        success: false,
                        message: "Email già esistente"
                    };
                } else {
                    console.log("Utente non verificato trovato, aggiorno i dati e rinvio la mail...");
                }
            }

            console.log("DATI REGISTRAZIONE RICEVUTI:", JSON.stringify(registerData, null, 2));

            // registerData.password is already hashed with SHA-256 on the client side
            // We hash it again with Bcrypt for database security (Double Hashing)
            const hashedPassword = await bcrypt.hash(registerData.password, 10);

            // Use explicit provider when available, fallback to local.
            const provider = registerData.authProvider === "google" ? "google" : "local";

            const isGoogle = provider === "google";
            const verificationToken = isGoogle ? null : crypto.randomBytes(32).toString("hex");
            const hashedVerificationToken = verificationToken ? crypto.createHash("sha256").update(verificationToken).digest("hex") : null;
            const verificationExpires = isGoogle ? null : new Date(Date.now() + 60 * 60 * 1000); // 1 hour

            if (verificationToken) {
                console.log("🆕 Generato nuovo token di verifica per", registerData.email);
                console.log("🎫 Token raw:", verificationToken);
                console.log("🔒 Token hashed (saved to DB):", hashedVerificationToken);
                console.log("⏰ Scadenza impostata:", verificationExpires);
            }

            const userData = {
                passwordHash: hashedPassword,
                authProvider: provider,
                isEmailVerified: isGoogle,
                emailVerificationToken: hashedVerificationToken,
                emailVerificationExpires: verificationExpires,
            };

            const profileData = {
                name: registerData.name || null,
                surname: registerData.surname || null,
                avatarUrl: registerData.avatarUrl || null,
                street: null,
                city: null
            };

            if (existingUser && !existingUser.isEmailVerified) {
                await prisma.user.update({
                    where: { id: existingUser.id },
                    data: {
                        ...userData,
                        profile: {
                            upsert: {
                                create: profileData,
                                update: {
                                    name: profileData.name,
                                    surname: profileData.surname,
                                    avatarUrl: profileData.avatarUrl
                                }
                            }
                        }
                    }
                });
            } else {
                await prisma.user.create({
                    data: {
                        email: registerData.email,
                        ...userData,
                        profile: {
                            create: profileData
                        }
                    }
                });
            }

            console.log("Utente creato ", registerData.email);

            if (!isGoogle && verificationToken) {
                const frontendUrl = process.env.FRONTEND_URL || "http://localhost:4200";
                const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}`;
                await emailService.sendVerificationEmail(registerData.email, verificationLink);
            }

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

    async VerifyEmail(token: string) {
        try {
            console.log("🔍 Tentativo di verifica email con token:", token);
            const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
            console.log("🔑 Token hash generato:", hashedToken);

            const user = await prisma.user.findFirst({
                where: {
                    emailVerificationToken: hashedToken,
                },
                select: {
                    id: true,
                    email: true,
                    emailVerificationExpires: true,
                    isEmailVerified: true,
                    profile: {
                        select: { avatarUrl: true }
                    }
                }
            });

            if (!user) {
                console.warn("❌ Nessun utente trovato con questo token hash.");
                return {
                    success: false,
                    message: "Link di verifica non valido o scaduto.",
                };
            }

            console.log("👤 Utente trovato:", user.email);
            console.log("⏰ Scadenza token:", user.emailVerificationExpires);
            console.log("📅 Ora attuale:", new Date());

            if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
                console.warn("⚠️ Il token è scaduto.");
                return {
                    success: false,
                    message: "Link di verifica scaduto.",
                };
            }

            if (user.isEmailVerified) {
                console.log("ℹ️ Email già verificata per questo utente.");
            }

            const sessionId = randomUUID();

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    isEmailVerified: true,
                    emailVerificationToken: null,
                    emailVerificationExpires: null,
                    sessionId
                },
            });

            const jwtToken = jwt.sign(
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
                token: jwtToken
            };
        } catch (error) {
            console.error("❌ Errore durante VerifyEmail:", error);
            return {
                success: false,
                message: "Errore durante la verifica dell'email",
            };
        }
    }
}