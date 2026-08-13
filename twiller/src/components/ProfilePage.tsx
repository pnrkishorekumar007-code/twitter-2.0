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
  UserPlus,
  Lock,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import TweetCard from "./TweetCard";
import Editprofile from "./Editprofile";
import LoginHistorySection from "./LoginHistorySection";
import FollowListModal from "./FollowListModal";
import axiosInstance from "@/lib/axiosInstance";
import { Skeleton } from "./ui/skeleton";
import { motion, fadeUp } from "@/lib/motion";
import type { Tweet } from "@/lib/types";

function EmptyState({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="py-20 text-center px-6">
      <p className="text-2xl font-bold text-foreground">{title}</p>
      <p className="text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [listModal, setListModal] = useState<{
    kind: "followers" | "following";
    userId: string | null;
  } | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setloading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axiosInstance.get("/post");
        if (!cancelled) setTweets(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) setloading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) return null;

  const userTweets = tweets.filter((t) => t.author?._id === user._id);
  const userLiked = tweets.filter((t) => t.likedBy?.includes(user._id));
  const userMedia = userTweets.filter((t) => t.image || t.type === "audio");
  const userReplies = tweets
    .flatMap((t) => t.replies || [])
    .filter((r) => r.user?._id === user._id);

  const tabClass =
    "rounded-none bg-transparent h-12 flex-1 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-brand text-muted-foreground font-semibold border-b border-transparent hover:bg-accent/60";

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
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

      {/* Banner */}
      <div className="relative h-48 bg-brand-gradient animate-gradient overflow-hidden">
        {user.banner ? (
          <img
            src={user.banner}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/25" />
        )}
        <button
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="Change banner"
          onClick={() => setShowEditModal(true)}
        >
          <Camera className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4">
        <div className="flex items-start justify-between">
          <Avatar className="h-28 w-28 border-4 border-background -mt-14 bg-accent shadow-xl">
            <AvatarImage src={user.avatar} alt={user.displayName} />
            <AvatarFallback className="text-4xl">
              {user.displayName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setShowEditModal(true)}
              className="rounded-full border-border text-foreground hover:bg-accent font-bold"
            >
              Edit profile
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full border-border text-muted-foreground hover:bg-accent"
              aria-label="Settings"
              onClick={() => window.dispatchEvent(new CustomEvent("twiller:go-settings"))}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 px-4 space-y-1">
        <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-1.5">
          {user.displayName}
          {user.verified && (
            <BadgeCheck className="h-5 w-5 text-brand shrink-0" />
          )}
        </h1>
        <p className="text-muted-foreground flex items-center gap-1.5">
          @{user.username}
          {user.accountType === "private" && (
            <Lock className="h-3.5 w-3.5" aria-label="Private account" />
          )}
        </p>
        {user.bio && <p className="mt-2 text-foreground text-[15px]">{user.bio}</p>}
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

        <div className="flex items-center gap-5 mt-3 text-sm">
          <span className="text-foreground font-bold">{userTweets.length}</span>
          <span className="text-muted-foreground">Posts</span>
          <span className="text-foreground font-bold">{userLiked.length}</span>
          <span className="text-muted-foreground">Likes</span>
          <span className="text-foreground font-bold">{userReplies.length}</span>
          <span className="text-muted-foreground">Replies</span>
        </div>

        <div className="flex items-center gap-5 mt-2 text-sm">
          <button
            type="button"
            className="hover:underline"
            onClick={() =>
              setListModal({ kind: "following", userId: user._id })
            }
          >
            <span className="text-foreground font-bold">
              {user.following?.length ?? 0}
            </span>{" "}
            <span className="text-muted-foreground">Following</span>
          </button>
          <button
            type="button"
            className="hover:underline"
            onClick={() =>
              setListModal({ kind: "followers", userId: user._id })
            }
          >
            <span className="text-foreground font-bold">
              {user.followers?.length ?? 0}
            </span>{" "}
            <span className="text-muted-foreground">Followers</span>
          </button>
        </div>

        {user.accountType === "private" && (
          <button
            type="button"
            className="mt-4 flex w-full items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-accent transition-colors"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("twiller:go-follow-requests"))
            }
          >
            <UserPlus className="h-4 w-4 text-brand" />
            Follow requests
          </button>
        )}
      </div>

      <Tabs defaultValue="posts" className="w-full mt-4">
        <TabsList className="w-full grid grid-cols-5 bg-transparent border-b border-border rounded-none h-auto p-0">
          <TabsTrigger value="posts" className={tabClass}>Posts</TabsTrigger>
          <TabsTrigger value="replies" className={tabClass}>Replies</TabsTrigger>
          <TabsTrigger value="media" className={tabClass}>Media</TabsTrigger>
          <TabsTrigger value="liked" className={tabClass}>Likes</TabsTrigger>
          <TabsTrigger value="login-history" className={tabClass}>
            <span className="truncate px-1">Login history</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-0">
          {loading ? (
            <div className="p-4 space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : userTweets.length === 0 ? (
            <EmptyState title="No posts yet. Post one!" sub="When you post, it appears here." />
          ) : (
            <motion.div initial="hidden" animate="visible">
              {userTweets.map((t) => (
                <motion.div key={t._id} variants={fadeUp}>
                  <TweetCard tweet={t} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="replies" className="mt-0">
          {userReplies.length === 0 ? (
            <EmptyState title="No replies yet." sub="Replies you post will appear here." />
          ) : (
            <div className="divide-y divide-border">
              {userReplies.map((r, i) => (
                <div key={i} className="flex gap-3 px-4 py-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar} alt={user.displayName} />
                    <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-foreground text-sm">{user.displayName}</span>
                      <span className="text-muted-foreground text-xs">@{user.username}</span>
                    </div>
                    <p className="text-foreground text-sm mt-1 whitespace-pre-wrap break-words">{r.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="media" className="mt-0">
          {userMedia.length === 0 ? (
            <EmptyState title="No media yet." sub="Photos and audio you post will appear here." />
          ) : (
            userMedia.map((t) => <TweetCard key={t._id} tweet={t} />)
          )}
        </TabsContent>

        <TabsContent value="liked" className="mt-0">
          {userLiked.length === 0 ? (
            <EmptyState title="No liked posts yet." sub="Posts you like will show up here." />
          ) : (
            userLiked.map((t) => <TweetCard key={t._id} tweet={t} />)
          )}
        </TabsContent>

        <TabsContent value="login-history" className="mt-0">
          <LoginHistorySection />
        </TabsContent>
      </Tabs>
      <Editprofile isopen={showEditModal} onclose={() => setShowEditModal(false)} />
      <FollowListModal
        key={`${listModal?.kind ?? "followers"}-${listModal?.userId ?? "none"}`}
        open={!!listModal}
        kind={listModal?.kind ?? "followers"}
        userId={listModal?.userId ?? null}
        onClose={() => setListModal(null)}
      />
    </div>
  );
}
