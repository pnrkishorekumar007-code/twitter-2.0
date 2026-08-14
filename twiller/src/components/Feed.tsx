"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import TweetCard from "./TweetCard";
import TweetComposer from "./TweetComposer";
import axiosInstance from "@/lib/axiosInstance";
import { useTweetNotifications } from "@/hooks/useTweetNotifications";
import { Skeleton } from "./ui/skeleton";
import { useToast } from "./Toast";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { motion, fadeUp, staggerContainer } from "@/lib/motion";
import { getErrorMessage, type Tweet } from "@/lib/types";
import { MessageSquareDashed, Menu, UserPlus } from "lucide-react";
import { Button } from "./ui/button";

type FeedTab = "forYou" | "following";

function TweetSkeleton() {
  return (
    <div className="flex gap-3 p-4 border-b border-border/50 animate-pulse" aria-hidden>
      <Skeleton className="h-12 w-12 rounded-full shrink-0 bg-white/5 dark:bg-white/10" />
      <div className="flex-1 space-y-3 pt-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-32 bg-white/5 dark:bg-white/10 rounded-full" />
          <Skeleton className="h-3 w-20 bg-white/5 dark:bg-white/10 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full bg-white/5 dark:bg-white/10 rounded-full" />
        <Skeleton className="h-4 w-3/4 bg-white/5 dark:bg-white/10 rounded-full" />
        <div className="flex gap-6 pt-2">
          <Skeleton className="h-4 w-10 bg-white/5 dark:bg-white/10 rounded-full" />
          <Skeleton className="h-4 w-10 bg-white/5 dark:bg-white/10 rounded-full" />
          <Skeleton className="h-4 w-10 bg-white/5 dark:bg-white/10 rounded-full" />
        </div>
      </div>
    </div>
  );
}

const Feed = () => {
  const [activeTab, setActiveTab] = useState<FeedTab>("forYou");
  const [forYouTweets, setForYouTweets] = useState<Tweet[]>([]);
  const [followingTweets, setFollowingTweets] = useState<Tweet[]>([]);
  const [loadingForYou, setLoadingForYou] = useState(true);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  useTweetNotifications(activeTab === "forYou" ? forYouTweets : followingTweets);

  const fetchForYou = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/post");
      setForYouTweets(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast("Couldn't load the feed", "error", getErrorMessage(error));
    } finally {
      setLoadingForYou(false);
    }
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    axiosInstance
      .get("/post")
      .then((res) => {
        if (!cancelled) setForYouTweets(Array.isArray(res.data) ? res.data : []);
      })
      .catch((error) => {
        if (cancelled) return;
        toast("Couldn't load the feed", "error", getErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setLoadingForYou(false);
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    if (activeTab !== "following") return;
    let cancelled = false;
    axiosInstance
      .get("/tweets/following")
      .then((res) => {
        if (!cancelled) setFollowingTweets(Array.isArray(res.data) ? res.data : []);
      })
      .catch((error) => {
        if (cancelled) return;
        toast("Couldn't load your feed", "error", getErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setLoadingFollowing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [toast, activeTab]);

  const handleTabChange = (value: string) => {
    if (value === "forYou" || value === "following") {
      if (value === "following") setLoadingFollowing(true);
      setActiveTab(value);
    }
  };

  const handlenewtweet = (newtweet: Tweet) => {
    setForYouTweets((prev) => [newtweet, ...prev]);

    const authorId =
      newtweet.author && typeof newtweet.author !== "string"
        ? newtweet.author._id
        : undefined;

    const isOwnTweet = authorId && user?._id && authorId === user._id;
    const isFollowed =
      authorId &&
      (user?.following || []).some((id) => String(id) === String(authorId));

    if (isOwnTweet || isFollowed) {
      setFollowingTweets((prev) => [newtweet, ...prev]);
    }
  };

  const tabClass =
    "relative flex-1 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:rounded-none text-muted-foreground hover:bg-accent/60 hover:text-foreground py-4 font-semibold text-[15px] rounded-none after:absolute after:inset-x-0 after:bottom-0 after:mx-auto after:h-1 after:w-14 after:rounded-full after:bg-brand after:content-[''] after:scale-x-0 after:transition-transform after:duration-300 data-[state=active]:after:scale-x-100";

  const renderTweets = (list: Tweet[]) =>
    list
      .filter(
        (tweet) =>
          tweet &&
          tweet.author &&
          typeof tweet.author !== "string"
      )
      .map((tweet) => (
        <motion.div key={tweet._id} variants={fadeUp}>
          <TweetCard tweet={tweet} />
        </motion.div>
      ));

  const renderEmptyState = (isFollowing: boolean) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="py-20 px-6 text-center"
    >
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand/10 mb-5 animate-glow-pulse">
        {isFollowing ? (
          <UserPlus className="h-9 w-9 text-brand" />
        ) : (
          <MessageSquareDashed className="h-9 w-9 text-brand" />
        )}
      </div>
      <p className="text-2xl font-bold text-gradient">
        {isFollowing ? "No tweets from people you follow yet." : "Nothing here yet"}
      </p>
      <p className="text-muted-foreground mt-2 text-base">
        {isFollowing
          ? "When you follow someone, their posts will show up here."
          : "Be the first to share something great."}
      </p>
      {isFollowing && (
        <Button
          className="mt-5 rounded-full px-6"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("twiller:go-search"))
          }
        >
          Find people to follow
        </Button>
      )}
    </motion.div>
  );

  const isLoading =
    (activeTab === "forYou" && loadingForYou) ||
    (activeTab === "following" && loadingFollowing);

  const currentList =
    activeTab === "forYou" ? forYouTweets : followingTweets;

  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-20 bg-background/70 backdrop-blur-2xl border-b border-border/60 shadow-[0_1px_3px_rgba(0,0,0,0.12)]">
        <div className="px-2 sm:px-4 pt-3 pb-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-full text-foreground -ml-1"
              aria-label={t("more")}
              onClick={() => window.dispatchEvent(new CustomEvent("twiller:open-menu"))}
            >
              <Menu className="h-6 w-6" />
            </Button>
            <h1 className="text-xl font-bold text-foreground tracking-tight">{t("home")}</h1>
          </div>
          {user && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("twiller:go-profile"))}
              className="md:hidden rounded-full transition-transform active:scale-95"
              aria-label={t("profile")}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} alt={user.displayName} />
                <AvatarFallback>{user.displayName[0]}</AvatarFallback>
              </Avatar>
            </button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-transparent border-b border-border rounded-none h-auto p-0">
            <TabsTrigger value="forYou" className={tabClass}>
              For you
            </TabsTrigger>
            <TabsTrigger value="following" className={tabClass}>
              Following
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <TweetComposer onTweetPosted={handlenewtweet} onAudioPosted={fetchForYou} />

      <div>
        {isLoading ? (
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <TweetSkeleton key={i} />
            ))}
          </>
        ) : currentList.length === 0 ? (
          renderEmptyState(activeTab === "following")
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {renderTweets(currentList)}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Feed;
