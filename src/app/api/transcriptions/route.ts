import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { dbQueries } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const transcriptions = await dbQueries.getUserTranscriptions(token.sub);
  return NextResponse.json({ transcriptions });
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await req.json();
  const { title, text, chunks, duration, model, language } = body;

  if (!text) {
    return NextResponse.json({ error: "缺少转录内容" }, { status: 400 });
  }

  const transcription = await dbQueries.createTranscription({
    user_id: token.sub,
    title: title || "未命名转录",
    text,
    chunks: chunks || [],
    duration: duration || 0,
    model: model || "whisper-1",
    language: language || "zh",
  });

  return NextResponse.json({ transcription });
}
