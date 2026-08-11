"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Link as LinkIcon,
  Camera,
  Settings,
  BadgeCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import TweetCard from "./TweetCard";
import Editprofile from "./Editprofile";
import axiosInstance from "@/lib/axiosInstance";
import { Skeleton } from "./ui/skeleton";

export default function ProfilePage() {
  const { user } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [tweets, setTweets] = useState<any>([]);
  const [loading, setloading] = useState(false);

  const fetchTweets = async () => {
    try {
      setloading(true);
      const res = await axiosInstance.get("/post");
      setTweets(Array.isArray(res.data) ? res.data : []);
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

  const userTweets = tweets.filter((t: any) => t.author?._id === user._id);
  const userLiked = tweets.filter((t: any) => t.likedBy?.includes(user._id));
  const userRetweets = tweets.filter((t: any) =>
    t.retweetedBy?.includes(user._id)
  );

  const EmptyState = ({ title, sub }: { title: string; sub: string }) => (
    <div className="py-20 text-center px-6">
      <p className="text-2xl font-bold text-foreground">{title}</p>
      <p className="text-muted-foreground mt-1">{sub}</p>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="px-4 py-3 flex items-center gap-4">
          <ArrowLeft
            className="h-5 w-5 cursor-pointer text-muted-foreground hover:text-foreground"
            onClick={() => window.history.back()}
          />
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {user.displayName}
            </h1>
            <p className="text-xs text-muted-foreground">
              {userTweets.length} posts
            </p>
          </div>
        </div>
      </div>

      <div className="relative h-44 bg-brand-gradient animate-gradient overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/25" />
        <button
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="Change cover"
        >
          <Camera className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4">
        <div className="flex items-start justify-between">
          <Avatar className="h-24 w-24 border-4 border-background -mt-12 bg-accent shadow-xl">
            <AvatarImage src={user.avatar} alt={user.displayName} />
            <AvatarFallback className="text-3xl">
              {user.displayName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setShowEditModal(true)}
              className="rounded-full border-border text-foreground hover:bg-accent font-semibold"
            >
              Edit profile
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full border-border text-muted-foreground hover:bg-accent"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 px-4 space-y-1">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-1.5">
          {user.displayName}
          {user.verified && (
            <BadgeCheck className="h-5 w-5 text-brand shrink-0" />
          )}
        </h1>
        <p className="text-muted-foreground">@{user.username}</p>
        {user.bio && <p className="mt-2 text-foreground">{user.bio}</p>}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
          {user.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {user.location}
            </span>
          )}
          {user.website && (
            <a className="flex items-center gap-1 hover:underline cursor-pointer text-brand">
              <LinkIcon className="h-4 w-4" />
              {user.website}
            </a>
          )}
          {user.joinedDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Joined {new Date(user.joinedDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <Tabs defaultValue="posts" className="w-full mt-4">
        <TabsList className="w-full grid grid-cols-3 bg-transparent border-b border-border">
          <TabsTrigger
            value="posts"
            className="rounded-none bg-transparent h-12 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:border-b-1 data-[state=active]:border-brand text-muted-foreground font-semibold"
          >
            Posts
          </TabsTrigger>
          <TabsTrigger
            value="liked"
            className="rounded-none bg-transparent h-12 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:border-b-1 data-[state=active]:border-brand text-muted-foreground font-semibold"
          >
            Likes
          </TabsTrigger>
          <TabsTrigger
            value="retweets"
            className="rounded-none bg-transparent h-12 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:border-b-1 data-[state=active]:border-brand text-muted-foreground font-semibold"
          >
            Retweets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          {loading ? (
            <div className="p-4 space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : userTweets.length === 0 ? (
            <EmptyState title="No posts yet. Post one!" sub="When you post, it appears here." />
          ) : (
            userTweets.map((t: any) => <TweetCard key={t._id} tweet={t} />)
          )}
        </TabsContent>
        <TabsContent value="liked">
          {userLiked.length === 0 ? (
            <EmptyState title="No liked posts yet." sub="Posts you like will show up here." />
          ) : (
            userLiked.map((t: any) => <TweetCard key={t._id} tweet={t} />)
          )}
        </TabsContent>
        <TabsContent value="retweets">
          {userRetweets.length === 0 ? (
            <EmptyState title="No retweets yet." sub="Retweets you make will show up here." />
          ) : (
            userRetweets.map((t: any) => <TweetCard key={t._id} tweet={t} />)
          )}
        </TabsContent>
      </Tabs>
      <Editprofile isopen={showEditModal} onclose={() => setShowEditModal(false)} />
    </div>
  );
}
