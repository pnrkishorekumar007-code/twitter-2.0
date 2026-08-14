"use client";

import React, { useEffect, useState } from "react";
import { X, User } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { motion } from "@/lib/motion";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { BadgeCheck } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import FollowButton from "./FollowButton";
import axiosInstance from "@/lib/axiosInstance";
import type { FollowUser } from "@/lib/types";

/**
 * Modal showing a profile's followers or following list, fetched live from
 * /api/users/followers/:id or /api/users/following/:id.
 */
export default function FollowListModal({
  open,
  kind,
  userId,
  onClose,
}: {
  open: boolean;
  kind: "followers" | "following";
  userId: string | null;
  onClose: () => void;
}) {
  const [users, setUsers] = useState<FollowUser[] | null>(null);

  useEffect(() => {
    if (!open || !userId) return;
    let cancelled = false;
    axiosInstance
      .get(`/users/${kind}/${userId}`)
      .then((res) => {
        if (!cancelled) setUsers(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) setUsers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, kind, userId]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={kind === "followers" ? "Followers" : "Following"}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full sm:max-w-md max-h-[85vh] bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 px-4 py-3 border-b border-white/[0.06]">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-foreground"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </Button>
              <h2 className="text-lg font-bold text-foreground">
                {kind === "followers" ? "Followers" : "Following"}
              </h2>
            </div>

            <div className="overflow-y-auto flex-1">
              {users === null ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : users.length === 0 ? (
                <div className="py-16 px-6 text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-muted mb-3">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-foreground font-bold">
                    {kind === "followers"
                      ? "No followers yet"
                      : "Not following anyone"}
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    {kind === "followers"
                      ? "When someone follows this account, they'll show up here."
                      : "Accounts this profile follows will show up here."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.06]">
                  {users.map((u) => (
                    <div
                      key={u._id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.04] transition-all duration-200"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={u.avatar} alt={u.displayName} />
                          <AvatarFallback>
                            {u.displayName?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1">
                            <span className="text-foreground font-semibold truncate">
                              {u.displayName || "Unknown User"}
                            </span>
                            {u.verified && (
                              <BadgeCheck className="h-4 w-4 text-brand shrink-0" />
                            )}
                          </div>
                          <span className="text-muted-foreground text-sm">
                            @{u.username || "unknown"}
                          </span>
                        </div>
                      </div>
                      <FollowButton targetId={u._id} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
