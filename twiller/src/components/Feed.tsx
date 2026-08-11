"use client";

import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent } from "./ui/card";
import TweetCard from "./TweetCard";
import TweetComposer from "./TweetComposer";
import axiosInstance from "@/lib/axiosInstance";
import { useTweetNotifications } from "@/hooks/useTweetNotifications";
import { Skeleton } from "./ui/skeleton";
import { useToast } from "./Toast";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn } from "@/lib/utils";

function TweetSkeleton() {
  return (
    <div className="flex gap-3 p-4 border-b border-border">
      <Skeleton className="h-12 w-12 rounded-full shrink-0" />
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

const Feed = () => {
  const [tweets, setTweets] = useState<any>([]);
  const [loading, setloading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  useTweetNotifications(tweets);

  const fetchTweets = async () => {
    try {
      setloading(true);
      const res = await axiosInstance.get("/post");
      setTweets(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      toast(
        "Couldn't load the feed",
        "error",
        error?.response?.data?.error || error.message
      );
    } finally {
      setloading(false);
    }
  };

  useEffect(() => {
    fetchTweets();
  }, []);

  const handlenewtweet = (newtweet: any) => {
    setTweets((prev: any) => [newtweet, ...prev]);
  };

  const tabClass =
    "relative data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:rounded-none text-muted-foreground hover:bg-accent/50 hover:text-foreground py-4 font-semibold after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:rounded-full after:bg-brand after:content-[''] after:scale-x-0 after:transition-transform after:duration-300 data-[state=active]:after:scale-x-100";

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 bg-background/90 backdrop-blur-md border-b border-border z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Home</h1>
          {user && (
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar} alt={user.displayName} />
              <AvatarFallback>{user.displayName[0]}</AvatarFallback>
            </Avatar>
          )}
        </div>

        <Tabs defaultValue="foryou" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-transparent border-b border-border rounded-none h-auto">
            <TabsTrigger value="foryou" className={cn(tabClass)}>
              For you
            </TabsTrigger>
            <TabsTrigger value="following" className={cn(tabClass)}>
              Following
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <TweetComposer onTweetPosted={handlenewtweet} onAudioPosted={fetchTweets} />
      <div className="divide-y divide-border">
        {loading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <TweetSkeleton key={i} />
            ))}
          </>
        ) : tweets.length === 0 ? (
          <Card className="bg-background border-none">
            <CardContent className="py-16 text-center">
              <div className="text-muted-foreground space-y-2">
                <p className="text-2xl font-bold text-foreground">
                  Nothing here yet
                </p>
                <p>Be the first to share something great.</p>
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
