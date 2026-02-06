export interface FormatInfo {
  format_id: string;
  label: string;
  quality: string;
  extension: string;
  filesize: number | null;
  filesize_approx: number | null;
  is_audio: boolean;
  is_video_only: boolean;
  has_video: boolean;
  has_audio: boolean;
  height: number | null;
  width: number | null;
  fps: number | null;
  vcodec: string | null;
  acodec: string | null;
  tbr: number | null;
  abr: number | null;
  url: string;
}

export interface VideoInfo {
  success: true;
  title: string;
  thumbnail: string | null;
  duration: number | null;
  duration_string: string;
  uploader: string;
  uploader_url: string | null;
  webpage_url: string;
  view_count: number | null;
  upload_date: string | null;
  description: string | null;
  extractor: string;
  formats: FormatInfo[];
}

export interface ErrorInfo {
  success: false;
  error: string;
  error_type: string;
}

export type ApiResponse = VideoInfo | ErrorInfo;

export type AppState = "idle" | "loading" | "success" | "error";

export type Theme = "light" | "dark";

export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatViewCount(count: number | null): string {
  if (count === null || count === undefined) return "";
  if (count >= 1_000_000_000)
    return `${(count / 1_000_000_000).toFixed(1)}B views`;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K views`;
  return `${count} views`;
}

export function formatUploadDate(dateStr: string | null): string {
  if (!dateStr || dateStr.length !== 8) return "";
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  const date = new Date(`${year}-${month}-${day}`);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getErrorMessage(errorType: string, fallback: string): string {
  const messages: Record<string, string> = {
    private_video:
      "This video is private. You may need to sign in or use a cookies file.",
    age_restricted:
      "This video is age-restricted. Try providing a cookies.txt file from an authenticated session.",
    unsupported_site:
      "This website is not supported. Try a different URL or check if the URL is correct.",
    unavailable:
      "This video is no longer available. It may have been removed or taken down.",
    copyright:
      "This video is unavailable due to a copyright claim.",
    timeout:
      "The request took too long. The server might be slow or the video is very large. Try again.",
    geo_restricted:
      "This video is not available in your region. Try using a VPN or proxy.",
    rate_limit:
      "Too many requests. Please wait a moment before trying again.",
    server_error:
      "Something went wrong on our end. Please try again in a moment.",
  };
  return messages[errorType] || fallback;
}
