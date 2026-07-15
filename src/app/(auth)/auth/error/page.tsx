"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function ErrorContent() {
  const params = useSearchParams();
  const error = params.get("error");

  const messages: Record<string, string> = {
    AccessDenied: "访问被拒绝，请检查权限设置",
    Configuration: "服务器配置错误，请联系管理员",
    Verification: "验证失败，Token 可能已过期",
    OAuthSignin: "登录服务暂时不可用，请稍后重试",
    OAuthCallback: "登录回调失败，请重试",
    OAuthCreateAccount: "创建账号失败，请重试",
    EmailCreateAccount: "邮箱注册失败",
    Callback: "登录回调出错",
    default: "登录过程中出现未知错误",
  };

  const msg = error ? (messages[error] || error) : messages.default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">登录失败</h2>
        <p className="text-gray-500 mb-6">{msg}</p>
        <Link
          href="/login"
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          返回登录
        </Link>
      </div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">加载中...</div>}>
      <ErrorContent />
    </Suspense>
  );
}
