"use client";

import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";

type TabType = "record" | "upload";

// Web Speech API based transcription
function useSpeechTranscriber() {
  const [text, setText] = useState("");
  const [chunks, setChunks] = useState<{ text: string; timestamp: [number, number | null] }[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const recognitionRef = useRef<any>(null);
  const startTimeRef = useRef(0);

  function start(audioBlob?: Blob) {
    if (audioBlob) {
      // File upload: use server-side processing later
      // For now, show what we have
      setIsBusy(true);
      processAudioFile(audioBlob);
      return;
    }
    setIsBusy(false);
  }

  async function processAudioFile(blob: Blob) {
    // For uploaded files, we can't use Web Speech API directly
    // Use a simple approach: convert to text placeholder
    // In production, this would call a server API
    toast("文件上传功能需要服务端转录，正在准备...");
    setIsBusy(false);
  }

  function clear() {
    setText("");
    setChunks([]);
    setIsBusy(false);
  }

  return { text, chunks, isBusy, setText, setChunks, setIsBusy, start, clear, startTimeRef };
}

export default function TranscribePage() {
  const transcriber = useSpeechTranscriber();

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>("record");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAction, setAiAction] = useState("");
  const [useWebSpeech, setUseWebSpeech] = useState(true);
  const [interimText, setInterimText] = useState("");

  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  // Web Speech API for real-time transcription
  async function startRecording() {
    console.log("startRecording called");
    transcriber.clear();
    setInterimText("");

    if (useWebSpeech) {
      // Use Web Speech API for real-time transcription
      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
          toast.error("您的浏览器不支持语音识别，请使用 Chrome 浏览器");
          return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = "zh-CN";
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          let interim = "";
          let final = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              final += result[0].transcript;
              // Add to chunks with timestamp
              const elapsed = (Date.now() - transcriber.startTimeRef.current) / 1000;
              transcriber.setChunks((prev: any) => [...prev, {
                text: result[0].transcript,
                timestamp: [elapsed - 2, elapsed] as [number, number | null],
              }]);
            } else {
              interim += result[0].transcript;
            }
          }

          if (final) {
            transcriber.setText((prev: string) => (prev ? prev + " " + final : final));
          }
          setInterimText(interim);
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          if (event.error === "not-allowed") {
            toast.error("请允许麦克风权限");
          } else if (event.error !== "no-speech") {
            toast.error("语音识别出错: " + event.error);
          }
        };

        recognition.onstart = () => {
          transcriber.startTimeRef.current = Date.now();
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsRecording(true);
        setRecordingTime(0);
        console.log("Web Speech recording started");
        return; // Don't also record audio with MediaRecorder
      } catch (err: any) {
        console.error("Speech recognition error:", err);
        toast.error("语音识别启动失败: " + (err?.message || ""));
        return;
      }
    }

    // Fallback: MediaRecorder for audio capture (no live transcription)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus" : "audio/webm",
      });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        transcriber.start(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err: any) {
      console.error("recording error:", err);
      toast.error("无法访问麦克风: " + (err?.message || "请检查权限"));
    }
  }

  function stopRecording() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
    toast.success("录制完成");
  }

  // Handle file upload
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setTitle(file.name.replace(/\.[^.]+$/, ""));
    toast.success(`已选择: ${file.name}（服务端转录功能即将上线）`);
  }

  // Save to DB
  async function saveTranscription() {
    if (!transcriber.text) { toast.error("没有可保存的内容"); return; }
    setSaving(true);
    try {
      const duration = recordingTime || Math.ceil((transcriber.chunks[transcriber.chunks.length - 1]?.timestamp[1] as number) || 0);
      const res = await fetch("/api/transcriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "未命名转录",
          text: transcriber.text,
          chunks: transcriber.chunks,
          duration,
          model: "webspeech",
          language: "zh-CN",
        }),
      });
      if (res.ok) toast.success("保存成功！");
      else toast.error("保存失败");
    } catch (err) {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  }

  // Export
  function exportAs(format: string) {
    const text = transcriber.text;
    if (!text) { toast.error("没有可导出的内容"); return; }
    let content = "";
    let filename = `${title || "转录"}`;
    let mimeType = "text/plain";

    switch (format) {
      case "txt":
        content = text;
        filename += ".txt";
        break;
      case "srt":
        content = transcriber.chunks.map((c, i) => {
          const s = fmtSRT(c.timestamp[0] || i * 2);
          const e = fmtSRT(c.timestamp[1] || (i * 2 + 2));
          return `${i + 1}\n${s} --> ${e}\n${c.text}\n`;
        }).join("\n");
        filename += ".srt";
        break;
      case "vtt":
        content = "WEBVTT\n\n" + transcriber.chunks.map((c) => {
          const s = fmtVTT(c.timestamp[0] || 0);
          const e = fmtVTT(c.timestamp[1] || 2);
          return `${s} --> ${e}\n${c.text}\n`;
        }).join("\n");
        filename += ".vtt";
        break;
      case "doc":
        content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><h1>${title || "转录"}</h1>` +
          transcriber.chunks.map(c => `<p>[${fmtTime(c.timestamp[0] || 0)}] ${c.text}</p>`).join("") + "</body></html>";
        filename += ".doc";
        mimeType = "application/msword";
        break;
      case "json":
        content = JSON.stringify({ text, chunks: transcriber.chunks }, null, 2);
        filename += ".json";
        mimeType = "application/json";
        break;
    }

    const blob = new Blob([content], { type: mimeType + ";charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${filename}`);
  }

  // AI actions
  async function runAiAction(action: string) {
    if (!transcriber.text) { toast.error("没有可处理的内容"); return; }
    setAiLoading(true); setAiAction(action); setAiResult("");

    const prompts: Record<string, string> = {
      summarize: "请对以下内容进行总结，提取关键要点，用中文回复：\n\n",
      xiaohongshu: "请将以下内容改写成小红书图文风格。要求：有吸引力的标题（加emoji），分段清晰，每段用emoji开头，结尾加相关标签（#开头），语言口语化有网感，用中文回复：\n\n",
      script: "请将以下内容改编成短视频脚本格式。要求：包含画面描述（用【】括起来）、旁白/台词、镜头切换建议，适合抖音/视频号，用中文回复：\n\n",
    };

    try {
      const res = await fetch("/api/ai/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcriber.text, action, prompt: prompts[action] || "" }),
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
    } finally {
      setAiLoading(false);
    }
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  const hasContent = !!transcriber.text;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Tab Switcher */}
      <div className="flex border-b mb-6">
        <button onClick={() => setActiveTab("record")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "record" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
          🎤 实时录音
        </button>
        <button onClick={() => setActiveTab("upload")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "upload" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
          📁 上传文件
        </button>
      </div>

      {/* Input Area */}
      {!hasContent ? (
        <div className="bg-white rounded-lg shadow-sm p-8">
          {activeTab === "record" ? (
            <div className="text-center">
              {/* Mode toggle */}
              <div className="mb-6">
                <label className="inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={useWebSpeech} onChange={(e) => setUseWebSpeech(e.target.checked)} className="sr-only peer" />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ms-3 text-sm text-gray-500">实时语音识别 {useWebSpeech ? "✅" : "❌"}</span>
                </label>
              </div>

              {!isRecording ? (
                <button onClick={startRecording}
                  className="inline-flex items-center justify-center w-24 h-24 bg-red-500 hover:bg-red-600 text-white rounded-full text-3xl shadow-lg transition-transform hover:scale-105 active:scale-95">
                  🎤
                </button>
              ) : (
                <div>
                  <div className="text-4xl font-mono text-gray-900 mb-4">{formatTime(recordingTime)}</div>
                  <div className="flex items-center justify-center space-x-2 mb-6">
                    <span className="w-2 h-8 bg-red-500 rounded animate-pulse" />
                    <span className="text-red-500 text-sm font-medium">录制中...</span>
                  </div>
                  {/* Interim text */}
                  {interimText && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-400 italic max-w-md mx-auto">
                      {interimText}
                    </div>
                  )}
                  <button onClick={stopRecording}
                    className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-full font-medium">
                    停止录制
                  </button>
                </div>
              )}
              {!useWebSpeech && (
                <p className="mt-4 text-xs text-gray-400">
                  关闭实时识别将只录制音频，不显示实时文字
                </p>
              )}
            </div>
          ) : (
            <div className="text-center">
              <input ref={fileInputRef} type="file" accept="audio/*,video/*" onChange={handleFileUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()}
                className="inline-flex flex-col items-center justify-center w-64 h-48 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <span className="text-4xl mb-3">📁</span>
                <span className="text-sm text-gray-600">点击上传音频或视频</span>
                <span className="text-xs text-gray-400 mt-1">MP3, WAV, M4A, MP4, MOV, WebM 等</span>
              </button>
              <p className="mt-4 text-xs text-gray-400">
                ⚠️ 服务端转录功能即将上线，目前请使用实时录音
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Results */
        <div className="space-y-6">
          {/* Title */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="输入转录标题..." className="w-full text-lg font-medium border-0 outline-none text-gray-900 placeholder-gray-400" />
          </div>

          {/* Text */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">转录结果</h3>
              <div className="flex items-center space-x-2">
                <button onClick={() => { transcriber.clear(); setInterimText(""); }}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">重新转录</button>
                <button onClick={saveTranscription} disabled={saving}
                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50">
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {transcriber.chunks.map((chunk, i) => (
                <div key={i} className="flex group hover:bg-gray-50 rounded px-2 py-1 -mx-2">
                  <span className="text-xs text-gray-400 w-14 flex-shrink-0 pt-0.5 font-mono">
                    {chunk.timestamp[0] != null ? formatTime(Math.floor(chunk.timestamp[0])) : "--:--"}
                  </span>
                  <span className="text-sm text-gray-800">{chunk.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Export */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3">导出格式</h3>
            <div className="flex flex-wrap gap-2">
              {["txt", "doc", "srt", "vtt", "json"].map((fmt) => (
                <button key={fmt} onClick={() => exportAs(fmt)}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                  {{ txt: "📄 TXT", doc: "📝 DOC", srt: "🎬 SRT 字幕", vtt: "🎬 VTT 字幕", json: "💾 JSON" }[fmt]}
                </button>
              ))}
            </div>
          </div>

          {/* AI */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3">AI 智能处理</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => runAiAction("summarize")} disabled={aiLoading}
                className="px-4 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 disabled:opacity-50">
                🤖 {aiLoading && aiAction === "summarize" ? "处理中..." : "AI 智能总结"}
              </button>
              <button onClick={() => runAiAction("xiaohongshu")} disabled={aiLoading}
                className="px-4 py-2 text-sm bg-pink-50 text-pink-700 rounded-md hover:bg-pink-100 disabled:opacity-50">
                📕 {aiLoading && aiAction === "xiaohongshu" ? "生成中..." : "生成小红书图文"}
              </button>
              <button onClick={() => runAiAction("script")} disabled={aiLoading}
                className="px-4 py-2 text-sm bg-orange-50 text-orange-700 rounded-md hover:bg-orange-100 disabled:opacity-50">
                🎥 {aiLoading && aiAction === "script" ? "生成中..." : "生成视频脚本"}
              </button>
            </div>
            {aiResult && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">AI 生成结果</span>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      const blob = new Blob([aiResult], { type: "text/plain;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url; a.download = `${aiAction}-result.txt`;
                      a.click(); URL.revokeObjectURL(url);
                    }} className="text-xs text-blue-600 hover:text-blue-800">导出</button>
                    <button onClick={() => navigator.clipboard.writeText(aiResult).then(() => toast.success("已复制"))}
                      className="text-xs text-blue-600 hover:text-blue-800">复制</button>
                  </div>
                </div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{aiResult}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Formatting helpers
function fmtSRT(s: number): string {
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60); const ms = Math.floor((s % 1) * 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
}
function fmtVTT(s: number): string {
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60); const ms = Math.floor((s % 1) * 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}
function fmtTime(s: number): string {
  const m = Math.floor(s / 60); const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
