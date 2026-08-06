"use client";

import React from "react";
import { Monitor, Smartphone, Laptop, Globe } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { useAuth, type LoginEntry } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

export default function LoginHistory() {
  const { loginHistory } = useAuth();
  const { t } = useLanguage();

  const DeviceIcon = ({ device }: { device: string }) => {
    if (device === "mobile")
      return <Smartphone className="h-4 w-4 text-blue-400" />;
    if (device === "laptop")
      return <Laptop className="h-4 w-4 text-green-400" />;
    return <Monitor className="h-4 w-4 text-purple-400" />;
  };

  if (loginHistory.length === 0) {
    return (
      <Card className="bg-black border-none">
        <CardContent className="py-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center mb-4">
            <Globe className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold mb-2 text-white">
            {t("loginHistory.title")}
          </h3>
          <p className="text-gray-400">{t("loginHistory.subtitle")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="divide-y divide-gray-800">
      {loginHistory.map((entry: LoginEntry) => (
        <div key={entry._id} className="px-4 py-4 flex items-start space-x-3">
          <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center shrink-0">
            <DeviceIcon device={entry.device} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-white font-semibold truncate">
                {entry.browser}{" "}
                {entry.current && (
                  <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                    {t("loginHistory.currentSession")}
                  </span>
                )}
              </p>
              <p className="text-gray-500 text-xs shrink-0">
                {new Date(entry.timestamp).toLocaleString()}
              </p>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              {entry.os} · {t(`loginHistory.${entry.device}`)}
            </p>
            <p className="text-gray-500 text-xs mt-1 flex items-center">
              <Globe className="h-3 w-3 mr-1" />
              {t("loginHistory.ip")}: {entry.ip}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
