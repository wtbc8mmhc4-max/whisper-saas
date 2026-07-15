import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const MUAPI_KEY = process.env.MUAPI_API_KEY || process.env.MUAPIAPP_API_KEY || "";
const MUAPI_URL = "https://api.muapi.app/v1/chat/completions";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const subscription = (session.user as any)?.subscription;
  const planId = subscription?.plan_id || "free";

  try {
    const body = await req.json();
    const { text, action, prompt } = body;

    if (!text || !action) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 });
    }

    // Premium features require business plan
    const premiumActions = ["xiaohongshu", "script"];
    if (premiumActions.includes(action) && planId === "free") {
      return NextResponse.json(
        { error: "小红书图文和视频脚本需要升级到企业版，AI 总结可免费使用" },
        { status: 403 }
      );
    }

    if (!MUAPI_KEY) {
      return NextResponse.json({ error: "AI 服务未配置" }, { status: 500 });
    }

    const fullPrompt = prompt + text;
    const maxTokens = action === "summarize" ? 1000 : 2000;

    const response = await fetch(MUAPI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MUAPI_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "你是一个专业的内容创作助手，擅长文字处理、内容总结、社交媒体文案和视频脚本创作。请用中文回复。",
          },
          {
            role: "user",
            content: fullPrompt,
          },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("MuAPI error:", errText);
      return NextResponse.json({ error: "AI 服务调用失败" }, { status: 500 });
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({ result });
  } catch (error) {
    console.error("AI 处理失败:", error);
    return NextResponse.json({ error: "AI 处理失败" }, { status: 500 });
  }
}
