export interface User {
    id: string;
    email: string;
    password: string;
    session_id: string | null;
}

export interface LoginParams {
    email: string,
    password: string;
}

export interface RegisterData {
    email: string,
    password: string
}