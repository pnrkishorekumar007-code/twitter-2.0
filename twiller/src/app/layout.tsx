import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
} from "next/font/google";
import localFont from "next/font/local";
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

// Tamil and Devanagari (Hindi) scripts are poorly covered by Latin-only fonts.
// These Noto variable fonts (weights 400–800) are downloaded once into
// src/app/fonts and self-hosted via next/font/local, so the production build
// never depends on Google Fonts (next/font/google was generating stale woff2
// URLs that 404'd during the Vercel build). Chinese relies on the system CJK
// stack to avoid shipping the very large Noto Sans CJK files. Latin text is
// covered by Geist, which stays first in the font stack.
const notoTamil = localFont({
  variable: "--font-noto-tamil",
  src: "./fonts/noto-sans-tamil.woff2",
  weight: "400 800",
  display: "swap",
});

const notoDevanagari = localFont({
  variable: "--font-noto-devanagari",
  src: "./fonts/noto-sans-devanagari.woff2",
  weight: "400 800",
  display: "swap",
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
