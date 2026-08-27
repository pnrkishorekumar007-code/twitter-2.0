"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axiosInstance from "@/lib/axiosInstance";
import { useAuth } from "@/context/AuthContext";
import { connectSocket, disconnectSocket } from "@/lib/socketClient";
import type { Conversation, Message } from "@/lib/types";

interface MessagesContextValue {
  conversations: Conversation[];
  conversationsLoading: boolean;
  unreadTotal: number;
  activeConversationId: string | null;
  messages: Message[];
  messagesLoading: boolean;
  sending: boolean;
  refreshConversations: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  openConversation: (id: string) => Promise<void>;
  closeConversation: () => void;
  startConversation: (receiverId: string) => Promise<Conversation | null>;
  sendMessage: (text: string) => Promise<boolean>;
}

const MessagesContext = createContext<MessagesContextValue | null>(null);

interface SocketMessagePayload {
  message?: Message;
  conversation?: Conversation;
}

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Latest values for the socket handlers without stale closures.
  const activeIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [conversations]
  );

  const refreshConversations = useCallback(async () => {
    setConversationsLoading(true);
    try {
      const { data } = await axiosInstance.get("/messages/conversations");
      if (Array.isArray(data)) setConversations(data);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status !== 401) console.error("Failed to load conversations:", err);
    } finally {
      setConversationsLoading(false);
    }
  }, []);

  const refreshMessages = useCallback(async () => {
    const id = activeIdRef.current;
    if (!id) return;
    try {
      const { data } = await axiosInstance.get(`/messages/${id}`);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status !== 401) console.error("Failed to load messages:", err);
    }
  }, []);

  const openConversation = useCallback(
    async (id: string) => {
      setActiveConversationId(id);
      setMessages([]);
      setMessagesLoading(true);
      try {
        const { data } = await axiosInstance.get(`/messages/${id}`);
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        try {
          await axiosInstance.put(`/messages/conversations/${id}/read`);
          setConversations((prev) =>
            prev.map((c) => (c._id === id ? { ...c, unreadCount: 0 } : c))
          );
        } catch {
          // Read receipt is best-effort.
        }
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status !== 401) console.error("Failed to open conversation:", err);
      } finally {
        setMessagesLoading(false);
      }
    },
    []
  );

  const closeConversation = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
  }, []);

  const startConversation = useCallback(
    async (receiverId: string): Promise<Conversation | null> => {
      try {
        const { data } = await axiosInstance.post("/messages/conversations", {
          receiverId,
        });
        setConversations((prev) => [
          data,
          ...prev.filter((c) => c._id !== data._id),
        ]);
        setActiveConversationId(data._id);
        setMessages([]);
        setMessagesLoading(true);
        try {
          const { data: detail } = await axiosInstance.get(`/messages/${data._id}`);
          setMessages(Array.isArray(detail.messages) ? detail.messages : []);
        } catch {
          // Fresh conversation — no history is fine.
        } finally {
          setMessagesLoading(false);
        }
        return data as Conversation;
      } catch (err) {
        console.error("Failed to start conversation:", err);
        return null;
      }
    },
    []
  );

  const conversationsRef = useRef(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const sendMessage = useCallback(
    async (text: string): Promise<boolean> => {
      const activeId = activeIdRef.current;
      const conv = conversationsRef.current.find((c) => c._id === activeId);
      const receiverId = conv?.otherUser?._id;
      const cleanText = text.trim();
      if (!activeId || !receiverId || !cleanText) return false;

      setSending(true);
      const temp: Message = {
        _id: `temp-${Date.now()}`,
        conversationId: activeId,
        senderId: user?._id || "",
        receiverId,
        text: cleanText,
        read: false,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, temp]);

      try {
        const { data } = await axiosInstance.post("/messages/send", {
          receiverId,
          text: cleanText,
        });
        setMessages((prev) =>
          prev.map((m) => (m._id === temp._id ? data.message : m))
        );
        await refreshConversations();
        return true;
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m._id !== temp._id));
        console.error("Failed to send message:", err);
        return false;
      } finally {
        setSending(false);
      }
    },
    [refreshConversations, user]
  );

  // Load the conversation list once per signed-in user.
  const email = user?.email;

  // Reset per signed-in user (React's "adjust state during render" pattern).
  const [lastEmail, setLastEmail] = useState<string | undefined>(email);
  if (email !== lastEmail) {
    setLastEmail(email);
    setConversations([]);
    setActiveConversationId(null);
    setMessages([]);
    setConversationsLoading(true);
  }

  useEffect(() => {
    if (!email) return;
    const t = window.setTimeout(() => refreshConversations(), 0);
    return () => window.clearTimeout(t);
  }, [email, refreshConversations]);

  // Real-time delivery: connect to the shared socket and react to pushes.
  useEffect(() => {
    if (!email) return;
    let mounted = true;
    let s: Awaited<ReturnType<typeof connectSocket>> = null;

    const onMessageNew = async (payload: SocketMessagePayload) => {
      const msg = payload?.message;
      if (!msg) return;
      if (msg.conversationId === activeIdRef.current) {
        setMessages((prev) =>
          prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]
        );
        try {
          await axiosInstance.put(
            `/messages/conversations/${msg.conversationId}/read`
          );
          setConversations((prev) =>
            prev.map((c) =>
              c._id === msg.conversationId ? { ...c, unreadCount: 0 } : c
            )
          );
        } catch {
          // Best-effort read receipt.
        }
      } else {
        refreshConversations();
      }
    };

    const onConversationUpdate = () => {
      refreshConversations();
    };

    (async () => {
      s = await connectSocket();
      if (!mounted || !s) return;
      s.off("message:new", onMessageNew);
      s.off("conversation:update", onConversationUpdate);
      s.on("message:new", onMessageNew);
      s.on("conversation:update", onConversationUpdate);
    })();

    return () => {
      mounted = false;
      if (s) {
        s.off("message:new", onMessageNew);
        s.off("conversation:update", onConversationUpdate);
      }
      // Drop the connection on logout/session switch so the next session
      // authenticates fresh instead of reusing a stale socket.
      disconnectSocket();
    };
  }, [email, refreshConversations]);

  const value = useMemo(
    () => ({
      conversations,
      conversationsLoading,
      unreadTotal,
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
    }),
    [
      conversations,
      conversationsLoading,
      unreadTotal,
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
    ]
  );

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

export function useMessages(): MessagesContextValue {
  const ctx = useContext(MessagesContext);
  if (!ctx) {
    throw new Error("useMessages must be used within a MessagesProvider");
  }
  return ctx;
}
