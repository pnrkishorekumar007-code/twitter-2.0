"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Link as LinkIcon,
  MoreHorizontal,
  Camera,
  Bell,
  BellOff,
  Languages,
  BadgeCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import TweetCard from "./TweetCard";
import { Card, CardContent } from "./ui/card";
import Editprofile from "./Editprofile";
import LoginHistory from "./LoginHistory";
import LanguageSwitcher from "./LanguageSwitcher";
import axiosInstance from "@/lib/axiosInstance";
import { useLanguage } from "@/context/LanguageContext";
import { useNotifications } from "@/context/NotificationContext";
import Link from "next/link";

export default function ProfilePage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { enabled, permission, toggle } = useNotifications();
  const [activeTab, setActiveTab] = useState("posts");
  const [showEditModal, setShowEditModal] = useState(false);
  const [tweets, setTweets] = useState<any>([]);
  const [loading, setloading] = useState(false);
  const fetchTweets = async () => {
    try {
      setloading(true);
      const res = await axiosInstance.get("/post");
      setTweets(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setloading(false);
    }
  };
  useEffect(() => {
    fetchTweets();
  }, []);
  if (!user) return null;
  // Filter tweets by current user
  const userTweets = tweets.filter((tweet: any) => tweet.author?._id === user._id);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-md border-b border-gray-800 z-10">
        <div className="flex items-center px-4 py-3 space-x-8">
          <Link href="/home">
            <Button
              variant="ghost"
              size="sm"
              className="p-2 rounded-full hover:bg-gray-900"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">{user.displayName}</h1>
            <p className="text-sm text-gray-400">
              {userTweets.length} {t("profile.posts")}
            </p>
          </div>
        </div>
      </div>

      {/* Cover Photo */}
      <div className="relative">
        <div className="h-48 bg-gradient-to-r from-blue-600 to-purple-600 relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70"
            aria-label={t("profile.editProfile")}
          >
            <Camera className="h-5 w-5 text-white" />
          </Button>
        </div>

        {/* Profile Picture */}
        <div className="absolute -bottom-16 left-4">
          <div className="relative">
            <Avatar className="h-32 w-32 border-4 border-black">
              <AvatarImage src={user.avatar} alt={user.displayName} />
              <AvatarFallback className="text-2xl">
                {user.displayName[0]}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="sm"
              className="absolute bottom-2 right-2 p-2 rounded-full bg-black/70 hover:bg-black/90"
              aria-label={t("profile.editProfile")}
            >
              <Camera className="h-4 w-4 text-white" />
            </Button>
          </div>
        </div>

        {/* Edit Profile Button */}
        <div className="flex justify-end p-4">
          <Button
            variant="outline"
            className="border-gray-600 text-white bg-gray-950 font-semibold rounded-full px-6"
            onClick={() => setShowEditModal(true)}
          >
            {t("profile.editProfile")}
          </Button>
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-4 pb-4 mt-12">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {user.displayName}
            </h1>
            <p className="text-gray-400">@{user.username}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="p-2 rounded-full hover:bg-gray-900"
            aria-label={t("common.more")}
          >
            <MoreHorizontal className="h-5 w-5 text-gray-400" />
          </Button>
        </div>

        {user.bio && (
          <p className="text-white mb-3 leading-relaxed">{user.bio}</p>
        )}

        <div className="flex items-center space-x-4 text-gray-400 text-sm mb-3 flex-wrap gap-y-2">
          <div className="flex items-center space-x-1">
            <MapPin className="h-4 w-4" />
            {user.location && <span>{user.location}</span>}
          </div>
          <div className="flex items-center space-x-1">
            <LinkIcon className="h-4 w-4" />
            {user.website && <span className="text-blue-400">{user.website}</span>}
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>
              {t("profile.joined")}{" "}
              {user.joinedDate &&
                new Date(user.joinedDate).toLocaleDateString(language, {
                  month: "long",
                  year: "numeric",
                })}
            </span>
          </div>
        </div>

        <Link
          href="/subscribe"
          className="inline-flex items-center text-blue-400 hover:text-blue-300 text-sm font-semibold"
        >
          <BadgeCheck className="h-4 w-4 mr-1" />
          {t("nav.premium")}
        </Link>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full bg-transparent border-b border-gray-800 rounded-none h-auto flex overflow-x-auto">
          <TabsTrigger
            value="posts"
            className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold flex-shrink-0"
          >
            {t("profile.posts")}
          </TabsTrigger>
          <TabsTrigger
            value="replies"
            className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold flex-shrink-0"
          >
            {t("profile.replies")}
          </TabsTrigger>
          <TabsTrigger
            value="highlights"
            className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold flex-shrink-0"
          >
            {t("profile.highlights")}
          </TabsTrigger>
          <TabsTrigger
            value="media"
            className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold flex-shrink-0"
          >
            {t("profile.media")}
          </TabsTrigger>
          <TabsTrigger
            value="loginhistory"
            className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold flex-shrink-0"
          >
            {t("loginHistory.title")}
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold flex-shrink-0"
          >
            {t("settings.title")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-0">
          <div className="divide-y divide-gray-800">
            {loading ? (
              <Card className="bg-black border-none">
                <CardContent className="py-12 text-center">
                  <div className="text-gray-400">{t("common.loading")}</div>
                </CardContent>
              </Card>
            ) : userTweets.length === 0 ? (
              <Card className="bg-black border-none">
                <CardContent className="py-12 text-center">
                  <div className="text-gray-400">
                    <h3 className="text-2xl font-bold mb-2">
                      {t("profile.noPostsTitle")}
                    </h3>
                    <p>{t("profile.noPostsText")}</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              userTweets.map((tweet: any) => (
                <TweetCard key={tweet._id} tweet={tweet} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="replies" className="mt-0">
          <Card className="bg-black border-none">
            <CardContent className="py-12 text-center">
              <div className="text-gray-400">
                <h3 className="text-2xl font-bold mb-2">
                  {t("profile.noRepliesTitle")}
                </h3>
                <p>{t("profile.noRepliesText")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="highlights" className="mt-0">
          <Card className="bg-black border-none">
            <CardContent className="py-12 text-center">
              <div className="text-gray-400">
                <h3 className="text-2xl font-bold mb-2">
                  {t("profile.noArticlesTitle")}
                </h3>
                <p>{t("profile.noArticlesText")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media" className="mt-0">
          <Card className="bg-black border-none">
            <CardContent className="py-12 text-center">
              <div className="text-gray-400">
                <h3 className="text-2xl font-bold mb-2">
                  {t("profile.noMediaTitle")}
                </h3>
                <p>{t("profile.noMediaText")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loginhistory" className="mt-0">
          <div className="border-b border-gray-800 px-4 py-3">
            <h3 className="text-lg font-bold text-white">
              {t("loginHistory.title")}
            </h3>
            <p className="text-gray-400 text-sm">{t("loginHistory.subtitle")}</p>
          </div>
          <LoginHistory />
        </TabsContent>

        <TabsContent value="settings" className="mt-0">
          <div className="p-4 space-y-4">
            {/* Notifications */}
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {enabled ? (
                      <Bell className="h-5 w-5 text-blue-400" />
                    ) : (
                      <BellOff className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                      <p className="text-white font-semibold">
                        {t("notifications.settingsTitle")}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {t("notifications.settingsText")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={toggle}
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                      enabled ? "bg-blue-500" : "bg-gray-700"
                    }`}
                    aria-label={
                      enabled
                        ? t("notifications.enabled")
                        : t("notifications.disabled")
                    }
                    aria-pressed={enabled}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        enabled ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
                {permission === "denied" && (
                  <p className="text-red-400 text-sm mt-2">
                    {t("notifications.blocked")}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Language */}
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <Languages className="h-5 w-5 text-blue-400" />
                  <div>
                    <p className="text-white font-semibold">
                      {t("settings.language")}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {t("settings.languageText")}
                    </p>
                  </div>
                </div>
                <LanguageSwitcher variant="inline" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      <Editprofile
        isopen={showEditModal}
        onclose={() => setShowEditModal(false)}
      />
    </div>
  );
}
