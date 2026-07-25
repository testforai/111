import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "领星 OpenAPI 控制台",
  description: "独立的领星 OpenAPI 接口浏览、凭据配置、在线调试与调用历史控制台"
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
