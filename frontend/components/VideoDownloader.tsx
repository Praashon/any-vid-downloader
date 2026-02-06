"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { fetchVideoInfo } from "@/lib/api";
import { getErrorMessage } from "@/lib/types";
import type { VideoInfo as VideoInfoType, AppState } from "@/lib/types";
import LoadingSpinner from "./LoadingSpinner";
import VideoInfo from "./VideoInfo";
import FormatButtons from "./FormatButtons";

const DEBOUNCE_MS = 600;

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function VideoDownloader() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<AppState>("idle");
  const [videoInfo, setVideoInfo] = useState<VideoInfoType | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const clearState = useCallback(() => {
    setVideoInfo(null);
    setErrorMessage("");
    setState("idle");
  }, []);

  const doFetch = useCallback(async (videoUrl: string) => {
    // Cancel any in-flight request
    if (abortController.current) {
      abortController.current.abort();
    }

    const controller = new AbortController();
    abortController.current = controller;

    setState("loading");
    setVideoInfo(null);
    setErrorMessage("");

    try {
      const data = await fetchVideoInfo(videoUrl, controller.signal);

      if (controller.signal.aborted) return;

      if (data.success) {
        setVideoInfo(data as VideoInfoType);
        setState("success");
      } else {
        const errData = data as { error: string; error_type: string };
        setErrorMessage(getErrorMessage(errData.error_type, errData.error));
        setState("error");
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setErrorMessage(
        "Could not connect to the server. Make sure the backend is running."
      );
      setState("error");
    }
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setUrl(value);

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      const trimmed = value.trim();
      if (!trimmed) {
        clearState();
        return;
      }

      if (!isValidUrl(trimmed)) {
        // Don't show error while typing, just stay idle
        if (state !== "idle") clearState();
        return;
      }

      debounceTimer.current = setTimeout(() => {
        doFetch(trimmed);
      }, DEBOUNCE_MS);
    },
    [doFetch, clearState, state]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pasted = e.clipboardData.getData("text").trim();
      if (pasted && isValidUrl(pasted)) {
        // Immediately fetch on paste without debounce
        setUrl(pasted);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        doFetch(pasted);
      }
    },
    [doFetch]
  );

  const handleClear = useCallback(() => {
    setUrl("");
    clearState();
    if (abortController.current) {
      abortController.current.abort();
    }
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    inputRef.current?.focus();
  }, [clearState]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = url.trim();
      if (trimmed && isValidUrl(trimmed)) {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        doFetch(trimmed);
      }
    },
    [url, doFetch]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (abortController.current) abortController.current.abort();
    };
  }, []);

  return (
    <div className="flex w-full flex-col items-center gap-8">
      {/* URL Input */}
      <form onSubmit={handleSubmit} className="w-full max-w-2xl">
        <div
          className={`
            relative flex items-center
            rounded-2xl border
            bg-bg-input
            transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
            ${
              isFocused
                ? "border-border-focus bg-bg-input-focus input-shadow ring-1 ring-accent/10"
                : "border-border-default input-shadow"
            }
            ${state === "error" ? "border-error/40" : ""}
          `}
        >
          {/* Search/Link icon */}
          <div className="flex items-center pl-5 pr-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`
                h-5 w-5 transition-colors duration-200
                ${isFocused ? "text-accent" : "text-text-muted"}
              `}
            >
              <path d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z" />
              <path d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z" />
            </svg>
          </div>

          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => handleInputChange(e.target.value)}
            onPaste={handlePaste}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Paste any video URL here..."
            autoComplete="off"
            spellCheck={false}
            className="
              flex-1 bg-transparent py-4 pr-2 pl-2
              text-base text-text-primary
              placeholder:text-text-muted
              outline-none
              sm:text-lg
            "
          />

          {/* Loading indicator in input */}
          {state === "loading" && (
            <div className="flex items-center pr-3">
              <div className="h-5 w-5 spinner-ring" />
            </div>
          )}

          {/* Clear button */}
          {url && state !== "loading" && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear URL"
              className="
                mr-3 flex h-7 w-7 items-center justify-center
                rounded-lg text-text-muted
                transition-smooth
                hover:bg-bg-tertiary hover:text-text-secondary
                focus-ring cursor-pointer
              "
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          )}
        </div>

        {/* Supported sites hint */}
        {state === "idle" && !url && (
          <div
            className="
              mt-3 flex items-center justify-center gap-1.5
              text-xs text-text-muted
              animate-fade-in
            "
            style={{ opacity: 0 }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="h-3.5 w-3.5"
            >
              <path
                fillRule="evenodd"
                d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              Supports YouTube, Instagram, Twitter/X, TikTok, Facebook, and
              thousands more
            </span>
          </div>
        )}
      </form>

      {/* Loading state */}
      {state === "loading" && (
        <div
          className="
            flex flex-col items-center gap-4 py-8
            animate-fade-in
          "
          style={{ opacity: 0 }}
        >
          <LoadingSpinner size="lg" variant="ring" />
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-sm font-medium text-text-secondary">
              Analyzing video...
            </p>
            <p className="text-xs text-text-muted">
              This may take a few seconds depending on the source
            </p>
          </div>
          {/* Progress bar */}
          <div className="relative mt-1 h-1 w-48 overflow-hidden rounded-full bg-bg-tertiary">
            <div className="progress-bar-indeterminate absolute inset-0" />
          </div>
        </div>
      )}

      {/* Error state */}
      {state === "error" && (
        <div
          className="
            animate-scale-in w-full max-w-2xl
            flex items-start gap-3.5
            rounded-2xl border border-error/20
            bg-error/5 p-5
          "
          style={{ opacity: 0 }}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-error/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5 text-error"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-sm font-semibold text-error">
              Could not process this URL
            </p>
            <p className="text-sm text-text-tertiary leading-relaxed">
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      {/* Success state */}
      {state === "success" && videoInfo && (
        <div className="w-full max-w-3xl flex flex-col items-center gap-8">
          <VideoInfo info={videoInfo} />
          <FormatButtons formats={videoInfo.formats} title={videoInfo.title} />
        </div>
      )}
    </div>
  );
}
