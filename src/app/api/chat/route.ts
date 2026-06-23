import connectDb from "@/lib/db";
import Settings from "@/model/settings.model";
import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

// Define a type for incoming message history
interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Accept 'history' from the client payload
    const { message, ownerId, history = [] }: { message: string; ownerId: string; history: ChatMessage[] } = await req.json();

    if (!message || !ownerId) {
      return corsResponse(
        NextResponse.json({ message: "message and owner id is required" }, { status: 400 })
      );
    }

    await connectDb();
    const setting = await Settings.findOne({ ownerId });
    if (!setting) {
      return corsResponse(
        NextResponse.json({ message: "chat bot is not configured yet." }, { status: 400 })
      );
    }

    const KNOWLEDGE = `
    business name- ${setting.buisnessName || "not provided"}
    support email- ${setting.supportEmail || "not provided"}
    knowledge- ${setting.knowledge || "not provided"}
    `;

    // System instructions keep the model grounded across the entire conversation
    const systemInstruction = `
    You are a professional customer support assistant for this business.
    
    Use ONLY the information provided below to answer the customer's question.
    You may rephrase, summarize, or interpret the information if needed.
    Do NOT invent new policies, prices, or promises.
    
    If the customer's question is completely unrelated to the information,
    or cannot be reasonably answered from it, reply exactly with:
    "Please contact support."
    
    --------------------
    BUSINESS INFORMATION
    --------------------
    ${KNOWLEDGE}
    `;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // 2. Format history + current message into Gemini's contents structure
    const formattedContents = [
      ...history.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      })),
      {
        role: "user",
        parts: [{ text: message }],
      },
    ];

    // 3. Generate content passing systemInstructions configuration
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    return corsResponse(NextResponse.json(res.text));

  } catch (error) {
    return corsResponse(
      NextResponse.json({ message: `chat error ${error}` }, { status: 500 })
    );
  }
}

// Helper to clean up repetitive CORS handling
function corsResponse(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  res.headers.set("Access-Control-Allow-Origin", "*"); 
  return res;
}

export const OPTIONS = async () => {
  return NextResponse.json(null, {
    status: 201,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};
