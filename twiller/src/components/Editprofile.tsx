"use client";

import { useAuth } from "@/context/AuthContext";
import React, { useState } from "react";
import { CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Camera, ImagePlus, LinkIcon, MapPin, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import LoadingSpinner from "./loading-spinner";
import { AnimatePresence, motion } from "@/lib/motion";
import { useToast } from "./Toast";
import { getErrorMessage } from "@/lib/types";
import axios from "axios";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const BANNER_MAX_DIM = 1500; // banner is wide (3:1), keep it big
const AVATAR_MAX_DIM = 400;

// Downscales an image client-side (canvas) so large photos upload fast and
// stay within ImageBB's free-tier limits. Returns a JPEG Blob.
function downscaleImage(file: File, maxDim: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not decode the image file."));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas is not supported in this browser."));
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) =>
            blob ? resolve(blob) : reject(new Error("Image processing failed.")),
          "image/jpeg",
          0.85
        );
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

const Editprofile = ({ isopen, onclose }: { isopen: boolean; onclose: () => void }) => {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [imageBusy, setImageBusy] = useState<"avatar" | "banner" | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [formData, setFormdata] = useState({
    displayName: user?.displayName || "",
    bio: user?.bio || "",
    location: user?.location || "",
    website: user?.website || "",
    avatar: user?.avatar || "",
    banner: user?.banner || "",
  });
  const [error, setError] = useState<Record<string, string>>({});
  if (!isopen || !user) return null;
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = "Display name is required";
    } else if (formData.displayName.length > 50) {
      newErrors.displayName = "Display name must be 50 characters or less";
    }

    if (formData.bio.length > 160) {
      newErrors.bio = "Bio must be 160 characters or less";
    }

    if (formData.website && formData.website.length > 100) {
      newErrors.website = "Website must be 100 characters or less";
    }

    if (formData.location && formData.location.length > 30) {
      newErrors.location = "Location must be 30 characters or less";
    }

    setError(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || isLoading) return;

    setIsLoading(true);
    try {
      await updateProfile(formData);
      toast("Profile updated", "success", "Your changes were saved.");
      onclose();
    } catch (err) {
      setError({ general: getErrorMessage(err, "Failed to update profile. Please try again.") });
      toast(getErrorMessage(err, "Failed to update profile"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormdata((prev) => ({ ...prev, [field]: value }));
    if (error[field]) {
      setError((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Uploads a local image to ImageBB (same host the avatar already uses),
  // downscaling + validating it first. Returns the public URL.
  const uploadImage = async (file: File, kind: "avatar" | "banner") => {
    const apiKey = process.env.NEXT_PUBLIC_IMGBB_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        "Image upload isn't configured. Set NEXT_PUBLIC_IMGBB_KEY in twiller/.env.local and restart the dev server."
      );
    }
    if (!file.type.startsWith("image/")) {
      throw new Error("Please choose an image file (JPG, PNG, GIF, WebP).");
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error("Image must be 8 MB or smaller.");
    }
    const processed = await downscaleImage(file, kind === "banner" ? BANNER_MAX_DIM : AVATAR_MAX_DIM);
    const formdataimg = new FormData();
    formdataimg.append("image", processed, file.name);
    const res = await axios.post(
      `https://api.imgbb.com/1/upload?key=${apiKey}`,
      formdataimg
    );
    const url = res.data?.data?.display_url || res.data?.data?.url;
    if (!url) throw new Error("Image upload failed. Please try again.");
    return url as string;
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageBusy("avatar");
    try {
      const url = await uploadImage(file, "avatar");
      setFormdata((prev) => ({ ...prev, avatar: url }));
      setError({});
      toast("Avatar updated", "success", "Your new photo will be saved when you hit Save.");
    } catch (err) {
      const msg = getErrorMessage(err, "Avatar upload failed.");
      setError({ general: msg });
      toast(msg, "error");
    } finally {
      setImageBusy(null);
    }
  };

  const handleBannerFile = async (file: File) => {
    setImageBusy("banner");
    try {
      const url = await uploadImage(file, "banner");
      setFormdata((prev) => ({ ...prev, banner: url }));
      setError({});
      toast("Banner updated", "success", "Your new banner will be saved when you hit Save.");
    } catch (err) {
      const msg = getErrorMessage(err, "Banner upload failed.");
      setError({ general: msg });
      toast(msg, "error");
    } finally {
      setImageBusy(null);
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await handleBannerFile(file);
  };

  const clearBanner = () => {
    setFormdata((prev) => ({ ...prev, banner: "" }));
    toast("Banner removed", "info", "Your banner will reset to the default on Save.");
  };

  return (
    <AnimatePresence>
      {isopen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Edit profile"
          onClick={onclose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl bg-card border border-border text-foreground max-h-[90vh] overflow-y-auto rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="relative pb-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-foreground rounded-full"
                    onClick={onclose}
                    disabled={isLoading || imageBusy !== null}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                  <CardTitle className="text-xl font-bold">Edit profile</CardTitle>
                </div>
                <Button
                  type="submit"
                  form="edit-profile-form"
                  className="bg-foreground text-background hover:opacity-90 font-semibold rounded-full px-6"
                  disabled={isLoading || imageBusy !== null}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span>Saving...</span>
                    </div>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {error.general && (
                <div className="bg-destructive/10 border border-destructive/40 rounded-lg p-3 text-destructive text-sm m-4">
                  {error.general}
                </div>
              )}

              <form id="edit-profile-form" onSubmit={handleSubmit}>
                {/* Banner / Cover Photo */}
                <div
                  className="relative"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleBannerFile(file);
                  }}
                >
                  <div
                    className={`h-48 relative overflow-hidden bg-brand-gradient animate-gradient ${
                      dragOver ? "ring-4 ring-brand/70" : ""
                    }`}
                  >
                    {formData.banner ? (
                      <img
                        src={formData.banner}
                        alt="Profile banner preview"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/25" />
                    )}
                    {imageBusy === "banner" && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <LoadingSpinner size="lg" />
                      </div>
                    )}
                    {dragOver && (
                      <div className="absolute inset-0 bg-brand/20 flex items-center justify-center">
                        <p className="text-white font-bold text-sm bg-black/60 rounded-full px-4 py-2">
                          Drop to change banner
                        </p>
                      </div>
                    )}

                    <input
                      type="file"
                      accept="image/*"
                      id="bannerUpload"
                      className="hidden"
                      onChange={handleBannerChange}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-3 rounded-full bg-black/70 hover:bg-black/90 text-white"
                      disabled={imageBusy !== null}
                      onClick={() => document.getElementById("bannerUpload")?.click()}
                      aria-label="Change banner image"
                    >
                      <Camera className="h-6 w-6" />
                    </Button>
                    {formData.banner && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 p-2 rounded-full bg-black/70 hover:bg-black/90 text-white"
                        disabled={imageBusy !== null}
                        onClick={clearBanner}
                        aria-label="Remove banner image"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="absolute bottom-2 left-2 text-[11px] text-white/90 bg-black/50 rounded-full px-2 py-0.5 flex items-center gap-1">
                    <ImagePlus className="h-3 w-3" /> Click or drag & drop
                  </p>

                  {/* Profile Picture */}
                  <div className="absolute -bottom-16 left-4">
                    <div className="relative">
                      <Avatar className="h-32 w-32 border-4 border-card">
                        <AvatarImage src={formData.avatar} alt={user?.displayName} />
                        <AvatarFallback className="text-2xl">
                          {user?.displayName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <input
                        type="file"
                        accept="image/*"
                        id="avatarUpload"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-3 rounded-full bg-black/70 hover:bg-black/90 text-white"
                        disabled={imageBusy !== null}
                        onClick={() =>
                          document.getElementById("avatarUpload")?.click()
                        }
                        aria-label="Change profile picture"
                      >
                        {imageBusy === "avatar" ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <Camera className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4 mt-16 space-y-6">
                  {/* Display Name */}
                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="text-foreground">
                      Name
                    </Label>
                    <Input
                      id="displayName"
                      type="text"
                      value={formData.displayName}
                      onChange={(e) =>
                        handleInputChange("displayName", e.target.value)
                      }
                      className="bg-transparent border-input text-foreground placeholder:text-muted-foreground focus:border-brand"
                      placeholder="Your display name"
                      maxLength={50}
                      disabled={isLoading}
                    />
                    <div className="flex justify-between text-sm">
                      {error.displayName && (
                        <p className="text-red-500">{error.displayName}</p>
                      )}
                      <p className="text-muted-foreground ml-auto">
                        {formData.displayName.length}/50
                      </p>
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-foreground">
                      Bio
                    </Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => handleInputChange("bio", e.target.value)}
                      className="bg-transparent border-input text-foreground placeholder:text-muted-foreground focus:border-brand resize-none min-h-[100px]"
                      placeholder="Tell the world about yourself"
                      maxLength={160}
                      disabled={isLoading}
                    />
                    <div className="flex justify-between text-sm">
                      {error.bio && <p className="text-red-500">{error.bio}</p>}
                      <p className="text-muted-foreground ml-auto">
                        {formData.bio.length}/160
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-foreground">
                      Location
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                      <Input
                        id="location"
                        type="text"
                        value={formData.location}
                        onChange={(e) =>
                          handleInputChange("location", e.target.value)
                        }
                        className="pl-10 bg-transparent border-input text-foreground placeholder:text-muted-foreground focus:border-brand"
                        placeholder="Where are you located?"
                        maxLength={30}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      {error.location && (
                        <p className="text-red-500">{error.location}</p>
                      )}
                      <p className="text-muted-foreground ml-auto">
                        {formData.location.length}/30
                      </p>
                    </div>
                  </div>

                  {/* Website */}
                  <div className="space-y-2">
                    <Label htmlFor="website" className="text-foreground">
                      Website
                    </Label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                      <Input
                        id="website"
                        type="text"
                        value={formData.website}
                        onChange={(e) =>
                          handleInputChange("website", e.target.value)
                        }
                        className="pl-10 bg-transparent border-input text-foreground placeholder:text-muted-foreground focus:border-brand"
                        placeholder="Your website URL"
                        maxLength={100}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      {error.website && (
                        <p className="text-red-500">{error.website}</p>
                      )}
                      <p className="text-muted-foreground ml-auto">
                        {formData.website.length}/100
                      </p>
                    </div>
                  </div>
                </div>
              </form>
            </CardContent>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Editprofile;
