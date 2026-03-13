import { getCollection } from "../../config/database";
import { Types } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { User } from "../../models/auth.model";
import { LoginParams } from "../../models/auth.model";

const JWT_SECRET: string = process.env.JWT_SECRET || "";
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "";

const COLLECTION_NAME = "Users";

export class AuthService {

    async Login(LoginData: LoginParams) {
        try {
            const { email, password } = LoginData;

            const userCollection = getCollection<User>(COLLECTION_NAME);
            const user = await userCollection.findOne<User>({ "email": email });

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

            await userCollection.updateOne(
                { _id: user._id },
                { $set: { sessionId: sessionId } }
            );

            const token = jwt.sign(
                {
                    userId: user._id,
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
                token,
                user: {
                    _id: user._id,
                    email: user.email
                }
            }


        } catch (error) {
            console.log("❌ Errore durante il login: ", error);
            return {
                success: false,
                message: "Errore durante il login",
            }
        }
    }

    async Register(email: string, password: string) {
        try {
            const userCollection = getCollection<User>(COLLECTION_NAME);

            const existingEmail = await userCollection.findOne({ email: email });

            if (existingEmail) {
                console.log("Email già esistente");
                return {
                    success: false,
                    message: "Email già esistente"
                };
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const newUser: User = {
                _id: new Types.ObjectId(),
                email: email,
                password: hashedPassword,
                sessionId: null
            };

            const result = await userCollection.insertOne(newUser);
            console.log("Utente creato ", email);
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