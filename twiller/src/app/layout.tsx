import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Noto_Sans_Tamil,
  Noto_Sans_Devanagari,
} from "next/font/google";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Tamil and Devanagari (Hindi) scripts are poorly covered by Latin-only fonts,
// so proper Noto fonts are self-hosted. Chinese relies on the system CJK stack
// to avoid shipping the very large Noto Sans CJK files.
const notoTamil = Noto_Sans_Tamil({
  variable: "--font-noto-tamil",
  subsets: ["latin", "tamil"],
  weight: ["400", "500", "600", "700", "800"],
});

const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-devanagari",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: 'Twiller - Social Media Platform',
  description: 'A modern social media platform built with Next.js',
   icons: {
    icon:"/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoTamil.variable} ${notoDevanagari.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <LanguageProvider>
              <ToastProvider>{children}</ToastProvider>
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
