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
import { auth } from "./firebase";
import axiosInstance from "../lib/axiosInstance";
import {
  detectBrowser,
  detectOS,
  detectDevice,
  detectIp,
} from "@/lib/otp";

export type Plan = "free" | "bronze" | "silver" | "gold";

export interface LoginEntry {
  _id: string;
  browser: string;
  os: string;
  device: string;
  ip: string;
  timestamp: string;
  current: boolean;
}

interface User {
  _id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio?: string;
  joinedDate: string;
  email: string;
  phone?: string;
  website: string;
  location: string;
}

interface AuthContextType {
  user: User | null;
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
    phone?: string;
  }) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  googlesignin: () => void;
  plan: Plan;
  setPlan: (plan: Plan) => void;
  tweetsUsed: number;
  tweetLimit: number;
  canPost: boolean;
  incrementTweetsUsed: () => void;
  loginHistory: LoginEntry[];
  recordLogin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const PLAN_LIMITS: Record<Plan, number> = {
  free: 1,
  bronze: 3,
  silver: 5,
  gold: Infinity,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [plan, setPlanState] = useState<Plan>("free");
  const [tweetsUsed, setTweetsUsed] = useState(0);
  const [loginHistory, setLoginHistory] = useState<LoginEntry[]>([]);

  useEffect(() => {
    const storedPlan = localStorage.getItem("twiller-plan");
    if (storedPlan && ["free", "bronze", "silver", "gold"].includes(storedPlan)) {
      setPlanState(storedPlan as Plan);
    }
    const storedTweets = localStorage.getItem("twiller-tweets-used");
    if (storedTweets) {
      setTweetsUsed(parseInt(storedTweets, 10));
    }
  }, []);

  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }
    // Check for existing session
    const unsubcribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser?.email) {
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
  }, []);

  const recordLogin = async () => {
    const browser = detectBrowser();
    const os = detectOS();
    const device = detectDevice();
    const ip = await detectIp();
    const entry: LoginEntry = {
      _id: `${Date.now()}`,
      browser,
      os,
      device,
      ip,
      timestamp: new Date().toISOString(),
      current: true,
    };
    setLoginHistory((prev) => [
      entry,
      ...prev.map((p) => ({ ...p, current: false })),
    ]);
    try {
      const stored = localStorage.getItem("twiller-login-history");
      const prev: LoginEntry[] = stored ? JSON.parse(stored) : [];
      localStorage.setItem(
        "twiller-login-history",
        JSON.stringify([entry, ...prev.slice(0, 19)])
      );
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem("twiller-login-history");
      if (stored) {
        try {
          setLoginHistory(
            (JSON.parse(stored) as LoginEntry[]).map((l, i) => ({
              ...l,
              current: i === 0,
            }))
          );
        } catch {
          // ignore
        }
      }
    }
  }, [user]);

  const setPlan = (newPlan: Plan) => {
    setPlanState(newPlan);
    localStorage.setItem("twiller-plan", newPlan);
    if (newPlan === "free") {
      setTweetsUsed(0);
      localStorage.setItem("twiller-tweets-used", "0");
    }
  };

  const incrementTweetsUsed = () => {
    setTweetsUsed((prev) => {
      const next = prev + 1;
      localStorage.setItem("twiller-tweets-used", String(next));
      return next;
    });
  };

  const tweetLimit = PLAN_LIMITS[plan];
  const canPost = tweetsUsed < tweetLimit;

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    if (!auth) {
      setIsLoading(false);
      throw new Error("Firebase not configured. Add NEXT_PUBLIC_FIREBASE_* env vars.");
    }
    const usercred = await signInWithEmailAndPassword(auth, email, password);
    const firebaseuser = usercred.user;
    const res = await axiosInstance.get("/loggedinuser", {
      params: { email: firebaseuser.email },
    });
    if (res.data) {
      setUser(res.data);
      localStorage.setItem("twitter-user", JSON.stringify(res.data));
    }
    await recordLogin();
    setIsLoading(false);
  };

  const signup = async (
    email: string,
    password: string,
    username: string,
    displayName: string,
    phone?: string
  ) => {
    setIsLoading(true);
    if (!auth) {
      setIsLoading(false);
      throw new Error("Firebase not configured. Add NEXT_PUBLIC_FIREBASE_* env vars.");
    }
    const usercred = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = usercred.user;
    const newuser: any = {
      username,
      displayName,
      avatar:
        user.photoURL ||
        "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400",
      email: user.email,
      phone: phone || "",
    };
    const res = await axiosInstance.post("/register", newuser);
    if (res.data) {
      setUser(res.data);
      localStorage.setItem("twitter-user", JSON.stringify(res.data));
    }
    await recordLogin();
    setIsLoading(false);
  };

  const logout = async () => {
    setUser(null);
    if (auth) {
      await signOut(auth);
    }
    localStorage.removeItem("twitter-user");
  };

  const updateProfile = async (profileData: {
    displayName: string;
    bio: string;
    location: string;
    website: string;
    avatar: string;
    phone?: string;
  }) => {
    if (!user) return;

    setIsLoading(true);

    const updatedUser: User = {
      ...user,
      ...profileData,
    };
    const res = await axiosInstance.patch(
      `/userupdate/${user.email}`,
      updatedUser
    );
    if (res.data) {
      setUser(updatedUser);
      localStorage.setItem("twitter-user", JSON.stringify(updatedUser));
    }

    setIsLoading(false);
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
      } catch (err: any) {
        const newuser: any = {
          username: firebaseuser.email.split("@")[0],
          displayName: firebaseuser.displayName || "User",
          avatar:
            firebaseuser.photoURL ||
            "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400",
          email: firebaseuser.email,
        };

        const registerRes = await axiosInstance.post("/register", newuser);
        userData = registerRes.data;
      }

      if (userData) {
        setUser(userData);
        localStorage.setItem("twitter-user", JSON.stringify(userData));
        await recordLogin();
      } else {
        throw new Error("Login/Register failed: No user data returned");
      }
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      alert(error.response?.data?.message || error.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        updateProfile,
        logout,
        isLoading,
        googlesignin,
        plan,
        setPlan,
        tweetsUsed,
        tweetLimit,
        canPost,
        incrementTweetsUsed,
        loginHistory,
        recordLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
