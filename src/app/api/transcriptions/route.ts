import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbQueries } from "@/lib/supabase";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const transcriptions = await dbQueries.getUserTranscriptions(session.user.id);
    return NextResponse.json({ transcriptions });
  } catch (error) {
    console.error("获取转录列表失败:", error);
    return NextResponse.json({ transcriptions: [] });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, text, chunks, duration, model, language } = body;

    if (!text) {
      return NextResponse.json({ error: "缺少转录内容" }, { status: 400 });
    }

    const transcription = await dbQueries.createTranscription({
      user_id: session.user.id,
      title: title || "未命名转录",
      text,
      chunks: chunks || [],
      duration: duration || 0,
      model: model || "whisper",
      language: language || "chinese",
    });

    // Update usage
    try {
      const mins = Math.ceil((duration || 0) / 60);
      await dbQueries.updateUsage(session.user.id, mins);
    } catch (e) {
      console.error("更新用量失败:", e);
    }

    return NextResponse.json({ transcription });
  } catch (error) {
    console.error("保存转录失败:", error);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}
