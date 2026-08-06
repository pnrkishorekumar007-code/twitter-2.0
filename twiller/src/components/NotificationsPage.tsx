"use client";

import React, { useState, useEffect } from "react";
import { Bell, BellOff, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import {
  getInAppNotifications,
  clearNotifications,
  markAllRead,
  type InAppNotification,
} from "@/lib/notifications";
import { useNotifications } from "@/context/NotificationContext";
import { useLanguage } from "@/context/LanguageContext";

export default function NotificationsPage() {
  const { t } = useLanguage();
  const { enabled, permission, toggle } = useNotifications();
  const [items, setItems] = useState<InAppNotification[]>([]);

  useEffect(() => {
    setItems(getInAppNotifications());
    markAllRead();
  }, []);

  const handleClear = () => {
    clearNotifications();
    setItems([]);
  };

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 bg-black/90 backdrop-blur-md border-b border-gray-800 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-white">
            {t("notifications.title")}
          </h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggle}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                enabled ? "bg-blue-500" : "bg-gray-700"
              }`}
              aria-label={t("notifications.settingsTitle")}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  enabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-red-400"
              onClick={handleClear}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="px-4 py-2 bg-gray-900/30 border-t border-gray-800">
          {enabled ? (
            <p className="text-sm text-green-400 flex items-center">
              <Bell className="h-4 w-4 mr-2" /> {t("notifications.enabled")}
            </p>
          ) : (
            <p className="text-sm text-gray-400 flex items-center">
              <BellOff className="h-4 w-4 mr-2" /> {t("notifications.disabled")}
            </p>
          )}
          {permission === "denied" && (
            <p className="text-sm text-red-400 mt-1">
              {t("notifications.blocked")}
            </p>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="bg-black border-none">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-white">
              {t("notifications.title")}
            </h3>
            <p className="text-gray-400 max-w-sm mx-auto">
              {t("notifications.settingsText")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="divide-y divide-gray-800">
          {items.map((item) => (
            <div key={item.id} className="px-4 py-3 flex space-x-3">
              <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <div>
                <p className="text-white font-semibold">{item.title}</p>
                <p className="text-gray-400 text-sm">{item.body}</p>
                <p className="text-gray-600 text-xs mt-1">
                  {new Date(item.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
