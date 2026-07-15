import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const MUAPI_KEY = process.env.MUAPI_API_KEY || process.env.MUAPIAPP_API_KEY || "";

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("file") as File;

    if (!audioFile) {
      return NextResponse.json({ error: "没有音频文件" }, { status: 400 });
    }

    if (!MUAPI_KEY) {
      return NextResponse.json({
        text: "（MuAPI 密钥未配置，请联系管理员设置 MUAPI_API_KEY）",
        chunks: [{ text: "（MuAPI 密钥未配置）", timestamp: [0, 0] }],
      });
    }

    const muFormData = new FormData();
    muFormData.append("file", audioFile);
    muFormData.append("model", "whisper-1");
    muFormData.append("language", "zh");
    muFormData.append("response_format", "verbose_json");

    const response = await fetch("https://api.muapi.app/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${MUAPI_KEY}` },
      body: muFormData,
    });

    if (!response.ok) {
      console.error("MuAPI transcription error:", await response.text());
      return NextResponse.json({
        text: "（转录服务暂时不可用，请稍后重试）",
        chunks: [],
      });
    }

    const data = await response.json();
    const text = data.text || "";

    let chunks: { text: string; timestamp: [number, number | null] }[] = [];
    if (data.segments?.length > 0) {
      chunks = data.segments.map((seg: any) => ({
        text: seg.text?.trim() || "",
        timestamp: [seg.start || 0, seg.end || 0] as [number, number | null],
      }));
    } else if (text) {
      const sentences = text.split(/(?<=[。！？.!?])/);
      let offset = 0;
      chunks = sentences.filter((s: string) => s.trim()).map((s: string) => {
        const dur = Math.max(1, s.length / 5);
        const start = offset; offset += dur;
        return { text: s.trim(), timestamp: [start, offset] as [number, number | null] };
      });
    }

    return NextResponse.json({ text, chunks });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json({ error: "转录失败" }, { status: 500 });
  }
}
