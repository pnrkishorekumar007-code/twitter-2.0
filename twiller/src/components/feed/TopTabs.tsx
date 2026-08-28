"use client";

import React from "react";
import { motion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

interface TopTabsProps {
  tabs: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * X-style page tabs — equal-width, hairline underline that slides between
 * the active items using a shared Framer Motion layout id.
 */
export default function TopTabs({ tabs, value, onChange, className }: TopTabsProps) {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={cn("flex border-b border-border", className)}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <Button
            key={tab.value}
            variant="tab"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={active ? "!font-bold text-foreground" : "font-medium text-muted-foreground"}
          >
            {tab.label}
            {active && (
              <motion.span
                layoutId="top-tabs-underline"
                className="absolute inset-x-0 bottom-0 mx-auto h-1 w-14 rounded-full bg-brand"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
          </Button>
        );
      })}
    </div>
  );
}
