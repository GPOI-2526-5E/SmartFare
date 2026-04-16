export interface AuthResponse {
    success: boolean;
    token?: string;
    message?: string;
    needsRegistration?: boolean;
    userData?: {
        email: string;
        name?: string;
        surname?: string;
        avatarUrl?: string;
    };
}
