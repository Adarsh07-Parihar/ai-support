import { scalekit } from "@/lib/scalekit";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;
    
    // 1. Explicitly request 'offline_access' along with your basic scopes
    const url = scalekit.getAuthorizationUrl(redirectUri, {
        scopes: ["openid", "profile", "email", "offline_access"]
    });
    
    console.log("Authorization URL generated with refresh scope:", url);
    return NextResponse.redirect(url);
}