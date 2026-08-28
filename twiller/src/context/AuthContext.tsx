"use client";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { auth } from "./firebase";
import axiosInstance, { clearFirebaseTokenCache } from "../lib/axiosInstance";
import { getBackendBaseUrl } from "../lib/backendUrl";
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
  suppressAuthListener: (suppress: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PENDING_OTP_FLAG = "twiller-otp-pending";

// Extract the full Firebase error surface (code, message, response payload) so the
// browser console shows exactly what Identity Toolkit returned — helps debug the 400.
function describeFirebaseError(err: unknown, action: string): string {
  const e = err as {
    code?: string;
    message?: string;
    customData?: { serverMessage?: string };
    response?: { status?: number; data?: unknown };
  };
  try {
    console.error(
      `[Twiller] Firebase ${action} failed — error.code=${e?.code} error.message=${e?.message} error.response?.data=${JSON.stringify(e?.response?.data ?? null)} error.customData?.serverMessage=${e?.customData?.serverMessage ?? "n/a"}`
    );
  } catch {
    // logging must never break auth
  }
  return e?.message || e?.code || "Unknown Firebase error";
}

// Dedup: in-flight /loggedinuser promise cache keyed by email.
const inflightUserFetches = new Map<string, Promise<User | null>>();

async function fetchUserByEmail(email: string): Promise<User | null> {
  const existing = inflightUserFetches.get(email);
  if (existing) return existing;

  const promise = axiosInstance
    .get("/loggedinuser", { params: { email } })
    .then((res) => res.data as User)
    .catch((err) => {
      if (err?.response?.status === 404) return null;
      console.error(
        `[Twiller] /loggedinuser for ${email} failed:`,
        err?.message || err
      );
      return null;
    })
    .finally(() => inflightUserFetches.delete(email));

  inflightUserFetches.set(email, promise);
  return promise;
}

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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [token, setToken] = useState<string | null>(null);

  const loginInProgress = useRef(false);
  // Cache user by email to avoid redundant fetches on re-mount.
  const userCacheRef = useRef<Map<string, User>>(new Map());

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (loginInProgress.current) return;

        if (firebaseUser?.email) {
          const otpPending =
            typeof window !== "undefined" &&
            localStorage.getItem(PENDING_OTP_FLAG) === "1";

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

          // Check local cache first for instant hydration.
          const cached = userCacheRef.current.get(firebaseUser.email);
          if (cached) {
            setUser(cached);
            localStorage.setItem("twitter-user", JSON.stringify(cached));
            setIsLoading(false);
            return;
          }

          try {
            const userData = await fetchUserByEmail(firebaseUser.email);
            if (userData) {
              setUser(userData);
              userCacheRef.current.set(firebaseUser.email, userData);
              localStorage.setItem("twitter-user", JSON.stringify(userData));
            }
          } catch (err) {
            console.error("Failed to fetch user:", err);
          }
        } else {
          // Email/password logins (and email OTP logins) sign out of Firebase,
          // so the absence of a Firebase user is NOT proof of logout. When an
          // OTP isn't pending and we hold a valid backend session, restore the
          // cached user so a completed login survives auth events and refresh.
          if (
            typeof window !== "undefined" &&
            localStorage.getItem(PENDING_OTP_FLAG) !== "1" &&
            localStorage.getItem("twiller-jwt")
          ) {
            const cachedRaw = localStorage.getItem("twitter-user");
            if (cachedRaw) {
              try {
                const cachedUser = JSON.parse(cachedRaw) as User;
                if (cachedUser?.email) {
                  setUser(cachedUser);
                  setIsLoading(false);
                  return;
                }
              } catch {
                // fall through to sign-out below
              }
            }
          }
          setUser(null);
          localStorage.removeItem("twitter-user");
        }
        setIsLoading(false);
      },
      (error) => {
        console.warn("Firebase auth state error:", error?.message || error);
        const code = (error as { code?: string })?.code;
        if (code === "auth/invalid-credential" || code === "auth/invalid-api-key") {
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
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (signInErr: unknown) {
        describeFirebaseError(signInErr, "signInWithPassword");
        throw signInErr;
      }
      await signOut(auth);
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

      let firebaseUser;
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        firebaseUser = cred.user;
      } catch (firebaseErr: unknown) {
        const fe = firebaseErr as { code?: string };
        if (fe.code !== "auth/email-already-in-use") {
          describeFirebaseError(firebaseErr, "signUp");
        }
        if (fe.code === "auth/email-already-in-use") {
          // Use the shared axios instance so the Authorization header is
          // attached (Firebase ID token or session JWT) — a raw fetch() sent
          // no credentials, so an auth-gated /loggedinuser returned 401 and
          // the duplicate check never completed.
          const checkErr = await axiosInstance
            .get("/loggedinuser", { params: { email } })
            .catch((e) => e);
          const status = checkErr?.response?.status;
          if (status !== 404 && status !== 401) {
            // A MongoDB profile exists with this email — it's a fully
            // registered account, ask the user to log in instead.
            throw new Error("An account with this email already exists. Please log in.");
          }
          // No MongoDB profile for this email — the earlier Firebase account
          // was created but never OTP-verified. Don't block: (re)send a
          // registration code so the user can complete the OTP flow. The
          // backend never creates a duplicate Mongo user (the actual profile is
          // only inserted in /auth/register-verify after a verified code).
          try {
            const res = await axiosInstance.post("/auth/register-otp", {
              email,
              displayName,
              username,
              phone,
              avatar:
                "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400",
            });
            localStorage.setItem("twiller-login-token", res.data.loginToken || "");
            localStorage.setItem("twiller-login-email", email);
            localStorage.setItem(
              "twiller-login-expires-at",
              String(Date.now() + (res.data.expiresIn ?? 300) * 1000)
            );
            localStorage.setItem("twiller-login-method", "email");
            localStorage.setItem("twiller-login-is-registration", "1");
            localStorage.setItem(
              "twiller-registration-data",
              JSON.stringify({
                email,
                displayName,
                username,
                phone,
                avatar:
                  "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400",
              })
            );
            localStorage.setItem(PENDING_OTP_FLAG, "1");
            router.push(`/verify-login-otp?email=${encodeURIComponent(email)}`);
            return;
          } catch {
            // If the resend fails (e.g. rate limited), surface the duplicate.
            throw new Error("An account with this email already exists. Please log in.");
          }
        }
        throw firebaseErr;
      }

      const avatar = "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400";
      let res;
      try {
        res = await axiosInstance.post("/auth/register-otp", {
          email, displayName, username, phone, avatar,
        });
      } catch (backendErr) {
        // Backend rejected the registration (e.g. duplicate username/email).
        // Clean up the orphaned Firebase account so the user can retry.
        try {
          await firebaseUser.delete();
        } catch {
          // Firebase delete may fail if user isn't recently created — best effort.
        }
        throw backendErr;
      }

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

  const refreshUser = useCallback(async () => {
    if (!user?.email) return;
    try {
      const userData = await fetchUserByEmail(user.email);
      if (userData) {
        setUser(userData);
        userCacheRef.current.set(user.email, userData);
        localStorage.setItem("twitter-user", JSON.stringify(userData));
      }
    } catch (err) {
      console.error("Failed to refresh user:", err);
    }
  }, [user]);

  const logout = async () => {
    setUser(null);
    setToken(null);
    clearFirebaseTokenCache();
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

  const completeLogin = useCallback(({ user: newUser, token: newToken }: { user?: User; token?: string }) => {
    localStorage.removeItem(PENDING_OTP_FLAG);
    if (newToken) {
      setToken(newToken);
      localStorage.setItem("twiller-jwt", newToken);
    }
    if (newUser) {
      setUser(newUser);
      userCacheRef.current.set(newUser.email, newUser);
      localStorage.setItem("twitter-user", JSON.stringify(newUser));
    }
  }, []);

  const suppressAuthListener = useCallback((suppress: boolean) => {
    loginInProgress.current = suppress;
  }, []);

  const updateProfile = useCallback(async (profileData: {
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
      userCacheRef.current.set(user.email, res.data);
      localStorage.setItem("twitter-user", JSON.stringify(res.data));
    }
  }, [user]);

  const updateBanner = useCallback(async (bannerUrl: string) => {
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
      userCacheRef.current.set(user.email, res.data);
      localStorage.setItem("twitter-user", JSON.stringify(res.data));
    }
  }, [user]);

  const googlesignin = useCallback(async () => {
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

      // Parallelize: check if user exists AND get ID token simultaneously.
      const idTokenPromise = firebaseuser.getIdToken();
      const existingUserPromise = fetchUserByEmail(firebaseuser.email);

      const [idToken, userData] = await Promise.all([idTokenPromise, existingUserPromise]);

      if (!userData) {
        // New user: send registration OTP.
        const avatar = firebaseuser.photoURL || "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400";
        const regRes = await axiosInstance.post("/auth/register-otp", {
          email: firebaseuser.email,
          displayName: firebaseuser.displayName || "User",
          username: firebaseuser.email.split("@")[0],
          avatar,
        }, { headers: { Authorization: `Bearer ${idToken}` } });

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

      // Existing user: device gate + OTP decision.
      try {
        const res = await axiosInstance.post("/auth/login", {
          email: userData.email,
          method: "google",
          clientInfo: getClientInfo(),
        }, { headers: { Authorization: `Bearer ${idToken}` } });

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

      // No OTP required — login complete. Use replace for instant redirect.
      localStorage.removeItem(PENDING_OTP_FLAG);
      setUser(userData);
      userCacheRef.current.set(userData.email, userData);
      localStorage.setItem("twitter-user", JSON.stringify(userData));
      router.replace("/home");
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
  }, [router, toast]);

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
