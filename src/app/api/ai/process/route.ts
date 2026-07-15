import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const MUAPI_KEY = process.env.MUAPI_API_KEY || process.env.MUAPIAPP_API_KEY || "";

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await req.json();
  const { text, action, prompt } = body;

  if (!text || !action) {
    return NextResponse.json({ error: "缺少参数" }, { status: 400 });
  }

  // Premium features require business plan
  const premiumActions = ["xiaohongshu", "script"];
  if (premiumActions.includes(action)) {
    // For now, allow all users to use AI features
    // In production, check subscription plan here
  }

  if (!MUAPI_KEY) {
    return NextResponse.json({ error: "AI 服务未配置" }, { status: 500 });
  }

  const maxTokens = action === "summarize" ? 1000 : 2000;

  const response = await fetch("https://api.muapi.app/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MUAPI_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "你是一个专业的内容创作助手，请用中文回复。" },
        { role: "user", content: prompt + text },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "AI 服务调用失败" }, { status: 500 });
  }

  const data = await response.json();
  const result = data.choices?.[0]?.message?.content || "";

  return NextResponse.json({ result });
}
