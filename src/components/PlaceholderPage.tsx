"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { useLanguage } from "@/context/LanguageContext";

export default function PlaceholderPage({
  title,
  icon: Icon,
}: {
  title: string;
  icon: LucideIcon;
}) {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 bg-black/90 backdrop-blur-md border-b border-gray-800 z-10">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-white">{title}</h1>
        </div>
      </div>
      <Card className="bg-black border-none">
        <CardContent className="py-16 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center mb-4">
            <Icon className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold mb-2 text-white">{title}</h3>
          <p className="text-gray-400 max-w-sm mx-auto">
            {t("common.comingSoon")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
