"use client";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth } from "./firebase";
import axiosInstance from "../lib/axiosInstance";
import type { LoginHistoryEntry } from "../lib/types";
import { getErrorMessage } from "../lib/types";
import { getClientInfo } from "@/lib/clientInfo";
import { useToast } from "@/components/Toast";

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
  googlesignin: () => Promise<void>;
  completeLogin: (data: { user?: User; token?: string }) => void;
  /** Set true before calling completeLogin + router.replace to prevent
   *  onAuthStateChanged from racing with the redirect. */
  suppressAuthListener: (suppress: boolean) => void;
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
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  // Always start loading (true) — including on the server — so the SSR
  // HTML matches the client's first paint. Real auth state resolves in the
  // onAuthStateChanged effect below. (auth is null during SSR.)
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [token, setToken] = useState<string | null>(null);

  // When a manual login flow (login / signup / googlesignin) is in progress,
  // suppress onAuthStateChanged from fetching /loggedinuser so it doesn't
  // race with the manual flow's own /loggedinuser call.
  const loginInProgress = useRef(false);

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        // If a manual login flow is in progress, don't interfere — the flow
        // will call completeLogin() or handle the error itself.
        if (loginInProgress.current) return;

        if (firebaseUser?.email) {
          const otpPending =
            typeof window !== "undefined" &&
            localStorage.getItem(PENDING_OTP_FLAG) === "1";

          // A Chrome OTP verification is still required for this account. Do
          // not restore the session from Firebase — send to OTP page instead.
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
            console.error("Failed to fetch user:", err);
          }
        } else {
          setUser(null);
          localStorage.removeItem("twitter-user");
        }
        setIsLoading(false);
      },
      (error) => {
        // Handle Firebase initialization errors (e.g. auth/invalid-credential
        // from a stale session belonging to a previous Firebase project).
        console.warn("Firebase auth state error:", error?.message || error);
        const code = (error as { code?: string })?.code;
        if (code === "auth/invalid-credential" || code === "auth/invalid-api-key") {
          // Clear stale Firebase session data so the user sees a clean login
          // screen instead of an infinite loading spinner.
          if (auth) {
            signOut(auth).catch(() => {});
          }
          localStorage.removeItem("twitter-user");
          localStorage.removeItem("twiller-jwt");
          localStorage.removeItem(PENDING_OTP_FLAG);
        }
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    loginInProgress.current = true;
    try {
      if (!auth) {
        throw new Error("Firebase not configured. Add NEXT_PUBLIC_FIREBASE_* env vars.");
      }
      // Authenticate credentials with Firebase without persisting session.
      await signInWithEmailAndPassword(auth, email, password);
      // Sign out immediately to prevent onAuthStateChanged from setting user
      // before OTP verification.
      await signOut(auth);
      // No user state is set here; OTP verification will call completeLogin.
    } finally {
      setIsLoading(false);
      loginInProgress.current = false;
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
    loginInProgress.current = true;
    try {
      if (!auth) {
        throw new Error("Firebase not configured. Add NEXT_PUBLIC_FIREBASE_* env vars.");
      }

      // Step 1: Create Firebase account (so credentials exist for login/OTP).
      try {
        await createUserWithEmailAndPassword(auth, email, password);
      } catch (firebaseErr: unknown) {
        const fe = firebaseErr as { code?: string };
        if (fe.code === "auth/email-already-in-use") {
          // Firebase account exists — check if backend user also exists.
          // Use a direct fetch (no auth header) to avoid 401 from the OTP guard.
          try {
            const checkRes = await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/loggedinuser?email=${encodeURIComponent(email)}`
            );
            if (checkRes.ok) {
              // Both Firebase AND backend user exist — this is a real duplicate.
              throw new Error("An account with this email already exists. Please log in.");
            }
            // Backend user doesn't exist — Firebase account is orphaned. Proceed
            // with registration (backend will create the user after OTP verify).
          } catch (checkErr) {
            if (
              checkErr instanceof Error &&
              checkErr.message === "An account with this email already exists. Please log in."
            ) {
              throw checkErr;
            }
            // Network error or other issue — proceed with registration OTP.
          }
        } else {
          throw firebaseErr;
        }
      }

      // Step 2: Send registration OTP (backend user NOT created yet).
      const avatar = "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400";
      const res = await axiosInstance.post("/auth/register-otp", {
        email, displayName, username, phone, avatar,
      });

      // Step 3: Store pending session and redirect to OTP page.
      localStorage.setItem("twiller-login-token", res.data.loginToken || "");
      localStorage.setItem("twiller-login-email", email);
      localStorage.setItem(
        "twiller-login-expires-at",
        String(Date.now() + (res.data.expiresIn ?? 300) * 1000)
      );
      localStorage.setItem("twiller-login-method", "email");
      localStorage.setItem("twiller-login-is-registration", "1");
      localStorage.setItem("twiller-registration-data", JSON.stringify({
        email, displayName, username, phone, avatar,
      }));
      localStorage.setItem(PENDING_OTP_FLAG, "1");
      router.push(`/verify-login-otp?email=${encodeURIComponent(email)}`);
    } finally {
      setIsLoading(false);
      loginInProgress.current = false;
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
      console.error("Failed to refresh user:", err);
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

  /** Temporarily suppress onAuthStateChanged from fetching /loggedinuser.
   *  Call suppressAuthListener(true) before completeLogin + router.replace,
   *  then suppressAuthListener(false) in a microtask after navigation. */
  const suppressAuthListener = (suppress: boolean) => {
    loginInProgress.current = suppress;
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
    loginInProgress.current = true;

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

      // Check if the backend user exists using the Firebase ID token
      // (not the Twiller JWT, which doesn't exist yet for new users).
      let userData: User | null = null;
      let isNewUser = false;

      try {
        const idToken = await firebaseuser.getIdToken();
        const res = await axiosInstance.get("/loggedinuser", {
          params: { email: firebaseuser.email },
          headers: { Authorization: `Bearer ${idToken}` },
        });
        userData = res.data;
      } catch {
        isNewUser = true;
      }

      if (isNewUser) {
        // New user: send registration OTP (backend user created only after verify).
        const avatar = firebaseuser.photoURL || "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400";
        const regRes = await axiosInstance.post("/auth/register-otp", {
          email: firebaseuser.email,
          displayName: firebaseuser.displayName || "User",
          username: firebaseuser.email.split("@")[0],
          avatar,
        });

        localStorage.setItem("twiller-login-token", regRes.data.loginToken || "");
        localStorage.setItem("twiller-login-email", firebaseuser.email);
        localStorage.setItem(
          "twiller-login-expires-at",
          String(Date.now() + (regRes.data.expiresIn ?? 300) * 1000)
        );
        localStorage.setItem("twiller-login-method", "google");
        localStorage.setItem("twiller-login-is-registration", "1");
        localStorage.setItem("twiller-registration-data", JSON.stringify({
          email: firebaseuser.email,
          displayName: firebaseuser.displayName || "User",
          username: firebaseuser.email.split("@")[0],
          avatar,
        }));
        localStorage.setItem(PENDING_OTP_FLAG, "1");
        router.push(`/verify-login-otp?email=${encodeURIComponent(firebaseuser.email)}`);
        return;
      }

      // Existing user: device gate + OTP (always requires OTP now).
      if (!userData) return;
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
          await logout();
          toast(
            axiosErr.response.data?.message ||
              axiosErr.response.data?.error ||
              "Login is not allowed on this device right now.",
            "error"
          );
          return;
        }
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
        return;
      }
      if (code === "auth/popup-blocked") {
        toast("Pop-up blocked. Allow pop-ups for this site and try again.", "error");
        return;
      }
      console.error("Google Sign-In Error:", error);
      toast(getErrorMessage(error, "Login failed"), "error");
    } finally {
      setIsLoading(false);
      loginInProgress.current = false;
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
        suppressAuthListener,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
