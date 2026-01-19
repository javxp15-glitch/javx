import { jwtVerify } from 'jose';

export interface JWTPayload {
    userId: string;
    email: string;
    role: string;
}

export async function verifyAuthEdge(req: Request): Promise<JWTPayload | null> {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) return null;

    try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-in-production");
        const { payload } = await jwtVerify(token, secret);
        return payload as unknown as JWTPayload;
    } catch (err) {
        return null;
    }
}
