"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, UserPlus, UserCheck, X } from "lucide-react";
import { motion, fadeUp, staggerContainer } from "@/lib/motion";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Skeleton } from "./ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "./Toast";
import axiosInstance from "@/lib/axiosInstance";
import type { FollowRequest } from "@/lib/types";
import { getErrorMessage } from "@/lib/types";

export default function FollowRequestsPage() {
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<FollowRequest[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    axiosInstance
      .get("/users/follow-requests")
      .then((res) => {
        if (!cancelled) setRequests(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) setRequests([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resolve = async (requestId: string, action: "accept" | "reject") => {
    if (busyId) return;
    setBusyId(requestId);
    try {
      await axiosInstance.post(`/users/follow-request/${action}/${requestId}`);
      setRequests((prev) =>
        prev ? prev.filter((r) => r._id !== requestId) : prev
      );
      await refreshUser();
      toast(action === "accept" ? "Request accepted" : "Request declined", "success");
    } catch (error) {
      toast(getErrorMessage(error), "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 bg-background/70 backdrop-blur-2xl border-b border-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.12)]">
        <div className="px-4 py-3 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Go back"
            onClick={() => window.dispatchEvent(new CustomEvent("twiller:go-back"))}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Follow requests</h1>
            <p className="text-xs text-muted-foreground">
              People who want to follow you
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {requests === null ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl shadow-lg p-4 flex items-center gap-3"
              >
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="py-16 text-center"
          >
            <motion.div
              variants={fadeUp}
              className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-muted mb-4"
            >
              <UserPlus className="h-7 w-7 text-muted-foreground" />
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="text-foreground font-bold text-xl"
            >
              No follow requests
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-sm mt-1">
              When someone requests to follow your private account, it will show
              up here.
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {requests.map((request) => (
              <motion.div
                key={request._id}
                variants={fadeUp}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl shadow-lg hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] p-4 flex items-center gap-3 transition-all duration-300"
              >
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarImage
                    src={request.sender.avatar}
                    alt={request.sender.displayName}
                  />
                  <AvatarFallback>
                    {request.sender.displayName?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground font-semibold truncate">
                    {request.sender.displayName || "Unknown User"}
                  </p>
                  <p className="text-muted-foreground text-sm truncate">
                    @{request.sender.username || "unknown"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    disabled={busyId === request._id}
                    onClick={() => resolve(request._id, "accept")}
                    className="rounded-full"
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === request._id}
                    onClick={() => resolve(request._id, "reject")}
                    className="rounded-full"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Decline
                  </Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
