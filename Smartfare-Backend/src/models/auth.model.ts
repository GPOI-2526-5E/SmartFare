import { Types } from "mongoose";

export interface User {
    _id: Types.ObjectId;
    email: string;
    password: string;
    sessionId: string | null;
}

export interface LoginParams {
    email: string,
    password: string;
}

export interface RegisterData {
    email: string,
    password: string
}