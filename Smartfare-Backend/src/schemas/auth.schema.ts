import { z } from "zod";

/**
 * Password validation schema
 * - Minimum 12 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 digit
 * - At least 1 special character
 */
const passwordSchema = z
    .string()
    .min(12, "La password deve avere almeno 12 caratteri")
    .regex(
        /^(?=.*[a-z])/,
        "La password deve contenere almeno una lettera minuscola"
    )
    .regex(
        /^(?=.*[A-Z])/,
        "La password deve contenere almeno una lettera maiuscola"
    )
    .regex(
        /^(?=.*\d)/,
        "La password deve contenere almeno un numero"
    )
    .regex(
        /^(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/,
        "La password deve contenere almeno un carattere speciale (!@#$%^&* ecc.)"
    );

export const loginSchema = z.object({
    email: z.string().email("Email non valida"),
    password: z.string().min(1, "Password richiesta")
});

export const registerSchema = z.object({
    email: z.string().email("Email non valida"),
    password: passwordSchema,
    name: z.string().min(1, "Il nome è obbligatorio"),
    surname: z.string().min(1, "Il cognome è obbligatorio"),
    avatarUrl: z.string().url().optional().or(z.literal('')),
    authProvider: z.enum(["local", "google", "github"]).optional(),
    oauthRegistrationToken: z.string().optional()
});

export const forgotPasswordSchema = z.object({
    email: z.string().email("Email non valida")
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1, "Token mancante"),
    newPassword: passwordSchema
});

export const verifyEmailSchema = z.object({
    token: z.string().min(1, "Token mancante")
});
