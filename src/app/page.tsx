"use client";

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { SUBSCRIPTION_PLANS } from '@/utils/constants';

export default function HomePage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">🎙️ 语音转文字</h1>
            </div>
            <div className="flex items-center space-x-4">
              {session ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    工作台
                  </Link>
                  <Link
                    href="/api/auth/signout"
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    退出登录
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    登录
                  </Link>
                  <Link
                    href="/login"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    免费开始
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">AI 智能</span>
            <span className="block text-blue-600">语音转文字</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            支持录音、上传音视频文件，一键转录为文字。AI 智能总结、生成字幕、小红书图文、视频脚本，让内容创作更高效。
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            <div className="rounded-md shadow">
              <Link
                href={session ? "/dashboard" : "/login"}
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
              >
                {session ? "进入工作台" : "免费试用"}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">核心功能</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              你需要的全都有
            </p>
          </div>

          <div className="mt-10">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  🎤
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">多种输入方式</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  支持直接录音、上传音频文件、上传视频文件（自动提取音频），覆盖所有主流格式。
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  🌐
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">多语言支持</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  支持 100+ 种语言转录，中文识别精准，英文、日语、韩语也同样出色。
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  🤖
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">AI 智能处理</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  转录后一键 AI 总结、生成会议纪要、小红书图文、视频脚本，解放双手。
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  📄
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">多格式导出</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  支持导出 TXT、DOC、SRT 字幕、VTT 字幕等多种格式，满足各种使用场景。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="sm:text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              简单透明的定价
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              选择适合你的方案
            </p>
          </div>
          <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6 lg:max-w-4xl lg:mx-auto">
            {Object.values(SUBSCRIPTION_PLANS).map((plan) => (
              <div key={plan.id} className="bg-white border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200">
                <div className="p-6">
                  <h2 className="text-xl leading-6 font-medium text-gray-900">{plan.name}</h2>
                  <p className="mt-4 text-sm text-gray-500">
                    {plan.monthlyMinutes === -1 ? '不限时长' : `每月 ${plan.monthlyMinutes} 分钟`}
                  </p>
                  <p className="mt-8">
                    <span className="text-4xl font-extrabold text-gray-900">¥{plan.price}</span>
                    <span className="text-base font-medium text-gray-500">/月</span>
                  </p>
                  <Link
                    href={session ? "/dashboard" : "/login"}
                    className="mt-8 block w-full bg-blue-600 border border-transparent rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-blue-700"
                  >
                    {plan.id === 'free' ? '免费开始' : '立即升级'}
                  </Link>
                </div>
                <div className="pt-6 pb-8 px-6">
                  <h3 className="text-xs font-medium text-gray-900 tracking-wide uppercase">包含功能</h3>
                  <ul className="mt-6 space-y-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex space-x-3">
                        <span className="text-green-500">✓</span>
                        <span className="text-sm text-gray-500">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500">
            <p>&copy; 2026 语音转文字. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
