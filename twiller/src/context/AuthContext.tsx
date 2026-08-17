"use client";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "./firebase";
import axiosInstance from "../lib/axiosInstance";
import type { LoginHistoryEntry } from "../lib/types";
import { getErrorMessage } from "../lib/types";
import { getClientInfo } from "@/lib/clientInfo";

export interface User {
  _id: string;
  username: string;
  displayName: string;
  avatar: string;
  banner?: string;
  bio?: string;
  joinedDate: string;
  email: string;
  phone?: string;
  website: string;
  location: string;
  verified?: boolean;
  subscriptionPlan?: string;
  tweetLimit?: number;
  tweetsUsed?: number;
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
  paymentStatus?: string;
  notificationsEnabled?: boolean;
  preferredLanguage?: string;
  loginHistory?: LoginHistoryEntry[];
  followers?: string[];
  following?: string[];
  accountType?: "public" | "private";
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    username: string,
    displayName: string,
    phone?: string
  ) => Promise<void>;
  updateProfile: (profileData: {
    displayName: string;
    bio: string;
    location: string;
    website: string;
    avatar: string;
    banner?: string;
    phone?: string;
  }) => Promise<void>;
  updateBanner: (bannerUrl: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  googlesignin: () => void;
  completeLogin: (data: { user?: User; token?: string }) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Set when a login requires OTP verification (Chrome device rule) but the
// Firebase session is already active (e.g. Google sign-in). While set, the
// session-restore path refuses to restore the user, so protected pages stay
// locked until the OTP is verified.
const PENDING_OTP_FLAG = "twiller-otp-pending";

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  // Always start loading (true) — including on the server — so the SSR
  // HTML matches the client's first paint. Real auth state resolves in the
  // onAuthStateChanged effect below. (auth is null during SSR.)
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("twiller-jwt") : null
  );

  useEffect(() => {
    if (!auth) return;
    // Check for existing session
    const unsubcribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser?.email) {
        const otpPending =
          typeof window !== "undefined" &&
          localStorage.getItem(PENDING_OTP_FLAG) === "1";

        // A Chrome OTP verification is still required for this account. Do not
        // restore the session from Firebase — otherwise a Google login could
        // reach the dashboard before OTP verification. Send the user to the
        // OTP page instead.
        if (otpPending) {
          setUser(null);
          localStorage.removeItem("twitter-user");
          if (localStorage.getItem("twiller-login-token")) {
            router.push(
              `/verify-login-otp?email=${encodeURIComponent(firebaseUser.email)}`
            );
          } else {
            localStorage.removeItem(PENDING_OTP_FLAG);
          }
          setIsLoading(false);
          return;
        }

        try {
          const res = await axiosInstance.get("/loggedinuser", {
            params: { email: firebaseUser.email },
          });

          if (res.data) {
            setUser(res.data);
            localStorage.setItem("twitter-user", JSON.stringify(res.data));
          }
        } catch (err) {
          console.log("Failed to fetch user:", err);
        }
      } else {
        setUser(null);
        localStorage.removeItem("twitter-user");
      }
      setIsLoading(false);
    });
    return () => unsubcribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      if (!auth) {
        throw new Error("Firebase not configured. Add NEXT_PUBLIC_FIREBASE_* env vars.");
      }
// Authenticate credentials with Firebase without persisting session.
      await signInWithEmailAndPassword(auth, email, password);
      // Sign out immediately to prevent onAuthStateChanged from setting user before OTP verification.
      await signOut(auth);
      // No user state is set here; OTP verification will call completeLogin.

    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    email: string,
    password: string,
    username: string,
    displayName: string,
    phone?: string
  ) => {
    setIsLoading(true);
    try {
      if (!auth) {
        throw new Error("Firebase not configured. Add NEXT_PUBLIC_FIREBASE_* env vars.");
      }
      // Mock authentication - in real app, this would call an API
      const usercred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = usercred.user;
      const newuser = {
        username,
        displayName,
        avatar: user.photoURL || "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400",
        email: user.email,
        ...(phone ? { phone } : {}),
      };
      const res = await axiosInstance.post("/register", newuser);
      if (res.data) {
        setUser(res.data);
        localStorage.setItem("twitter-user", JSON.stringify(res.data));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!user?.email) return;
    try {
      const res = await axiosInstance.get("/loggedinuser", {
        params: { email: user.email },
      });
      if (res.data) {
        setUser(res.data);
        localStorage.setItem("twitter-user", JSON.stringify(res.data));
      }
    } catch (err) {
      console.log("Failed to refresh user:", err);
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    if (auth) {
      await signOut(auth);
    }
    localStorage.removeItem("twitter-user");
    localStorage.removeItem("twiller-jwt");
    localStorage.removeItem("twiller-login-token");
    localStorage.removeItem("twiller-login-email");
    localStorage.removeItem("twiller-login-expires-at");
    localStorage.removeItem("twiller-login-method");
    localStorage.removeItem(PENDING_OTP_FLAG);
  };

  // Called after a completed login (direct or OTP-verified): persists the
  // session JWT and the user profile returned by the backend.
  const completeLogin = ({ user: newUser, token: newToken }: { user?: User; token?: string }) => {
    localStorage.removeItem(PENDING_OTP_FLAG);
    if (newToken) {
      setToken(newToken);
      localStorage.setItem("twiller-jwt", newToken);
    }
    if (newUser) {
      setUser(newUser);
      localStorage.setItem("twitter-user", JSON.stringify(newUser));
    }
  };

  const updateProfile = async (profileData: {
    displayName: string;
    bio: string;
    location: string;
    website: string;
    avatar: string;
    banner?: string;
  }) => {
    if (!user) return;

    // Send only the editable fields to the new auth-gated endpoint. Falls back
    // to the legacy /userupdate/:email route so this works against a backend
    // that hasn't been restarted with the new routes yet.
    const res = await axiosInstance
      .patch(`/profile/update`, profileData)
      .catch((err) => {
        if (err?.response?.status === 404 || err?.response?.status === 405) {
          return axiosInstance.patch(`/userupdate/${user.email}`, {
            ...user,
            ...profileData,
          });
        }
        throw err;
      });
    if (res.data) {
      setUser(res.data);
      localStorage.setItem("twitter-user", JSON.stringify(res.data));
    }
  };

  const updateBanner = async (bannerUrl: string) => {
    if (!user) return;
    const res = await axiosInstance
      .patch(`/profile/banner`, { banner: bannerUrl })
      .catch((err) => {
        if (err?.response?.status === 404 || err?.response?.status === 405) {
          return axiosInstance.patch(`/userupdate/${user.email}`, {
            ...user,
            banner: bannerUrl,
          });
        }
        throw err;
      });
    if (res.data) {
      setUser(res.data);
      localStorage.setItem("twitter-user", JSON.stringify(res.data));
    }
  };
  const googlesignin = async () => {
    setIsLoading(true);

    try {
      if (!auth) {
        throw new Error("Firebase not configured. Add NEXT_PUBLIC_FIREBASE_* env vars.");
      }
      const googleauthprovider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, googleauthprovider);
      const firebaseuser = result.user;

      if (!firebaseuser?.email) {
        throw new Error("No email found in Google account");
      }

      let userData;

      try {
        const res = await axiosInstance.get("/loggedinuser", {
          params: { email: firebaseuser.email },
        });
        userData = res.data;
      } catch {
        const newuser = {
          username: firebaseuser.email.split("@")[0],
          displayName: firebaseuser.displayName || "User",
          avatar: firebaseuser.photoURL || "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400",
          email: firebaseuser.email,
        };

        const registerRes = await axiosInstance.post("/register", newuser);
        userData = registerRes.data;
      }

      if (!userData) {
        throw new Error("Login/Register failed: No user data returned");
      }

      // Advanced login security: device gate + OTP decision BEFORE any user
      // state is set. A Chrome user must verify OTP before the dashboard.
      try {
        const res = await axiosInstance.post("/auth/login", {
          email: userData.email,
          method: "google",
          clientInfo: getClientInfo(),
        });

        if (res.data?.requiresOtp) {
          localStorage.setItem("twiller-login-token", res.data.loginToken || "");
          localStorage.setItem("twiller-login-email", userData.email);
          localStorage.setItem(
            "twiller-login-expires-at",
            String(Date.now() + (res.data.expiresIn ?? 300) * 1000)
          );
          localStorage.setItem("twiller-login-method", "google");
          localStorage.setItem(PENDING_OTP_FLAG, "1");
          router.push(`/verify-login-otp?email=${encodeURIComponent(userData.email)}`);
          return;
        }

        if (res.data?.token) {
          localStorage.setItem("twiller-jwt", res.data.token);
          setToken(res.data.token);
        }
      } catch (deviceErr) {
        const axiosErr = deviceErr as {
          response?: { status?: number; data?: { message?: string; error?: string } };
        };
        if (axiosErr?.response?.status === 403) {
          // Mobile login outside the allowed window — roll the session back.
          await logout();
          alert(
            axiosErr.response.data?.message ||
              axiosErr.response.data?.error ||
              "Login is not allowed on this device right now."
          );
          return;
        }
        // non-blocking: device check failing for another reason shouldn't
        // block a successful Google sign-in.
      }

      // No OTP required — this login is complete.
      localStorage.removeItem(PENDING_OTP_FLAG);
      setUser(userData);
      localStorage.setItem("twitter-user", JSON.stringify(userData));
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        // User closed the popup / cancelled — not a failure.
        console.log("Google sign-in popup closed by the user.");
        return;
      }
      if (code === "auth/popup-blocked") {
        alert("Pop-up blocked. Allow pop-ups for this site and try again.");
        return;
      }
      console.error("Google Sign-In Error:", error);
      alert(getErrorMessage(error, "Login failed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        signup,
        updateProfile,
        updateBanner,
        refreshUser,
        logout,
        isLoading,
        googlesignin,
        completeLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
