"use client";

import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent } from "./ui/card";
import LoadingSpinner from "./loading-spinner";
import TweetCard from "./TweetCard";
import TweetComposer from "./TweetComposer";
import axiosInstance from "@/lib/axiosInstance";
import { pushInAppNotification } from "@/lib/notifications";
import { useNotifications } from "@/context/NotificationContext";
import { useLanguage } from "@/context/LanguageContext";

const KEYWORDS = ["cricket", "science"];

const Feed = () => {
  const [tweets, setTweets] = useState<any>([]);
  const [loading, setloading] = useState(false);
  const [error, setError] = useState("");
  const { enabled, permission } = useNotifications();
  const { t } = useLanguage();

  const maybeNotify = (tweet: any) => {
    const text = (tweet?.content || "").toLowerCase();
    const hits = KEYWORDS.filter((k) => text.includes(k));
    if (hits.length > 0) {
      pushInAppNotification(
        t("notifications.textTweet"),
        tweet.content,
        { enabled, permission }
      );
    }
  };

  const fetchTweets = async () => {
    try {
      setloading(true);
      setError("");
      const res = await axiosInstance.get("/post");
      setTweets(res.data);
      res.data.forEach((tweet: any) => maybeNotify(tweet));
    } catch (err) {
      console.error(err);
      setError(t("feed.loadError"));
    } finally {
      setloading(false);
    }
  };
  useEffect(() => {
    fetchTweets();
  }, []);

  const handlenewtweet = (newtweet: any) => {
    setTweets((prev: any) => [newtweet, ...prev]);
    maybeNotify(newtweet);
  };

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 bg-black/90 backdrop-blur-md border-b border-gray-800 z-10">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-white">{t("feed.home")}</h1>
        </div>

        <Tabs defaultValue="foryou" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-transparent border-b border-gray-800 rounded-none h-auto">
            <TabsTrigger
              value="foryou"
              className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold"
            >
              {t("feed.forYou")}
            </TabsTrigger>
            <TabsTrigger
              value="following"
              className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold"
            >
              {t("feed.following")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <TweetComposer onTweetPosted={handlenewtweet} />
      <div className="divide-y divide-gray-800">
        {loading ? (
          <Card className="bg-black border-none">
            <CardContent className="py-12 text-center">
              <div className="text-gray-400 mb-4">
                <LoadingSpinner size="lg" className="mx-auto mb-4" />
                <p>{t("feed.loadingTweets")}</p>
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="bg-black border-none">
            <CardContent className="py-16 text-center">
              <div className="text-gray-400">
                <h3 className="text-2xl font-bold mb-2">{t("feed.loadError")}</h3>
                <button
                  onClick={fetchTweets}
                  className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-full px-6 py-2"
                >
                  {t("common.retry")}
                </button>
              </div>
            </CardContent>
          </Card>
        ) : tweets.length === 0 ? (
          <Card className="bg-black border-none">
            <CardContent className="py-16 text-center">
              <div className="text-gray-400">
                <h3 className="text-2xl font-bold mb-2">
                  {t("feed.emptyTitle")}
                </h3>
                <p>{t("feed.emptyText")}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          tweets.map((tweet: any) => (
            <TweetCard key={tweet._id} tweet={tweet} />
          ))
        )}
      </div>
    </div>
  );
};

export default Feed;
