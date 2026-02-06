const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

import type { ApiResponse } from "./types";

export async function fetchVideoInfo(
  url: string,
  signal?: AbortSignal
): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE}/api/info`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
    signal,
  });

  const data = await response.json();
  return data as ApiResponse;
}

export function buildDownloadUrl(
  directUrl: string,
  filename: string,
  ext: string
): string {
  const params = new URLSearchParams({
    url: directUrl,
    filename: filename,
    ext: ext,
  });
  return `${API_BASE}/api/download?${params.toString()}`;
}
