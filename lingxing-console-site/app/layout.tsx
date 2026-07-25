import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://lingxing-openapi-console.zhengzhoukelue.chatgpt.site";
export const metadata: Metadata = {
  title: "领星 OpenAPI 控制台",
  description: "独立的领星 OpenAPI 接口浏览、凭据配置、在线调试与调用历史控制台",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "领星 OpenAPI 控制台",
    description: "611个可调用接口 · 安全凭据 · 在线调试",
    images: [{ url: "/og.png", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "领星 OpenAPI 控制台",
    description: "611个可调用接口 · 安全凭据 · 在线调试",
    images: ["/og.png"]
  }
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
