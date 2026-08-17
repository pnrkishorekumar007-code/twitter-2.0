"use client";

import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import axiosInstance from "@/lib/axiosInstance";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "./Toast";
import { getErrorMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Follow / Requested / Following button for a target profile.
 *
 * Public accounts toggle follow immediately. Private accounts go through a
 * follow request: "Follow" -> "Requested" (cancellable) -> "Following" once
 * the target accepts. Callers can supply the target's `accountType` and
 * current `requested` state to skip the status fetch; otherwise the button
 * queries /users/follow-request/status/:id once on mount.
 */
export default function FollowButton({
  targetId,
  variant = "default",
  size = "sm",
  onToggle,
  onRequestChange,
  className,
  accountType,
  requested,
  isFollowing,
}: {
  targetId: string;
  variant?: "default" | "outline" | "brand";
  size?: "sm" | "default" | "lg";
  onToggle?: (isFollowing: boolean) => void;
  onRequestChange?: (requested: boolean) => void;
  className?: string;
  accountType?: "public" | "private";
  requested?: boolean;
  isFollowing?: boolean;
}) {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [isFollowingState, setIsFollowingState] = useState<boolean | undefined>(
    isFollowing
  );
  const [isRequested, setIsRequested] = useState<boolean | undefined>(requested);
  const [accountTypeState, setAccountTypeState] = useState<
    "public" | "private" | undefined
  >(accountType);

  const following =
    isFollowingState ??
    (!!user && !!user.following?.some((id) => String(id) === String(targetId)));

  const privateAccount = accountTypeState === "private";

  useEffect(() => {
    if (!user) return;
    if (
      requested !== undefined &&
      isFollowing !== undefined &&
      accountType !== undefined
    ) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await axiosInstance.get(`/users/follow-request/status/${targetId}`);
        const { following: f, requested: r, accountType: at } = res.data ?? {};
        if (!cancelled) {
          if (typeof f === "boolean") setIsFollowingState(f);
          if (typeof r === "boolean") setIsRequested(r);
          if (at === "public" || at === "private") setAccountTypeState(at);
        }
      } catch {
        // Relationship state is a nicety — fail silently.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetId, requested, isFollowing, accountType, user]);

  if (!user) return null;

  const run = async (action: () => Promise<{ data?: Record<string, unknown> }>) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await action();
      await refreshUser();
      return res.data;
    } catch (error) {
      console.error(getErrorMessage(error));
      toast(getErrorMessage(error), "error");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const follow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) return;
    await run(() => axiosInstance.post(`/users/follow/${targetId}`));
    setIsFollowingState(true);
    onToggle?.(true);
  };

  const unfollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) return;
    const data = await run(() => axiosInstance.post(`/users/unfollow/${targetId}`));
    if (data) {
      setIsFollowingState(false);
      onToggle?.(false);
      toast("Unfollowed", "success");
    }
  };

  const sendRequest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) return;
    const data = await run(() => axiosInstance.post(`/users/follow-request/${targetId}`));
    if (data) {
      setIsRequested(true);
      onRequestChange?.(true);
      toast("Request sent", "success");
    }
  };

  const cancelRequest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) return;
    const data = await run(() => axiosInstance.post(`/users/follow-request/cancel/${targetId}`));
    if (data) {
      setIsRequested(false);
      onRequestChange?.(false);
      toast("Request cancelled", "info");
    }
  };

  if (following) {
    return (
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={busy}
        onClick={unfollow}
        className={className}
      >
        Following
      </Button>
    );
  }

  if (privateAccount) {
    if (isRequested) {
      return (
        <Button
          type="button"
          variant="outline"
          size={size}
          disabled={busy}
          onClick={cancelRequest}
          className={cn("group", className)}
        >
          <span className="group-hover:hidden">Requested</span>
          <span className="hidden group-hover:inline">Cancel</span>
        </Button>
      );
    }
    return (
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={busy}
        onClick={sendRequest}
        className={className}
      >
        Follow
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={busy}
      onClick={follow}
      className={className}
    >
      Follow
    </Button>
  );
}
