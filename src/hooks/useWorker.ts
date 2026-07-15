"use client"

import { useState, useEffect, useRef } from "react";

export interface MessageEventHandler {
  (event: MessageEvent): void;
}

export function useWorker(messageEventHandler: MessageEventHandler): Worker | null {
  const [worker, setWorker] = useState<Worker | null>(null);
  const handlerRef = useRef(messageEventHandler);

  // Keep handler ref updated without re-creating the worker
  useEffect(() => {
    handlerRef.current = messageEventHandler;
  }, [messageEventHandler]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let newWorker: Worker | null = null;

    try {
      newWorker = new Worker(new URL("../utils/worker.js", import.meta.url), {
        type: "module",
      });
      newWorker.addEventListener("message", (event) => {
        handlerRef.current(event);
      });
      setWorker(newWorker);
      console.log("Worker created successfully");
    } catch (err) {
      console.error("Failed to create worker:", err);
      setWorker(null);
    }

    return () => {
      if (newWorker) {
        newWorker.terminate();
      }
    };
  }, []); // Only create worker once on mount

  return worker;
}
