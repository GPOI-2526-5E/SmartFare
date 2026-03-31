import { getSupabaseClient } from "../../config/database";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { RegisterData, User } from "../../models/auth.model";
import { LoginParams } from "../../models/auth.model";

const JWT_SECRET: string = process.env.JWT_SECRET || "";
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "";

const TABLE_NAME = "Users";

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
}