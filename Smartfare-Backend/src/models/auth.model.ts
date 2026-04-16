export interface User {
    userId: number;
    email: string;
    password?: string;
    sessionId: string | null;
}

export interface LoginParams {
    email: string,
    password: string;
}

export interface RegisterData {
    email: string,
    password: string,
    name?: string;
    surname?: string;
    avatarUrl?: string;
    street?: string;
    city?: string;
}