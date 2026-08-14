export interface TweetAuthor {
  _id: string;
  username: string;
  displayName: string;
  avatar?: string;
  verified?: boolean;
}

export interface TweetReply {
  _id?: string;
  user?: TweetAuthor;
  content: string;
  timestamp?: string;
}

export interface Tweet {
  _id: string;
  id?: string;
  content?: string;
  image?: string;
  audioUrl?: string;
  audioDurationSeconds?: number;
  audioSizeBytes?: number;
  type?: string;
  author: TweetAuthor;
  timestamp?: string;
  likes?: number;
  retweets?: number;
  comments?: number;
  likedBy?: string[];
  retweetedBy?: string[];
  replies?: TweetReply[];
}

export type DeviceType = "desktop" | "laptop" | "mobile" | "tablet" | "unknown";
export type LoginMethod = "email" | "google" | "unknown";

export interface LoginHistoryEntry {
  _id?: string;
  userId?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  deviceType?: DeviceType | string;
  device?: string; // legacy alias
  ipAddress?: string;
  ip?: string; // legacy alias
  loginMethod?: LoginMethod | string;
  loginTime?: string;
  loggedInAt?: string; // legacy alias
}

export interface LoginHistoryResponse {
  items: LoginHistoryEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Payload broadcast over Socket.IO when a new tweet matches a monitored keyword.
export interface KeywordNotificationPayload {
  tweetId: string;
  content: string;
  author: {
    username: string;
    displayName: string;
    avatar?: string;
  };
  timestamp?: string;
}

// A profile as returned by the follow/followers/following/suggested endpoints.
export interface FollowUser {
  _id: string;
  username: string;
  displayName: string;
  avatar?: string;
  verified?: boolean;
  accountType?: "public" | "private";
  requested?: boolean;
}

// In-app follow notification ("John started following you").
export interface FollowNotification {
  _id: string;
  type: "follow" | "follow_request" | "request_accepted" | "reply" | "like" | "retweet";
  read: boolean;
  timestamp: string;
  actor: FollowUser;
}

// A pending follow request (from the Follow Requests page).
export interface FollowRequest {
  _id: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  sender: FollowUser;
}

// Direct message. senderId is the populated author object after a GET.
export interface Message {
  _id: string;
  conversationId: string;
  senderId: string | TweetAuthor;
  receiverId: string;
  text: string;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
}

// A 1:1 direct-message conversation with the other participant flattened to
// otherUser and the current user's unread count precomputed by the server.
export interface Conversation {
  _id: string;
  participants: TweetAuthor[];
  otherUser?: TweetAuthor | null;
  lastMessage?: string;
  lastMessageAt?: string;
  lastSenderId?: string | null;
  unreadCount?: number;
  updatedAt?: string;
}

export function getErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again."
): string {  if (typeof err === "object" && err !== null) {
    const e = err as {
      response?: { data?: { error?: unknown; message?: unknown } };
      message?: unknown;
    };
    const data = e.response?.data;
    if (typeof data?.error === "string") return data.error;
    if (data?.error && typeof data.error === "object") {
      const nested = data.error as { message?: unknown };
      if (typeof nested.message === "string") return nested.message;
    }
    if (typeof data?.message === "string") return data.message;
    if (typeof e.message === "string") return e.message;
  }
  return fallback;
}
