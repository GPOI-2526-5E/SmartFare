import { getSupabaseClient } from "../../config/database";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { RegisterData, User } from "../../models/auth.model";
import { LoginParams } from "../../models/auth.model";
import { OAuth2Client } from "google-auth-library";

const JWT_SECRET: string = process.env.JWT_SECRET || "";
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "";

const TABLE_NAME = "users";

export class AuthService {

    async Login(LoginData: LoginParams) {
        try {
            const { email, password } = LoginData;
            const supabase = getSupabaseClient();

            const { data: user, error: findError } = await supabase
                .from(TABLE_NAME)
                .select("id,email,password,session_id")
                .eq("email", email)
                .maybeSingle<User>();

            if (findError) {
                throw findError;
            }

            if (!user)
                return {
                    success: false,
                    message: "Credenziali non valide",
                }

            const VerificaPassword = await bcrypt.compare(password, user.password);

            if (!VerificaPassword)
                return {
                    success: false,
                    message: "Credenziali non valide",
                }

            const sessionId = randomUUID();
            console.log("Nuovo sessionId generato per " + user.email);

            const { error: updateError } = await supabase
                .from(TABLE_NAME)
                .update({ session_id: sessionId })
                .eq("id", user.id);

            if (updateError) {
                throw updateError;
            }

            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    username: user.email,
                    sessionId: sessionId
                },
                JWT_SECRET as string,
                {
                    expiresIn: JWT_EXPIRES_IN as string,
                } as jwt.SignOptions
            );

            return {
                success: true,
                token
            }


        } catch (error) {
            console.log("❌ Errore durante il login: ", error);
            return {
                success: false,
                message: "Errore durante il login",
            }
        }
    }

    async Register(registerData: RegisterData) {
        try {
            const supabase = getSupabaseClient();

            const { data: existingEmail, error: findError } = await supabase
                .from(TABLE_NAME)
                .select("id")
                .eq("email", registerData.email)
                .maybeSingle();

            if (findError) {
                throw findError;
            }

            if (existingEmail) {
                console.log("Email già esistente");
                return {
                    success: false,
                    message: "Email già esistente"
                };
            }

            const hashedPassword = await bcrypt.hash(registerData.password, 10);

            const { error: insertError } = await supabase.from(TABLE_NAME).insert({
                email: registerData.email,
                password: hashedPassword,
                session_id: null,
            });

            if (insertError) {
                throw insertError;
            }

            console.log("Utente creato ", registerData.email);
            return {
                success: true
            };
        } catch (error) {
            console.log("❌ Errore durante la registrazione: ", error);
            return {
                success: false,
                message: "Errore durante la registrazione",
            }
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
            const supabase = getSupabaseClient();

            // 1. Controlliamo se l'utente esiste già
            const { data: user, error: findError } = await supabase
                .from(TABLE_NAME)
                .select("id,email,session_id")
                .eq("email", email)
                .maybeSingle<User>();

            if (findError) {
                throw findError;
            }

            let userId = user?.id;

            // 2. Se l'utente non esiste, lo registriamo
            if (!user) {
                console.log("Nuovo utente da Google, registrazione automatica in corso:", email);
                const randomPassword = randomUUID() + randomUUID();
                const hashedPassword = await bcrypt.hash(randomPassword, 10);

                const { data: newUser, error: insertError } = await supabase.from(TABLE_NAME).insert({
                    email: email,
                    password: hashedPassword,
                    session_id: null,
                }).select("id").single();

                if (insertError) {
                    // Concurrent Google logins can race on the same email.
                    // If another request created the user first, load it and continue.
                    if ((insertError as any).code === "23505") {
                        const { data: existingUser, error: refetchError } = await supabase
                            .from(TABLE_NAME)
                            .select("id")
                            .eq("email", email)
                            .maybeSingle<{ id: string }>();

                        if (refetchError) {
                            throw refetchError;
                        }

                        if (!existingUser) {
                            throw insertError;
                        }

                        userId = existingUser.id;
                    } else {
                        throw insertError;
                    }
                } else {
                    userId = newUser.id;
                }
            }

            // 3. Creiamo la sessione
            const sessionId = randomUUID();
            console.log("Nuovo sessionId generato per l'accesso Google di " + email);

            const { error: updateError } = await supabase
                .from(TABLE_NAME)
                .update({ session_id: sessionId })
                .eq("id", userId);

            if (updateError) {
                throw updateError;
            }

            // 4. Generiamo il nostro JWT
            const token = jwt.sign(
                {
                    userId: userId,
                    email: email,
                    username: email,
                    sessionId: sessionId
                },
                JWT_SECRET as string,
                {
                    expiresIn: JWT_EXPIRES_IN as string,
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
            }
        }
    }
}