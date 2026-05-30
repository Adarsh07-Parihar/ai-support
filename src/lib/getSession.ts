import { cookies } from "next/headers";
import { scalekit } from "./scalekit";

export async function getSession() {
    const session = await cookies();
    const token = session.get("access_token")?.value;
    
    if (!token) {
        return null;
    }
    
    try {
        const result: any = await scalekit.validateToken(token); 
        
        if (!result || !result.sub) {
            return null;
        }

        const user = await scalekit.user.getUser(result.sub);
        return user;
        
    } catch (error: any) {
        // Handle token expiration quietly without crashing or spamming logs
        if (error?.message?.includes('"exp" claim') || error?.name?.includes('ValidateTokenFailure')) {
            console.warn("User session has expired. Prompting re-authentication.");
            return null; 
        }
        
        // Log unexpected errors (network failures, configuration issues, etc.)
        console.error("Unexpected error retrieving Scalekit session:", error);
        return null;
    }
}