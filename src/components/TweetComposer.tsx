"use client";

import { useAuth } from "@/context/AuthContext";
import React, { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import {
  Image,
  Smile,
  Calendar,
  MapPin,
  BarChart3,
  Globe,
  AudioLines,
  X,
  BadgeCheck,
} from "lucide-react";
import { Separator } from "./ui/separator";
import axios from "axios";
import axiosInstance from "@/lib/axiosInstance";
import { useLanguage } from "@/context/LanguageContext";
import AudioRecorder from "./AudioRecorder";

const TweetComposer = ({ onTweetPosted }: any) => {
  const { user, canPost, plan, tweetsUsed, tweetLimit, incrementTweetsUsed } =
    useAuth();
  const { t } = useLanguage();
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [imageurl, setimageurl] = useState("");
  const [showAudio, setShowAudio] = useState(false);
  const [audioData, setAudioData] = useState<{
    url: string;
    name: string;
    duration: number;
  } | null>(null);
  const maxLength = 200;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!user || !content.trim()) return;
    if (!canPost) {
      alert(`${t("feed.whatsHappening")} — ${tweetsUsed}/${tweetLimit}`);
      return;
    }
    try {
      const tweetdata: any = {
        author: user?._id,
        content,
        image: imageurl,
      };
      if (audioData) {
        tweetdata.audioName = audioData.name;
        tweetdata.audioDuration = audioData.duration;
      }
      const res = await axiosInstance.post("/post", tweetdata);
      if (audioData) {
        res.data.audioUrl = audioData.url;
      }
      onTweetPosted(res.data);
      incrementTweetsUsed();
      setContent("");
      setimageurl("");
      setAudioData(null);
      setShowAudio(false);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  const characterCount = content.length;
  const isOverLimit = characterCount > maxLength;
  const isNearLimit = characterCount > maxLength * 0.8;
  if (!user) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsLoading(true);
    const image = e.target.files[0];
    const formdataimg = new FormData();
    formdataimg.set("image", image);
    try {
      const res = await axios.post(
        "https://api.imgbb.com/1/upload?key=97f3fb960c3520d6a88d7e29679cf96f",
        formdataimg
      );
      const url = res.data.data.display_url;
      if (url) {
        setimageurl(url);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-black border-gray-800 border-x-0 border-t-0 rounded-none">
      <CardContent className="p-4">
        <div className="flex space-x-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar} alt={user.displayName} />
            <AvatarFallback>{user.displayName[0]}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">
                {plan === "gold"
                  ? `${t("premium.unlimited")}`
                  : `${tweetsUsed}/${tweetLimit} ${t("common.posts")}`}
              </span>
              {!canPost && (
                <span className="text-xs text-red-400 flex items-center">
                  <BadgeCheck className="h-3 w-3 mr-1" /> Limit reached
                </span>
              )}
            </div>

            <form onSubmit={handleSubmit}>
              <Textarea
                placeholder={t("feed.whatsHappening")}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="bg-transparent border-none text-xl text-white placeholder-gray-500 resize-none min-h-[120px] focus-visible:ring-0 focus-visible:ring-offset-0"
              />

              {imageurl && (
                <div className="relative mb-3 rounded-2xl overflow-hidden">
                  <img
                    src={imageurl}
                    alt="Tweet"
                    className="w-full max-h-96 object-cover"
                  />
                  <button
                    onClick={() => setimageurl("")}
                    className="absolute top-2 right-2 bg-black/70 rounded-full p-1.5 hover:bg-black/90"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              )}

              {showAudio && (
                <div className="mb-3">
                  <AudioRecorder onAudioChange={setAudioData} />
                </div>
              )}

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-4 text-blue-400">
                  <label
                    htmlFor="tweetImage"
                    className="p-2 rounded-full hover:bg-blue-900/20 cursor-pointer"
                  >
                    <Image className="h-5 w-5" />
                    <input
                      type="file"
                      accept="image/*"
                      id="tweetImage"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={isLoading}
                    />
                  </label>
                  <button
                    className={`p-2 rounded-full hover:bg-blue-900/20 ${
                      showAudio ? "bg-blue-900/20" : ""
                    }`}
                    onClick={() => setShowAudio((v) => !v)}
                  >
                    <AudioLines className="h-5 w-5" />
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 rounded-full hover:bg-blue-900/20"
                  >
                    <BarChart3 className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 rounded-full hover:bg-blue-900/20"
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 rounded-full hover:bg-blue-900/20"
                  >
                    <Calendar className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 rounded-full hover:bg-blue-900/20"
                  >
                    <MapPin className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="hidden sm:flex items-center space-x-2">
                    <Globe className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-blue-400 font-semibold">
                      {t("feed.everyoneReply")}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {characterCount > 0 && (
                      <div className="flex items-center space-x-2">
                        <div className="relative w-8 h-8">
                          <svg className="w-8 h-8 transform -rotate-90">
                            <circle
                              cx="16"
                              cy="16"
                              r="14"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill="none"
                              className="text-gray-700"
                            />
                            <circle
                              cx="16"
                              cy="16"
                              r="14"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 14}`}
                              strokeDashoffset={`${
                                2 * Math.PI * 14 * (1 - characterCount / maxLength)
                              }`}
                              className={
                                isOverLimit
                                  ? "text-red-500"
                                  : isNearLimit
                                  ? "text-yellow-500"
                                  : "text-blue-500"
                              }
                            />
                          </svg>
                        </div>
                        {isNearLimit && (
                          <span
                            className={`text-sm ${
                              isOverLimit ? "text-red-500" : "text-yellow-500"
                            }`}
                          >
                            {maxLength - characterCount}
                          </span>
                        )}
                      </div>
                    )}
                    <Separator orientation="vertical" className="h-6 bg-gray-700" />

                    <Button
                      type="submit"
                      disabled={
                        !content.trim() ||
                        isOverLimit ||
                        isLoading ||
                        !canPost ||
                        (showAudio && !audioData)
                      }
                      className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-full px-6"
                    >
                      {isLoading ? t("common.loading") : t("common.post")}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TweetComposer;
