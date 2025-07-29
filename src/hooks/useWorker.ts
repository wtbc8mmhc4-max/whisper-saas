"use client"

import { useState, useEffect } from "react";

export interface MessageEventHandler {
  (event: MessageEvent): void;
}

export function useWorker(messageEventHandler: MessageEventHandler): Worker | null {
  const [worker, setWorker] = useState<Worker | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const newWorker = createWorker(messageEventHandler);
      setWorker(newWorker);

      return () => {
        newWorker.terminate();
      };
    }
  }, [messageEventHandler]);

  return worker;
}

function createWorker(messageEventHandler: MessageEventHandler): Worker {
  const worker = new Worker(new URL("../utils/worker.js", import.meta.url), {
    type: "module",
  });
  
  worker.addEventListener("message", messageEventHandler);
  return worker;
}