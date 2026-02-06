"use client";

import { formatFileSize } from "@/lib/types";
import { buildDownloadUrl } from "@/lib/api";
import type { FormatInfo } from "@/lib/types";

interface FormatButtonsProps {
  formats: FormatInfo[];
  title: string;
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className || "h-4 w-4"}
    >
      <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
      <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
    </svg>
  );
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className || "h-4 w-4"}
    >
      <path d="M3.25 4A2.25 2.25 0 0 0 1 6.25v7.5A2.25 2.25 0 0 0 3.25 16h7.5A2.25 2.25 0 0 0 13 13.75v-7.5A2.25 2.25 0 0 0 10.75 4h-7.5ZM19 4.75a.75.75 0 0 0-1.28-.53l-3 3a.75.75 0 0 0-.22.53v4.5c0 .199.079.39.22.53l3 3A.75.75 0 0 0 19 15.25v-10.5Z" />
    </svg>
  );
}

function AudioIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className || "h-4 w-4"}
    >
      <path d="M10 3.75a.75.75 0 0 0-1.264-.546L4.703 7H3.167a.75.75 0 0 0-.7.48A6.985 6.985 0 0 0 2 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h1.535l4.033 3.796A.75.75 0 0 0 10 16.25V3.75ZM15.95 5.05a.75.75 0 0 0-1.06 1.061 5.5 5.5 0 0 1 0 7.778.75.75 0 0 0 1.06 1.06 7 7 0 0 0 0-9.899Z" />
      <path d="M13.829 7.172a.75.75 0 0 0-1.061 1.06 2.5 2.5 0 0 1 0 3.536.75.75 0 0 0 1.06 1.06 4 4 0 0 0 0-5.656Z" />
    </svg>
  );
}

function QualityBadge({ quality, isBest }: { quality: string; isBest: boolean }) {
  if (!quality) return null;

  const isHighRes = ["4K", "1440p", "1080p"].includes(quality.split(" ")[0]);

  return (
    <span
      className={`
        inline-flex items-center rounded-md px-1.5 py-0.5
        text-[10px] font-bold uppercase tracking-wider leading-none
        ${
          isBest
            ? "bg-accent/15 text-accent border border-accent/20"
            : isHighRes
              ? "bg-success/10 text-success border border-success/15"
              : "bg-bg-tertiary text-text-muted border border-border-subtle"
        }
      `}
    >
      {isBest ? "BEST" : quality.split(" ")[0]}
    </span>
  );
}

interface FormatCardProps {
  format: FormatInfo;
  title: string;
  index: number;
  isBest: boolean;
}

function FormatCard({ format, title, index, isBest }: FormatCardProps) {
  const downloadUrl = buildDownloadUrl(format.url, title, format.extension);
  const size = formatFileSize(format.filesize || format.filesize_approx);

  const icon = format.is_audio ? (
    <AudioIcon className="h-4 w-4 shrink-0" />
  ) : (
    <VideoIcon className="h-4 w-4 shrink-0" />
  );

  const staggerClass = index < 8 ? `stagger-${index + 1}` : "stagger-8";

  return (
    <a
      href={downloadUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        format-btn group
        flex items-center gap-3
        rounded-xl border border-border-default
        bg-bg-card px-4 py-3.5
        card-shadow focus-ring
        animate-fade-in-up
        ${staggerClass}
        ${isBest ? "border-accent/30 bg-accent-subtle" : ""}
      `}
      style={{ opacity: 0 }}
    >
      {/* Icon */}
      <div
        className={`
          flex h-9 w-9 shrink-0 items-center justify-center rounded-lg
          transition-smooth
          ${
            isBest
              ? "gradient-bg text-white"
              : format.is_audio
                ? "bg-purple-500/10 text-purple-500 dark:bg-purple-400/10 dark:text-purple-400"
                : "bg-accent-subtle text-accent"
          }
          group-hover:scale-110
        `}
      >
        {icon}
      </div>

      {/* Label + details */}
      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="
              text-sm font-medium text-text-primary
              truncate
              group-hover:text-accent transition-colors duration-200
            "
          >
            {format.label}
          </span>
          <QualityBadge quality={format.quality} isBest={isBest} />
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className="uppercase">{format.extension}</span>
          {size && (
            <>
              <span className="text-border-default">|</span>
              <span>{size}</span>
            </>
          )}
          {format.fps && format.fps > 0 && (
            <>
              <span className="text-border-default">|</span>
              <span>{Math.round(format.fps)}fps</span>
            </>
          )}
        </div>
      </div>

      {/* Download icon */}
      <div
        className="
          flex h-8 w-8 shrink-0 items-center justify-center
          rounded-lg bg-bg-tertiary
          text-text-muted
          transition-smooth
          group-hover:bg-accent group-hover:text-white
          group-hover:shadow-md
        "
      >
        <DownloadIcon className="h-4 w-4" />
      </div>
    </a>
  );
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  formats: FormatInfo[];
  videoTitle: string;
  showBestBadge?: boolean;
}

function FormatSection({
  title,
  icon,
  formats,
  videoTitle,
  showBestBadge = false,
}: SectionProps) {
  if (formats.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <span className="text-text-muted">{icon}</span>
        <h3 className="text-sm font-semibold text-text-secondary tracking-wide uppercase">
          {title}
        </h3>
        <span className="text-xs text-text-muted font-normal normal-case">
          ({formats.length})
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {formats.map((format, idx) => (
          <FormatCard
            key={format.format_id}
            format={format}
            title={videoTitle}
            index={idx}
            isBest={showBestBadge && idx === 0}
          />
        ))}
      </div>
    </div>
  );
}

export default function FormatButtons({ formats, title }: FormatButtonsProps) {
  if (formats.length === 0) {
    return (
      <div
        className="
          animate-fade-in flex flex-col items-center justify-center
          py-8 text-center
        "
        style={{ opacity: 0 }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 mb-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5 text-warning"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <p className="text-sm text-text-tertiary">
          No downloadable formats found for this video.
        </p>
      </div>
    );
  }

  // Categorize formats
  const merged: FormatInfo[] = [];
  const videoOnly: FormatInfo[] = [];
  const audioOnly: FormatInfo[] = [];

  for (const f of formats) {
    if (f.is_audio) {
      audioOnly.push(f);
    } else if (f.is_video_only) {
      videoOnly.push(f);
    } else {
      merged.push(f);
    }
  }

  return (
    <div
      className="animate-fade-in-up w-full space-y-6"
      style={{ opacity: 0, animationDelay: "0.15s" }}
    >
      {/* Section header */}
      <div className="flex items-center gap-3 px-1">
        <div className="h-px flex-1 bg-border-subtle" />
        <span className="text-xs font-medium text-text-muted uppercase tracking-widest">
          Download Options
        </span>
        <div className="h-px flex-1 bg-border-subtle" />
      </div>

      {/* Merged formats (video + audio) */}
      <FormatSection
        title="Video + Audio"
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M3.25 4A2.25 2.25 0 0 0 1 6.25v7.5A2.25 2.25 0 0 0 3.25 16h7.5A2.25 2.25 0 0 0 13 13.75v-7.5A2.25 2.25 0 0 0 10.75 4h-7.5ZM19 4.75a.75.75 0 0 0-1.28-.53l-3 3a.75.75 0 0 0-.22.53v4.5c0 .199.079.39.22.53l3 3A.75.75 0 0 0 19 15.25v-10.5Z" />
          </svg>
        }
        formats={merged}
        videoTitle={title}
        showBestBadge={true}
      />

      {/* Video only */}
      <FormatSection
        title="Video Only"
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.69l-2.22-2.219a.75.75 0 0 0-1.06 0l-1.91 1.909.47.47a.75.75 0 1 1-1.06 1.06L6.53 8.091a.75.75 0 0 0-1.06 0L2.5 11.06Z"
              clipRule="evenodd"
            />
          </svg>
        }
        formats={videoOnly}
        videoTitle={title}
      />

      {/* Audio only */}
      <FormatSection
        title="Audio Only"
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M10 3.75a.75.75 0 0 0-1.264-.546L4.703 7H3.167a.75.75 0 0 0-.7.48A6.985 6.985 0 0 0 2 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h1.535l4.033 3.796A.75.75 0 0 0 10 16.25V3.75ZM15.95 5.05a.75.75 0 0 0-1.06 1.061 5.5 5.5 0 0 1 0 7.778.75.75 0 0 0 1.06 1.06 7 7 0 0 0 0-9.899Z" />
            <path d="M13.829 7.172a.75.75 0 0 0-1.061 1.06 2.5 2.5 0 0 1 0 3.536.75.75 0 0 0 1.06 1.06 4 4 0 0 0 0-5.656Z" />
          </svg>
        }
        formats={audioOnly}
        videoTitle={title}
      />
    </div>
  );
}
