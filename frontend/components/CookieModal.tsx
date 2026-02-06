"use client";


import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { FaCookieBite, FaSave, FaTimes } from "react-icons/fa";
import { API_BASE } from "@/lib/api";

export default function CookieModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [cookieContent, setCookieContent] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const saveCookies = async () => {
    try {
      setStatus("saving");
      const response = await fetch(`${API_BASE}/api/cookies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: cookieContent }),
      });

      if (!response.ok) throw new Error("Failed to save");

      setStatus("success");
      setTimeout(() => {
        setIsOpen(false);
        setStatus("idle");
      }, 1500);
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        title="Manage Cookies"
      >
        <FaCookieBite className="w-5 h-5 text-amber-600 dark:text-amber-500" />
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-left">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-text-primary">
                <FaCookieBite className="text-amber-500" />
                Age Verification (Cookies)
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-text-muted hover:text-text-primary"
              >
                <FaTimes />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              <p className="text-sm text-text-secondary">
                To download age-restricted videos (YouTube, Pornhub, etc.), paste your 
                <strong> Netscape-formatted cookies</strong> here.
              </p>
              <div className="text-xs bg-bg-tertiary p-2 rounded text-text-tertiary border border-border-default">
                Tip: Use extensions like{" "}
                <a 
                  href="https://addons.mozilla.org/en-US/firefox/addon/cookie-quick-manager/" 
                  target="_blank" 
                  rel="noreferrer"
                  className="underline hover:text-accent"
                >
                  Cookie Quick Manager
                </a> or similar to export cookies as "Netscape HTTP Cookie File".
              </div>

              <textarea
                value={cookieContent}
                onChange={(e) => setCookieContent(e.target.value)}
                placeholder="# Netscape HTTP Cookie File&#10;.youtube.com	TRUE	/	FALSE	1767890000	VISITOR_INFO1_LIVE	..."
                className="w-full h-48 p-3 text-xs font-mono bg-bg-input border border-border-default rounded-lg focus:ring-2 focus:ring-accent outline-none resize-none text-text-primary placeholder:text-text-muted"
                spellCheck={false}
              />
            </div>

            {/* Footer */}
            <div className="p-4 bg-bg-tertiary flex justify-end gap-2 text-sm border-t border-border-subtle">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
                disabled={status === "saving"}
              >
                Cancel
              </button>
              <button
                onClick={saveCookies}
                disabled={status === "saving" || !cookieContent}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all shadow-lg
                  ${status === "success" 
                    ? "bg-success text-white" 
                    : status === "error"
                    ? "bg-error text-white"
                    : "bg-accent hover:bg-accent-hover text-white shadow-accent/20"
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {status === "saving" && <span className="animate-spin">⏳</span>}
                {status === "success" && "Saved!"}
                {status === "error" && "Error"}
                {status === "idle" && (
                  <>
                    <FaSave /> Save Cookies
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
