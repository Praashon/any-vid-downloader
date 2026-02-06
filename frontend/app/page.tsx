import ThemeToggle from "@/components/ThemeToggle";
import VideoDownloader from "@/components/VideoDownloader";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col hero-glow">
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-bg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4 text-white"
            >
              <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
              <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-text-primary">
            Any<span className="gradient-text">Vid</span>
          </span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex flex-1 flex-col items-center px-5 pt-12 pb-16 sm:px-8 sm:pt-20">
        {/* Hero text */}
        <div
          className="mb-10 flex flex-col items-center gap-4 text-center animate-fade-in-down sm:mb-14"
          style={{ opacity: 0 }}
        >
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary sm:text-5xl lg:text-[3.25rem] lg:leading-tight">
            Download videos from{" "}
            <span className="gradient-text animate-gradient bg-[length:200%_200%]">
              anywhere
            </span>
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-text-tertiary sm:text-lg">
            Paste a link from any supported site. We will find the best
            available quality and let you download it instantly.
          </p>
        </div>

        {/* Downloader */}
        <div
          className="w-full max-w-3xl animate-fade-in-up"
          style={{ opacity: 0, animationDelay: "0.1s" }}
        >
          <VideoDownloader />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex flex-col items-center gap-2 border-t border-border-subtle px-6 py-6">
        <p className="text-xs text-text-muted">
          Powered by{" "}
          <a
            href="https://github.com/yt-dlp/yt-dlp"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-text-tertiary hover:text-accent transition-colors duration-200"
          >
            yt-dlp
          </a>
          {" "}and{" "}
          <a
            href="https://nextjs.org"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-text-tertiary hover:text-accent transition-colors duration-200"
          >
            Next.js
          </a>
        </p>
        <p className="text-[11px] text-text-muted/60">
          For personal use only. Respect copyright and terms of service of content providers.
        </p>
      </footer>

      {/* Background decorative elements */}
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        {/* Top-left gradient orb */}
        <div
          className="
            absolute -top-32 -left-32 h-96 w-96 rounded-full
            bg-accent/[0.04] blur-3xl
            dark:bg-accent/[0.03]
          "
        />
        {/* Bottom-right gradient orb */}
        <div
          className="
            absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full
            bg-purple-500/[0.03] blur-3xl
            dark:bg-purple-400/[0.02]
          "
        />
        {/* Center subtle line */}
        <div
          className="
            absolute left-1/2 top-0 h-full w-px -translate-x-1/2
            bg-gradient-to-b from-transparent via-border-subtle/40 to-transparent
            opacity-50
          "
        />
      </div>
    </div>
  );
}
