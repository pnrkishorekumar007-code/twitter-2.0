"use client";

import React, { useEffect, useState } from "react";
import { Monitor, Smartphone, Laptop, Bell, BellOff } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { useAuth } from "@/context/AuthContext";
import axiosInstance from "@/lib/axiosInstance";
import LanguageSwitcher from "./language/LanguageSwitcher";

function deviceIcon(device: string) {
  if (device === "mobile") return <Smartphone className="h-5 w-5 text-blue-400" />;
  if (device === "laptop") return <Laptop className="h-5 w-5 text-blue-400" />;
  return <Monitor className="h-5 w-5 text-blue-400" />;
}

export default function ProfileSettingsPanel() {
  const { user } = useAuth();
  const [notifEnabled, setNotifEnabled] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setNotifEnabled((user as any).notificationsEnabled ?? true);
  }, [user]);

  const toggleNotifications = async () => {
    if (!user) return;
    setSaving(true);
    const next = !notifEnabled;
    try {
      await axiosInstance.patch(`/notifications/${(user as any).email}`, { enabled: next });
      setNotifEnabled(next);
      if (next && typeof window !== "undefined" && "Notification" in window) {
        Notification.requestPermission();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const loginHistory = (user as any)?.loginHistory || [];

  return (
    <div className="p-4 space-y-6">
      {/* Notification preference */}
      <Card className="bg-black border-gray-800">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {notifEnabled ? (
              <Bell className="h-5 w-5 text-blue-400" />
            ) : (
              <BellOff className="h-5 w-5 text-gray-500" />
            )}
            <div>
              <p className="text-white font-semibold">Tweet notifications</p>
              <p className="text-gray-400 text-sm">
                Get a popup when a tweet mentions "cricket" or "science".
              </p>
            </div>
          </div>
          <Button
            disabled={saving}
            onClick={toggleNotifications}
            variant="outline"
            className={`rounded-full ${notifEnabled ? "border-blue-500 text-blue-400" : ""}`}
          >
            {notifEnabled ? "On" : "Off"}
          </Button>
        </CardContent>
      </Card>

      {/* Language */}
      <Card className="bg-black border-gray-800">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-white font-semibold">Language</p>
            <p className="text-gray-400 text-sm">
              Switching languages requires a one-time verification code.
            </p>
          </div>
          <LanguageSwitcher />
        </CardContent>
      </Card>

      {/* Login history */}
      <Card className="bg-black border-gray-800">
        <CardContent className="p-4">
          <p className="text-white font-semibold mb-3">Login history</p>
          {loginHistory.length === 0 ? (
            <p className="text-gray-400 text-sm">No login history recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {loginHistory.map((entry: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 border-b border-gray-900 pb-3 last:border-0">
                  {deviceIcon(entry.device)}
                  <div className="flex-1 text-sm">
                    <p className="text-white">
                      {entry.browser} on {entry.os} · <span className="capitalize">{entry.device}</span>
                    </p>
                    <p className="text-gray-500">
                      {entry.ip} · {entry.loggedInAt && new Date(entry.loggedInAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
