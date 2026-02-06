"use client";

import { formatViewCount, formatUploadDate } from "@/lib/types";
import type { VideoInfo as VideoInfoType } from "@/lib/types";

interface VideoInfoProps {
  info: VideoInfoType;
}

export default function VideoInfo({ info }: VideoInfoProps) {
  const hasMetadata =
    info.duration_string ||
    info.uploader ||
    info.view_count !== null ||
    info.upload_date;

  return (
    <div className="animate-fade-in-up w-full" style={{ opacity: 0 }}>
      <div
        className="
          glass card-shadow rounded-2xl overflow-hidden
          transition-smooth
        "
      >
        <div className="flex flex-col sm:flex-row gap-0">
          {/* Thumbnail */}
          {info.thumbnail && (
            <div className="relative sm:w-80 shrink-0">
              <div className="thumbnail-container aspect-video sm:aspect-auto sm:h-full">
                <img
                  src={info.thumbnail}
                  alt={info.title}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
                {/* Duration badge */}
                {info.duration_string && (
                  <div
                    className="
                      absolute bottom-2.5 right-2.5
                      rounded-md bg-black/75 px-2 py-0.5
                      text-xs font-medium text-white
                      backdrop-blur-sm
                    "
                  >
                    {info.duration_string}
                  </div>
                )}
                {/* Gradient overlay on thumbnail */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>
          )}

          {/* Info */}
          <div className="flex flex-1 flex-col justify-center gap-3 p-5 sm:p-6 min-w-0">
            {/* Extractor badge */}
            {info.extractor && (
              <div className="flex items-center gap-2">
                <span
                  className="
                    inline-flex items-center rounded-full
                    bg-accent-subtle border border-accent/10
                    px-2.5 py-0.5 text-[11px] font-semibold uppercase
                    tracking-wider text-accent
                  "
                >
                  {info.extractor}
                </span>
              </div>
            )}

            {/* Title */}
            <h2
              className="
                text-lg sm:text-xl font-semibold leading-snug
                text-text-primary line-clamp-3
              "
              title={info.title}
            >
              {info.title}
            </h2>

            {/* Metadata row */}
            {hasMetadata && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-text-tertiary">
                {/* Uploader */}
                {info.uploader && (
                  <div className="flex items-center gap-1.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4 shrink-0 text-text-muted"
                    >
                      <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
                    </svg>
                    {info.uploader_url ? (
                      <a
                        href={info.uploader_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="
                          font-medium text-text-secondary
                          hover:text-accent transition-colors duration-200
                          truncate max-w-[200px]
                        "
                      >
                        {info.uploader}
                      </a>
                    ) : (
                      <span className="font-medium text-text-secondary truncate max-w-[200px]">
                        {info.uploader}
                      </span>
                    )}
                  </div>
                )}

                {/* View count */}
                {info.view_count !== null && info.view_count > 0 && (
                  <div className="flex items-center gap-1.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4 shrink-0 text-text-muted"
                    >
                      <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                      <path
                        fillRule="evenodd"
                        d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{formatViewCount(info.view_count)}</span>
                  </div>
                )}

                {/* Upload date */}
                {info.upload_date && (
                  <div className="flex items-center gap-1.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4 shrink-0 text-text-muted"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{formatUploadDate(info.upload_date)}</span>
                  </div>
                )}

                {/* Duration (text, shown if no thumbnail) */}
                {!info.thumbnail && info.duration_string && (
                  <div className="flex items-center gap-1.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4 shrink-0 text-text-muted"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{info.duration_string}</span>
                  </div>
                )}
              </div>
            )}

            {/* Description preview */}
            {info.description && (
              <p
                className="
                  text-[13px] leading-relaxed text-text-muted
                  line-clamp-2 mt-0.5
                "
              >
                {info.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
