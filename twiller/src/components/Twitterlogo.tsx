"use client";

import React from "react";

interface TwitterLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "mono" | "gradient";
}

const X_PATH =
  "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z";

export default function TwitterLogo({
  className = "",
  size = "md",
  variant = "mono",
}: TwitterLogoProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };
  const uid = React.useId().replace(/:/g, "");

  if (variant === "gradient") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`${sizeClasses[size]} ${className}`}
        aria-label="Twiller"
      >
        <defs>
          <linearGradient id={`twg-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>
        <path fill={`url(#twg-${uid})`} d={X_PATH} />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className={`fill-current ${sizeClasses[size]} ${className}`}
      aria-label="Twiller"
    >
      <path d={X_PATH} />
    </svg>
  );
}

export function TwillerBrand({
  className = "",
  wordmarkClassName = "",
}: {
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <TwitterLogo size="md" variant="gradient" className="shrink-0" />
      <span
        className={`text-2xl font-extrabold tracking-tight bg-brand-gradient bg-clip-text text-transparent animate-gradient ${wordmarkClassName}`}
      >
        Twiller
      </span>
    </span>
  );
}
