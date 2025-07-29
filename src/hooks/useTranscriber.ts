"use client"

import { useCallback, useMemo, useState } from "react";
import { useWorker } from "./useWorker";
import { WHISPER_CONFIG } from "@/utils/constants";
import type { Transcriber, TranscriberData, ProgressItem } from "@/types";

interface TranscriberUpdateData {
  data: [
    string,
    { chunks: { text: string; timestamp: [number, number | null] }[] },
  ];
  text: string;
}

interface TranscriberCompleteData {
  data: {
    text: string;
    chunks: { text: string; timestamp: [number, number | null] }[];
  };
}

export function useTranscriber(): Transcriber {
  const [transcript, setTranscript] = useState<TranscriberData | undefined>(
    undefined,
  );
  const [isBusy, setIsBusy] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);

  const webWorker = useWorker((event) => {
    const message = event.data;
    
    switch (message.status) {
      case "progress":
        setProgressItems((prev) =>
          prev.map((item) => {
            if (item.file === message.file) {
              return { ...item, progress: message.progress };
            }
            return item;
          }),
        );
        break;
      case "update":
        const updateMessage = message as TranscriberUpdateData;
        setTranscript({
          isBusy: true,
          text: updateMessage.data[0],
          chunks: updateMessage.data[1].chunks,
        });
        break;
      case "complete":
        const completeMessage = message as TranscriberCompleteData;
        setTranscript({
          isBusy: false,
          text: completeMessage.data.text,
          chunks: completeMessage.data.chunks,
        });
        setIsBusy(false);
        break;
      case "initiate":
        setIsModelLoading(true);
        setProgressItems((prev) => [...prev, message]);
        break;
      case "ready":
        setIsModelLoading(false);
        break;
      case "error":
        setIsBusy(false);
        alert(
          `${message.data.message} This is most likely because you are using Safari on an M1/M2 Mac. Please try again from Chrome, Firefox, or Edge.\n\nIf this is not the case, please file a bug report.`,
        );
        break;
      case "done":
        setProgressItems((prev) =>
          prev.filter((item) => item.file !== message.file),
        );
        break;
      default:
        break;
    }
  });

  const [model, setModel] = useState<string>(WHISPER_CONFIG.DEFAULT_MODEL);
  const [subtask, setSubtask] = useState<string>(WHISPER_CONFIG.DEFAULT_SUBTASK);
  const [quantized, setQuantized] = useState<boolean>(
    WHISPER_CONFIG.DEFAULT_QUANTIZED,
  );
  const [multilingual, setMultilingual] = useState<boolean>(
    WHISPER_CONFIG.DEFAULT_MULTILINGUAL,
  );
  const [language, setLanguage] = useState<string>(
    WHISPER_CONFIG.DEFAULT_LANGUAGE,
  );

  const onInputChange = useCallback(() => {
    setTranscript(undefined);
  }, []);

  const postRequest = useCallback(
    async (audioData: AudioBuffer | undefined) => {
      if (audioData) {
        setTranscript(undefined);
        setIsBusy(true);

        let audio;
        if (audioData.numberOfChannels === 2) {
          const SCALING_FACTOR = Math.sqrt(2);

          const left = audioData.getChannelData(0);
          const right = audioData.getChannelData(1);

          audio = new Float32Array(left.length);
          for (let i = 0; i < audioData.length; ++i) {
            audio[i] = SCALING_FACTOR * (left[i] + right[i]) / 2;
          }
        } else {
          audio = audioData.getChannelData(0);
        }

        if (webWorker) {
          webWorker.postMessage({
            audio,
            model,
            multilingual,
            quantized,
            subtask: multilingual ? subtask : null,
            language:
              multilingual && language !== "auto" ? language : null,
          });
        }
      }
    },
    [webWorker, model, multilingual, quantized, subtask, language],
  );

  const transcriber = useMemo(() => {
    return {
      onInputChange,
      isBusy,
      isModelLoading,
      progressItems,
      start: postRequest,
      output: transcript,
      model,
      setModel,
      multilingual,
      setMultilingual,
      quantized,
      setQuantized,
      subtask,
      setSubtask,
      language,
      setLanguage,
    };
  }, [
    onInputChange,
    isBusy,
    isModelLoading,
    progressItems,
    postRequest,
    transcript,
    model,
    multilingual,
    quantized,
    subtask,
    language,
  ]);

  return transcriber;
}