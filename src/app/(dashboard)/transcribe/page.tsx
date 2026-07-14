"use client";

import { useState, useRef, useEffect } from "react";
import { useTranscriber } from "@/hooks/useTranscriber";
import { WHISPER_CONFIG } from "@/utils/constants";
import toast from "react-hot-toast";

type TabType = "record" | "upload";

export default function TranscribePage() {
  const transcriber = useTranscriber();

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>("record");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAction, setAiAction] = useState("");

  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timer for recording
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Start recording
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        await processAudioBlob(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      transcriber.onInputChange();
    } catch (err) {
      toast.error("无法访问麦克风，请检查浏览器权限");
      console.error(err);
    }
  }

  // Stop recording
  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  // Process audio blob to AudioBuffer and transcribe
  async function processAudioBlob(blob: Blob) {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: WHISPER_CONFIG.SAMPLING_RATE });
      }
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      transcriber.start(audioBuffer);
      toast.success("开始转录...");
    } catch (err) {
      toast.error("音频处理失败");
      console.error(err);
    }
  }

  // Handle file upload (audio + video)
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setTitle(file.name.replace(/\.[^.]+$/, ""));
    toast.loading("处理文件中...");

    try {
      // For video files, extract audio using video element
      if (file.type.startsWith("video/")) {
        const videoEl = document.createElement("video");
        videoEl.preload = "metadata";
        const url = URL.createObjectURL(file);
        videoEl.src = url;

        await new Promise<void>((resolve) => {
          videoEl.onloadedmetadata = () => resolve();
        });

        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext({ sampleRate: WHISPER_CONFIG.SAMPLING_RATE });
        }

        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer.slice(0));
        transcriber.start(audioBuffer);
        URL.revokeObjectURL(url);
      } else {
        // Audio file
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext({ sampleRate: WHISPER_CONFIG.SAMPLING_RATE });
        }
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
        transcriber.start(audioBuffer);
      }
      toast.dismiss();
      toast.success("开始转录...");
    } catch (err) {
      toast.dismiss();
      toast.error("文件处理失败，请检查格式");
      console.error(err);
    }
  }

  // Save transcription
  async function saveTranscription() {
    if (!transcriber.output?.text) return;
    setSaving(true);
    try {
      const duration = transcriber.output.chunks.length > 0
        ? Math.ceil(transcriber.output.chunks[transcriber.output.chunks.length - 1].timestamp[1] || 0)
        : 0;

      const res = await fetch("/api/transcriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "未命名转录",
          text: transcriber.output.text,
          chunks: transcriber.output.chunks,
          duration,
          model: transcriber.model,
          language: transcriber.language || "chinese",
        }),
      });

      if (res.ok) {
        toast.success("保存成功！");
      } else {
        toast.error("保存失败");
      }
    } catch (err) {
      toast.error("保存失败");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  // Export as text
  function exportAs( format: string) {
    if (!transcriber.output?.text) return;
    let content = "";
    let filename = "";
    let mimeType = "text/plain";

    switch (format) {
      case "txt":
        content = transcriber.output.text;
        filename = `${title || "转录"}.txt`;
        break;
      case "srt":
        content = generateSRT(transcriber.output.chunks);
        filename = `${title || "转录"}.srt`;
        break;
      case "vtt":
        content = "WEBVTT\n\n" + generateVTT(transcriber.output.chunks);
        filename = `${title || "转录"}.vtt`;
        break;
      case "doc":
        content = generateDocContent(transcriber.output.text, transcriber.output.chunks);
        filename = `${title || "转录"}.doc`;
        mimeType = "application/msword";
        break;
      case "json":
        content = JSON.stringify({
          text: transcriber.output.text,
          chunks: transcriber.output.chunks,
          model: transcriber.model,
          language: transcriber.language,
        }, null, 2);
        filename = `${title || "转录"}.json`;
        mimeType = "application/json";
        break;
    }

    const blob = new Blob([content], { type: mimeType + ";charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${filename}`);
  }

  // AI actions
  async function runAiAction(action: string) {
    if (!transcriber.output?.text) return;
    setAiLoading(true);
    setAiAction(action);
    setAiResult("");

    const prompts: Record<string, string> = {
      summarize: "请对以下转录内容进行总结，提取关键要点，用中文回复：\n\n",
      xiaohongshu: "请将以下内容改写成小红书图文风格。要求：有吸引力的标题（加emoji），分段清晰，每段用emoji开头，结尾加相关标签（#开头），语言口语化有网感，用中文回复：\n\n",
      script: "请将以下内容改编成短视频脚本格式。要求：包含画面描述（用【】括起来）、旁白/台词、镜头切换建议，适合抖音/视频号，用中文回复：\n\n",
    };

    try {
      const res = await fetch("/api/ai/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: transcriber.output.text,
          action,
          prompt: prompts[action] || "",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiResult(data.result);
      } else {
        const err = await res.json();
        toast.error(err.error || "AI 处理失败");
      }
    } catch (err) {
      toast.error("AI 处理失败");
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Tab Switcher */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab("record")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "record"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          🎤 录音
        </button>
        <button
          onClick={() => setActiveTab("upload")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "upload"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          📁 上传文件
        </button>
      </div>

      {/* Input Area */}
      {!transcriber.output ? (
        <div className="bg-white rounded-lg shadow-sm p-8">
          {activeTab === "record" ? (
            <div className="text-center">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={transcriber.isModelLoading}
                  className="inline-flex items-center justify-center w-24 h-24 bg-red-500 hover:bg-red-600 text-white rounded-full text-3xl shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                  {transcriber.isModelLoading ? "⏳" : "🎤"}
                </button>
              ) : (
                <div>
                  <div className="text-4xl font-mono text-gray-900 mb-4">
                    {formatTime(recordingTime)}
                  </div>
                  <div className="flex items-center justify-center space-x-2 mb-6">
                    <span className="w-2 h-8 bg-red-500 rounded animate-pulse" />
                    <span className="text-red-500 text-sm font-medium">录制中...</span>
                  </div>
                  <button
                    onClick={stopRecording}
                    className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-full font-medium"
                  >
                    停止录制
                  </button>
                </div>
              )}
              {transcriber.isModelLoading && (
                <p className="mt-4 text-sm text-gray-500">正在加载 AI 模型，请稍候...</p>
              )}
              {transcriber.progressItems.length > 0 && (
                <div className="mt-4">
                  {transcriber.progressItems.map((item) => (
                    <div key={item.file} className="text-sm text-gray-500">
                      {item.file}: {Math.round(item.progress || 0)}%
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={transcriber.isModelLoading}
                className="inline-flex flex-col items-center justify-center w-64 h-48 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <span className="text-4xl mb-3">📁</span>
                <span className="text-sm text-gray-600">
                  {transcriber.isModelLoading ? "模型加载中..." : "点击上传音频或视频"}
                </span>
                <span className="text-xs text-gray-400 mt-1">
                  支持 MP3, WAV, M4A, MP4, MOV, WebM 等
                </span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Results Area */
        <div className="space-y-6">
          {/* Title Input */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入转录标题..."
              className="w-full text-lg font-medium border-0 outline-none text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* Transcription Text */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">转录结果</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => transcriber.onInputChange()}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
                >
                  重新转录
                </button>
                <button
                  onClick={saveTranscription}
                  disabled={saving}
                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </div>

            {/* Text with timestamps */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {transcriber.output.chunks?.map((chunk, i) => (
                <div key={i} className="flex group hover:bg-gray-50 rounded px-2 py-1 -mx-2">
                  <span className="text-xs text-gray-400 w-16 flex-shrink-0 pt-0.5 font-mono">
                    {chunk.timestamp[0] != null
                      ? formatTime(Math.floor(chunk.timestamp[0]))
                      : "--:--"}
                  </span>
                  <span className="text-sm text-gray-800">{chunk.text}</span>
                </div>
              ))}
            </div>
            {transcriber.isBusy && (
              <div className="mt-2 text-sm text-blue-500 animate-pulse">转录中...</div>
            )}
          </div>

          {/* Export */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3">导出格式</h3>
            <div className="flex flex-wrap gap-2">
              {["txt", "doc", "srt", "vtt", "json"].map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => exportAs( fmt)}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  {fmt === "txt" && "📄 TXT"}
                  {fmt === "doc" && "📝 DOC"}
                  {fmt === "srt" && "🎬 SRT 字幕"}
                  {fmt === "vtt" && "🎬 VTT 字幕"}
                  {fmt === "json" && "💾 JSON"}
                </button>
              ))}
            </div>
          </div>

          {/* AI Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3">AI 智能处理</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => runAiAction("summarize")}
                disabled={aiLoading}
                className="px-4 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 disabled:opacity-50 transition-colors"
              >
                🤖 {aiLoading && aiAction === "summarize" ? "处理中..." : "AI 智能总结"}
              </button>
              <button
                onClick={() => runAiAction("xiaohongshu")}
                disabled={aiLoading}
                className="px-4 py-2 text-sm bg-pink-50 text-pink-700 rounded-md hover:bg-pink-100 disabled:opacity-50 transition-colors"
              >
                📕 {aiLoading && aiAction === "xiaohongshu" ? "生成中..." : "生成小红书图文"}
              </button>
              <button
                onClick={() => runAiAction("script")}
                disabled={aiLoading}
                className="px-4 py-2 text-sm bg-orange-50 text-orange-700 rounded-md hover:bg-orange-100 disabled:opacity-50 transition-colors"
              >
                🎥 {aiLoading && aiAction === "script" ? "生成中..." : "生成视频脚本"}
              </button>
            </div>
            {aiResult && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">AI 生成结果</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const blob = new Blob([aiResult], { type: "text/plain;charset=utf-8" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${aiAction}-result.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      导出
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(aiResult).then(() => toast.success("已复制"))}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      复制
                    </button>
                  </div>
                </div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {aiResult}
                </div>
              </div>
            )}
          </div>

          {/* Raw Text */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <details className="text-sm">
              <summary className="text-gray-400 cursor-pointer hover:text-gray-600">
                查看完整文本
              </summary>
              <pre className="mt-3 text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {transcriber.output.text}
              </pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper: Generate SRT subtitle format
function generateSRT(chunks: { text: string; timestamp: [number, number | null] }[]): string {
  return chunks
    .map((chunk, i) => {
      const start = formatSRTTime(chunk.timestamp[0] || 0);
      const end = formatSRTTime(chunk.timestamp[1] || (chunk.timestamp[0] || 0) + 2);
      return `${i + 1}\n${start} --> ${end}\n${chunk.text.trim()}\n`;
    })
    .join("\n");
}

// Helper: Generate VTT subtitle format
function generateVTT(chunks: { text: string; timestamp: [number, number | null] }[]): string {
  return chunks
    .map((chunk) => {
      const start = formatVTTTime(chunk.timestamp[0] || 0);
      const end = formatVTTTime(chunk.timestamp[1] || (chunk.timestamp[0] || 0) + 2);
      return `${start} --> ${end}\n${chunk.text.trim()}\n`;
    })
    .join("\n");
}

// Helper: Generate DOC content
function generateDocContent(text: string, chunks: { text: string; timestamp: [number, number | null] }[]): string {
  const header = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>转录文档</title></head><body>`;
  const body = `<h1>转录内容</h1>` + chunks.map((c) => {
    const ts = c.timestamp[0] != null ? `[${formatTimeStr(c.timestamp[0])}]` : "";
    return `<p>${ts ? `<i>${ts}</i> ` : ""}${c.text}</p>`;
  }).join("\n");
  const footer = `</body></html>`;
  return header + body + footer;
}

function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
}

function formatVTTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}

function formatTimeStr(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
