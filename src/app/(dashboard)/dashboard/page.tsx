"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface TranscriptionItem {
  id: string;
  title: string;
  text: string;
  duration: number;
  language: string;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, minutes: 0 });

  useEffect(() => {
    if (!session) return;
    fetchTranscriptions();
  }, [session]);

  async function fetchTranscriptions() {
    try {
      const res = await fetch("/api/transcriptions");
      if (res.ok) {
        const data = await res.json();
        setTranscriptions(data.transcriptions || []);
        setStats({
          total: data.transcriptions?.length || 0,
          minutes: data.transcriptions?.reduce((acc: number, t: TranscriptionItem) => acc + (t.duration || 0), 0) || 0,
        });
      }
    } catch (err) {
      console.error("加载失败:", err);
    } finally {
      setLoading(false);
    }
  }

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-500">转录总数</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-500">累计时长</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{Math.floor(stats.minutes / 60)} 分钟</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm col-span-2 md:col-span-1">
          <Link
            href="/transcribe"
            className="w-full h-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            ＋ 新建转录
          </Link>
        </div>
      </div>

      {/* Transcription List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">转录历史</h2>
        </div>

        {loading ? (
          <div className="p-6 text-center text-gray-500">加载中...</div>
        ) : transcriptions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">🎤</div>
            <div className="text-gray-500 mb-4">还没有转录记录</div>
            <Link
              href="/transcribe"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              开始第一次转录
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {transcriptions.map((item) => (
              <div key={item.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/transcribe?id=${item.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate block"
                    >
                      {item.title || "未命名转录"}
                    </Link>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className="text-xs text-gray-400">
                        {formatDuration(item.duration)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {item.language || "auto"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/transcribe?id=${item.id}`}
                    className="ml-4 text-sm text-blue-600 hover:text-blue-800 flex-shrink-0"
                  >
                    查看 →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
