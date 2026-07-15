import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const MUAPI_KEY = process.env.MUAPI_API_KEY || process.env.MUAPIAPP_API_KEY || "";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("file") as File;

    if (!audioFile) {
      return NextResponse.json({ error: "没有音频文件" }, { status: 400 });
    }

    if (!MUAPI_KEY) {
      // Fallback: return a message instead of error
      return NextResponse.json({
        text: "（MuAPI 密钥未配置，请联系管理员设置 MUAPI_API_KEY）",
        chunks: [{ text: "（MuAPI 密钥未配置）", timestamp: [0, 0] }],
      }, { status: 200 });
    }

    // Send to MuAPI for transcription
    const muFormData = new FormData();
    muFormData.append("file", audioFile);
    muFormData.append("model", "whisper-1");
    muFormData.append("language", "zh");
    muFormData.append("response_format", "verbose_json");

    const response = await fetch("https://api.muapi.app/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MUAPI_KEY}`,
      },
      body: muFormData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("MuAPI transcription error:", errText);

      // Try alternative: use DeepSeek via chat completions for small audio
      // Fallback to text message if transcription API doesn't work
      return NextResponse.json({
        text: "（转录服务暂时不可用，请稍后重试）",
        chunks: [],
      }, { status: 200 });
    }

    const data = await response.json();
    const text = data.text || "";

    // Generate chunks from segments if available, otherwise create simple chunks
    let chunks = [];
    if (data.segments && data.segments.length > 0) {
      chunks = data.segments.map((seg: any) => ({
        text: seg.text?.trim() || "",
        timestamp: [seg.start || 0, seg.end || 0] as [number, number | null],
      }));
    } else if (text) {
      // Split text into sentence-level chunks
      const sentences = text.split(/(?<=[。！？.!?])/);
      let offset = 0;
      chunks = sentences
        .filter((s: string) => s.trim())
        .map((s: string) => {
          const duration = Math.max(1, s.length / 5); // rough estimate: 5 chars/sec
          const start = offset;
          offset += duration;
          return { text: s.trim(), timestamp: [start, offset] as [number, number | null] };
        });
    }

    return NextResponse.json({ text, chunks });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json({ error: "转录失败" }, { status: 500 });
  }
}
