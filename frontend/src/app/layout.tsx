import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VERGO",
  description: "VERGO WEAR",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased min-w-[320px]`}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full min-w-[320px] flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
