import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AnyVid - Universal Video Downloader",
  description:
    "Download videos from YouTube, Instagram, Twitter/X, TikTok, Facebook, and thousands of other sites. Fast, free, no ads.",
  keywords: [
    "video downloader",
    "youtube downloader",
    "instagram downloader",
    "tiktok downloader",
    "twitter video download",
    "facebook video download",
  ],
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    if (!prefersDark) {
                      document.documentElement.classList.remove('dark');
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-bg-primary text-text-primary antialiased noise-overlay">
        {children}
      </body>
    </html>
  );
}
