"use client";

import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";

type TabType = "record" | "upload";

export default function TranscribePage() {
  // UI state
  const [activeTab, setActiveTab] = useState<TabType>("record");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  // Results
  const [text, setText] = useState("");
  const [chunks, setChunks] = useState<{ text: string; timestamp: [number, number | null] }[]>([]);

  // AI state
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAction, setAiAction] = useState("");

  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  // Start recording with MediaRecorder
  async function startRecording() {
    setText(""); setChunks([]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus" : "audio/webm",
      });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
        transcribeAudio(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err: any) {
      toast.error("无法访问麦克风: " + (err?.message || "请检查权限"));
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
  }

  // Send audio to server for transcription
  async function transcribeAudio(blob: Blob) {
    setTranscribing(true);
    toast.loading("正在转录...", { id: "transcribe" });
    try {
      const formData = new FormData();
      formData.append("file", blob, "recording.webm");

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setText(data.text || "");
        setChunks(data.chunks || []);
        if (!data.text) {
          toast.error("转录结果为空，请重新录制", { id: "transcribe" });
        } else {
          toast.success("转录完成！", { id: "transcribe" });
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "转录失败", { id: "transcribe" });
      }
    } catch (err) {
      toast.error("上传失败，请检查网络", { id: "transcribe" });
    } finally {
      setTranscribing(false);
    }
  }

  // File upload
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setTitle(file.name.replace(/\.[^.]+$/, ""));

    setText(""); setChunks([]);
    setTranscribing(true);
    toast.loading("正在处理文件...", { id: "transcribe" });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setText(data.text || "");
        setChunks(data.chunks || []);
        if (!data.text) {
          toast.error("转录结果为空", { id: "transcribe" });
        } else {
          toast.success("转录完成！", { id: "transcribe" });
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "处理失败", { id: "transcribe" });
      }
    } catch (err) {
      toast.error("上传失败", { id: "transcribe" });
    } finally {
      setTranscribing(false);
    }
  }

  // Save to DB
  async function saveTranscription() {
    if (!text) { toast.error("没有可保存的内容"); return; }
    setSaving(true);
    try {
      const duration = recordingTime || Math.ceil(chunks[chunks.length - 1]?.timestamp[1] as number || 0);
      const res = await fetch("/api/transcriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || "未命名转录", text, chunks, duration, model: "whisper-1", language: "zh" }),
      });
      if (res.ok) toast.success("保存成功！");
      else toast.error("保存失败");
    } catch { toast.error("保存失败"); }
    finally { setSaving(false); }
  }

  // Export
  function exportAs(format: string) {
    if (!text) { toast.error("没有可导出的内容"); return; }
    let content = "", filename = `${title || "转录"}`, mimeType = "text/plain";

    switch (format) {
      case "txt":
        content = text; filename += ".txt"; break;
      case "srt":
        content = chunks.map((c, i) => `${i + 1}\n${fmtSRT(c.timestamp[0] || i * 2)} --> ${fmtSRT(c.timestamp[1] || i * 2 + 2)}\n${c.text}\n`).join("\n");
        filename += ".srt"; break;
      case "vtt":
        content = "WEBVTT\n\n" + chunks.map((c) => `${fmtVTT(c.timestamp[0] || 0)} --> ${fmtVTT(c.timestamp[1] || 2)}\n${c.text}\n`).join("\n");
        filename += ".vtt"; break;
      case "doc":
        content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><h1>${title || "转录"}</h1>` +
          chunks.map(c => `<p>[${fmtTime(c.timestamp[0] || 0)}] ${c.text}</p>`).join("") + "</body></html>";
        filename += ".doc"; mimeType = "application/msword"; break;
      case "json":
        content = JSON.stringify({ text, chunks }, null, 2); filename += ".json"; mimeType = "application/json"; break;
    }
    const blob = new Blob([content], { type: mimeType + ";charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
    toast.success(`已导出 ${filename}`);
  }

  // AI
  async function runAiAction(action: string) {
    if (!text) { toast.error("没有可处理的内容"); return; }
    setAiLoading(true); setAiAction(action); setAiResult("");
    const prompts: Record<string, string> = {
      summarize: "请对以下内容进行总结，提取关键要点，用中文回复：\n\n",
      xiaohongshu: "请将以下内容改写成小红书图文风格。要求：有吸引力的标题（加emoji），分段清晰，每段用emoji开头，结尾加相关标签（#开头），语言口语化有网感，用中文回复：\n\n",
      script: "请将以下内容改编成短视频脚本格式。要求：包含画面描述（用【】括起来）、旁白/台词、镜头切换建议，适合抖音/视频号，用中文回复：\n\n",
    };
    try {
      const res = await fetch("/api/ai/process", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, action, prompt: prompts[action] || "" }),
      });
      if (res.ok) { const d = await res.json(); setAiResult(d.result); }
      else { const e = await res.json(); toast.error(e.error || "AI 处理失败"); }
    } catch { toast.error("AI 处理失败"); }
    finally { setAiLoading(false); }
  }

  function formatTime(s: number) { const m = Math.floor(s / 60); const sec = s % 60; return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`; }
  const hasContent = !!text;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex border-b mb-6">
        <button onClick={() => setActiveTab("record")} className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === "record" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>🎤 实时录音</button>
        <button onClick={() => setActiveTab("upload")} className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === "upload" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>📁 上传文件</button>
      </div>

      {!hasContent ? (
        <div className="bg-white rounded-lg shadow-sm p-8">
          {activeTab === "record" ? (
            <div className="text-center">
              {transcribing ? (
                <div className="py-12">
                  <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-500">AI 正在转录中...</p>
                </div>
              ) : !isRecording ? (
                <button onClick={startRecording} className="inline-flex items-center justify-center w-24 h-24 bg-red-500 hover:bg-red-600 text-white rounded-full text-3xl shadow-lg transition-transform hover:scale-105 active:scale-95">🎤</button>
              ) : (
                <div>
                  <div className="text-5xl font-mono text-gray-900 mb-4">{formatTime(recordingTime)}</div>
                  <div className="flex items-center justify-center space-x-2 mb-6"><span className="w-2 h-8 bg-red-500 rounded animate-pulse" /><span className="text-red-500 font-medium">录制中...</span></div>
                  <button onClick={stopRecording} className="px-10 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-full font-medium text-lg">停止录制 & 转录</button>
                </div>
              )}
              <p className="mt-4 text-xs text-gray-400">发言结束后点停止，AI 会自动转为文字</p>
            </div>
          ) : (
            <div className="text-center">
              <input ref={fileInputRef} type="file" accept="audio/*,video/*" onChange={handleFileUpload} className="hidden" />
              {transcribing ? (
                <div className="py-12">
                  <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-500">AI 正在转录中...</p>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="inline-flex flex-col items-center justify-center w-64 h-48 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <span className="text-4xl mb-3">📁</span>
                  <span className="text-sm text-gray-600">点击上传音频或视频</span>
                  <span className="text-xs text-gray-400 mt-1">MP3, WAV, M4A, MP4, MOV, WebM 等</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="输入标题..." className="w-full text-lg font-medium border-0 outline-none text-gray-900 placeholder-gray-400" />
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">转录结果</h3>
              <div className="flex items-center space-x-2">
                <button onClick={() => { setText(""); setChunks([]); }} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">清除</button>
                <button onClick={saveTranscription} disabled={saving} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50">{saving ? "保存中..." : "保存"}</button>
              </div>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {chunks.map((chunk, i) => (
                <div key={i} className="flex group hover:bg-gray-50 rounded px-2 py-1 -mx-2">
                  <span className="text-xs text-gray-400 w-14 flex-shrink-0 pt-0.5 font-mono">{chunk.timestamp[0] != null ? formatTime(Math.floor(chunk.timestamp[0])) : "--:--"}</span>
                  <span className="text-sm text-gray-800">{chunk.text}</span>
                </div>
              ))}
              {chunks.length === 0 && <p className="text-gray-700 whitespace-pre-wrap">{text}</p>}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3">导出格式</h3>
            <div className="flex flex-wrap gap-2">
              {["txt", "doc", "srt", "vtt", "json"].map(f => (
                <button key={f} onClick={() => exportAs(f)} className="px-4 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50">
                  {{ txt: "📄 TXT", doc: "📝 DOC", srt: "🎬 SRT", vtt: "🎬 VTT", json: "💾 JSON" }[f]}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3">AI 智能处理</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => runAiAction("summarize")} disabled={aiLoading} className="px-4 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 disabled:opacity-50">
                🤖 {aiLoading && aiAction === "summarize" ? "处理中..." : "AI 智能总结"}
              </button>
              <button onClick={() => runAiAction("xiaohongshu")} disabled={aiLoading} className="px-4 py-2 text-sm bg-pink-50 text-pink-700 rounded-md hover:bg-pink-100 disabled:opacity-50">
                📕 {aiLoading && aiAction === "xiaohongshu" ? "生成中..." : "生成小红书图文"}
              </button>
              <button onClick={() => runAiAction("script")} disabled={aiLoading} className="px-4 py-2 text-sm bg-orange-50 text-orange-700 rounded-md hover:bg-orange-100 disabled:opacity-50">
                🎥 {aiLoading && aiAction === "script" ? "生成中..." : "生成视频脚本"}
              </button>
            </div>
            {aiResult && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">AI 生成结果</span>
                  <div className="flex gap-2">
                    <button onClick={() => { const b = new Blob([aiResult]); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = `${aiAction}-result.txt`; a.click(); URL.revokeObjectURL(u); }} className="text-xs text-blue-600">导出</button>
                    <button onClick={() => navigator.clipboard.writeText(aiResult).then(() => toast.success("已复制"))} className="text-xs text-blue-600">复制</button>
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

function fmtSRT(s: number): string { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = Math.floor(s % 60); const ms = Math.floor((s % 1) * 1000); return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`; }
function fmtVTT(s: number): string { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = Math.floor(s % 60); const ms = Math.floor((s % 1) * 1000); return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`; }
function fmtTime(s: number): string { const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}:${sec.toString().padStart(2, "0")}`; }
