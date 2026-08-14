"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Mail,
  Menu,
  PenSquare,
  Send,
  ArrowLeft,
  MessageSquare,
  Search,
  BadgeCheck,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import ModalShell from "./ui/ModalShell";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useMessages } from "@/context/MessagesContext";
import axiosInstance from "@/lib/axiosInstance";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Conversation, FollowUser, Message } from "@/lib/types";

function formatMessageTime(input?: string | Date): string {
  if (!input) return "";
  const d = new Date(input);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MessagesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const {
    conversations,
    conversationsLoading,
    activeConversationId,
    messages,
    messagesLoading,
    sending,
    refreshConversations,
    refreshMessages,
    openConversation,
    closeConversation,
    startConversation,
    sendMessage,
  } = useMessages();

  const [showNewChat, setShowNewChat] = useState(false);
  const [draft, setDraft] = useState("");

  const active = conversations.find((c) => c._id === activeConversationId) || null;
  const showList = !activeConversationId;

  // Poll fallback: conversations every 20s, the open chat's messages every 15s.
  useEffect(() => {
    const convTimer = window.setInterval(() => refreshConversations(), 20000);
    return () => window.clearInterval(convTimer);
  }, [refreshConversations]);

  useEffect(() => {
    if (!activeConversationId) return;
    const msgTimer = window.setInterval(() => refreshMessages(), 15000);
    return () => window.clearInterval(msgTimer);
  }, [activeConversationId, refreshMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || !draft.trim()) return;
    const ok = await sendMessage(draft);
    if (ok) setDraft("");
  };

  const handlePickUser = async (userId: string) => {
    const conv = await startConversation(userId);
    if (conv) setShowNewChat(false);
  };

  return (
    <div className="flex h-dvh flex-col">
      {/* Page header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-background/70 backdrop-blur-2xl shadow-[0_1px_3px_rgba(0,0,0,0.12)]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("twiller:open-menu"))}
            className="md:hidden grid h-10 w-10 shrink-0 place-items-center rounded-full text-foreground hover:bg-accent transition-colors active:scale-95"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">{t("messages")}</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-foreground"
          aria-label="New message"
          onClick={() => setShowNewChat(true)}
        >
          <PenSquare className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Conversation list */}
        <aside
          className={cn(
            "w-full sm:w-[240px] md:w-[260px] shrink-0 border-r border-border flex flex-col min-h-0",
            !showList && "hidden sm:flex"
          )}
        >
          <div className="px-3 py-3">
            <p className="text-sm font-bold text-foreground">Inbox</p>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {conversationsLoading && conversations.length === 0 ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-2 py-2">
                    <Skeleton className="h-11 w-11 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted mb-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-foreground font-semibold text-sm">No messages yet</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Tap the compose button to start a conversation.
                </p>
              </div>
            ) : (
              conversations.map((c) => (
                <ConversationRow
                  key={c._id}
                  conversation={c}
                  active={c._id === activeConversationId}
                  onOpen={() => openConversation(c._id)}
                />
              ))
            )}
          </div>
        </aside>

        {/* Chat pane */}
        <section
          className={cn(
            "flex-1 min-w-0 flex flex-col min-h-0",
            showList && "hidden sm:flex"
          )}
        >
          {active ? (
            <ChatWindow
              conversation={active}
              messages={messages}
              messagesLoading={messagesLoading}
              sending={sending}
              draft={draft}
              onDraftChange={setDraft}
              onSend={handleSend}
              onBack={closeConversation}
              currentUserId={user?._id}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand/10 mb-5 animate-glow-pulse">
                <MessageSquare className="h-9 w-9 text-brand" />
              </div>
              <h2 className="text-2xl font-bold text-gradient">Your messages</h2>
              <p className="text-muted-foreground mt-2 text-base max-w-sm">
                Select a conversation or start a new one with someone you follow.
              </p>
              <Button
                className="mt-5 rounded-full px-6"
                onClick={() => setShowNewChat(true)}
              >
                <PenSquare className="h-4 w-4" />
                Start a conversation
              </Button>
            </div>
          )}
        </section>
      </div>

      <NewChatModal
        open={showNewChat}
        onClose={() => setShowNewChat(false)}
        onPick={handlePickUser}
      />
    </div>
  );
}

function ConversationRow({
  conversation,
  active,
  onOpen,
}: {
  conversation: Conversation;
  active: boolean;
  onOpen: () => void;
}) {
  const other = conversation.otherUser;
  const unread = conversation.unreadCount || 0;
  return (
    <button
      onClick={onOpen}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-3 text-left transition-colors",
        active ? "bg-accent/80" : "hover:bg-accent/50"
      )}
    >
      <Avatar className="h-12 w-12 shrink-0">
        <AvatarImage src={other?.avatar} alt={other?.displayName || ""} />
        <AvatarFallback>{other?.displayName?.[0] || "U"}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 min-w-0">
            <span className="text-[15px] font-semibold text-foreground truncate">
              {other?.displayName || "Unknown"}
            </span>
            {other?.verified && (
              <BadgeCheck className="h-4 w-4 text-brand shrink-0" />
            )}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {timeAgo(conversation.lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-sm truncate",
              unread > 0 ? "text-foreground font-semibold" : "text-muted-foreground"
            )}
          >
            {conversation.lastMessage || "Start the conversation"}
          </span>
          {unread > 0 && (
            <span className="shrink-0 grid min-w-[18px] h-[18px] place-items-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function ChatWindow({
  conversation,
  messages,
  messagesLoading,
  sending,
  draft,
  onDraftChange,
  onSend,
  onBack,
  currentUserId,
}: {
  conversation: Conversation;
  messages: Message[];
  messagesLoading: boolean;
  sending: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: (e: React.FormEvent) => void;
  onBack: () => void;
  currentUserId?: string;
}) {
  const other = conversation.otherUser;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest message whenever the list changes.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, conversation._id]);

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border shrink-0">
        <button
          onClick={onBack}
          className="sm:hidden grid h-9 w-9 place-items-center rounded-full text-foreground hover:bg-accent transition-colors"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={other?.avatar} alt={other?.displayName || ""} />
          <AvatarFallback>{other?.displayName?.[0] || "U"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-[15px] font-bold text-foreground truncate">
              {other?.displayName || "Unknown"}
            </span>
            {other?.verified && (
              <BadgeCheck className="h-4 w-4 text-brand shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            @{other?.username || "unknown"}
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-2"
        aria-label="Messages"
      >
        {messagesLoading && messages.length === 0 ? (
          <div className="space-y-3 py-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}
              >
                <Skeleton
                  className={cn(
                    "h-10 w-2/3 rounded-3xl",
                    i % 2 === 0 && "rounded-br-md"
                  )}
                />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <MessageSquare className="h-7 w-7 text-muted-foreground" />
            <p className="text-muted-foreground text-sm mt-2">
              No messages yet. Say hello!
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m._id}
              message={m}
              mine={String(m.senderId) === String(currentUserId)}
            />
          ))
        )}
      </div>

      <form
        onSubmit={onSend}
        className="shrink-0 border-t border-border px-3 py-3 flex items-end gap-2"
      >
        <textarea
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend(e);
            }
          }}
          rows={1}
          placeholder="Start a new message"
          aria-label="Message"
          className="flex-1 resize-none rounded-3xl bg-card/60 border border-border px-4 py-2.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all max-h-40"
        />
        <Button
          type="submit"
          disabled={sending || !draft.trim()}
          className="rounded-full shrink-0 grid place-items-center bg-brand text-white hover:brightness-110"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

function MessageBubble({ message, mine }: { message: Message; mine: boolean }) {
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-3xl px-4 py-2 text-[15px] leading-snug break-words",
          mine
            ? "bg-brand text-white rounded-br-md"
            : "bg-card border border-border text-foreground rounded-bl-md"
        )}
      >
        <p>{message.text}</p>
        <span
          className={cn(
            "block text-right text-[11px] mt-0.5",
            mine ? "text-white/70" : "text-muted-foreground"
          )}
        >
          {formatMessageTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}

function NewChatModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (userId: string) => void;
}) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [following, setFollowing] = useState<FollowUser[] | null>(null);

  // Reset per open (React's "adjust state during render" pattern).
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setQuery("");
      setFollowing(null);
    }
  }

  useEffect(() => {
    if (!open || !user?._id) return;
    let cancelled = false;
    axiosInstance
      .get(`/users/following/${user._id}`)
      .then((res) => {
        if (!cancelled) setFollowing(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) setFollowing([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, user?._id]);

  const q = query.trim().toLowerCase();
  const filtered = (following || []).filter(
    (u) =>
      !q ||
      (u.displayName || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q)
  );

  return (
    <ModalShell open={open} onClose={onClose} label="New message" maxWidth="sm:max-w-lg">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">New message</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full">
            Close
          </Button>
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people you follow"
            aria-label="Search people"
            className="w-full rounded-full bg-card/60 border border-border pl-10 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all"
          />
        </div>
      </div>

      <div className="overflow-y-auto max-h-[50dvh]">
        {following === null ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2">
                <Skeleton className="h-11 w-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted mb-3">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-foreground font-semibold">No one found</p>
            <p className="text-muted-foreground text-sm mt-1">
              {following.length === 0
                ? "Follow people to start messaging them."
                : "No people match that search."}
            </p>
          </div>
        ) : (
          filtered.map((u) => (
            <button
              key={u._id}
              onClick={() => onPick(u._id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/60 transition-colors border-b border-border last:border-0"
            >
              <Avatar className="h-11 w-11 shrink-0">
                <AvatarImage src={u.avatar} alt={u.displayName} />
                <AvatarFallback>{u.displayName?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-foreground font-semibold truncate">
                    {u.displayName || "Unknown User"}
                  </span>
                  {u.verified && <BadgeCheck className="h-4 w-4 text-brand shrink-0" />}
                </div>
                <span className="text-muted-foreground text-sm">
                  @{u.username || "unknown"}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </ModalShell>
  );
}
