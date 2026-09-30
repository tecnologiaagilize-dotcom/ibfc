import "./globals.css";
import type { Metadata } from "next";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  ...(process.env.NEXT_PUBLIC_SITE_URL ? { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL) } : {}),
  title: "IBFC — Instituto Brasileiro da Família Cristã",
  description: "Portal do Instituto Brasileiro da Família Cristã: participação, formação e ações em comunidade."
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="pt-BR"><body>{children}<Footer /></body></html>;
}
