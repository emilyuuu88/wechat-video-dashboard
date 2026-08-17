import type { Metadata } from "next";
import "./globals.css";

const title = "嘴里人｜视频号数据驾驶舱";
const description = "播放、互动、分享与关注增长一体化数据看板。";

export const metadata: Metadata = {
  metadataBase: new URL("https://zuiliren-channels-dashboard-2026.netlify.app"),
  title,
  description,
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title,
    description,
    type: "website",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
