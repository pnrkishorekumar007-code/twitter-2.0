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
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { motion, fadeUp, staggerContainer } from "@/lib/motion";
import { getErrorMessage, type Tweet } from "@/lib/types";
import { MessageSquareDashed } from "lucide-react";

function TweetSkeleton() {
  return (
    <div className="flex gap-3 p-4 border-b border-border" aria-hidden>
      <Skeleton className="h-12 w-12 rounded-full shrink-0" />
      <div className="flex-1 space-y-3 pt-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-6 pt-2">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-10" />
        </div>
      </div>
    </div>
  );
}

const Feed = () => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setloading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  useTweetNotifications(tweets);

  const fetchTweets = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/post");
      setTweets(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast(
        "Couldn't load the feed",
        "error",
        getErrorMessage(error)
      );
    } finally {
      setloading(false);
    }
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    axiosInstance
      .get("/post")
      .then((res) => {
        if (!cancelled) setTweets(Array.isArray(res.data) ? res.data : []);
      })
      .catch((error) => {
        if (cancelled) return;
        toast("Couldn't load the feed", "error", getErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setloading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const handlenewtweet = (newtweet: Tweet) => {
    setTweets((prev) => [newtweet, ...prev]);
  };

  const tabClass =
    "relative flex-1 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:rounded-none text-muted-foreground hover:bg-accent/60 hover:text-foreground py-4 font-semibold text-[15px] rounded-none after:absolute after:inset-x-0 after:bottom-0 after:mx-auto after:h-1 after:w-14 after:rounded-full after:bg-brand after:content-[''] after:scale-x-0 after:transition-transform after:duration-300 data-[state=active]:after:scale-x-100";

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl border-b border-border">
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Home</h1>
          {user && (
            <Avatar className="h-8 w-8 md:hidden">
              <AvatarImage src={user.avatar} alt={user.displayName} />
              <AvatarFallback>{user.displayName[0]}</AvatarFallback>
            </Avatar>
          )}
        </div>

        <Tabs defaultValue="foryou" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-transparent border-b border-border rounded-none h-auto p-0">
            <TabsTrigger value="foryou" className={tabClass}>
              For you
            </TabsTrigger>
            <TabsTrigger value="following" className={tabClass}>
              Following
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <TweetComposer onTweetPosted={handlenewtweet} onAudioPosted={fetchTweets} />

      <div>
        {loading ? (
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <TweetSkeleton key={i} />
            ))}
          </>
        ) : tweets.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="py-16 px-6 text-center"
          >
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-muted mb-4">
              <MessageSquareDashed className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground">Nothing here yet</p>
            <p className="text-muted-foreground mt-1">
              Be the first to share something great.
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {tweets
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
              ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Feed;
