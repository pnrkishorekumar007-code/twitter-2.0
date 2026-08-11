"use client";

import { Search } from "lucide-react";
import React from "react";
import { Input } from "../ui/input";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { BadgeCheck } from "lucide-react";

const suggestions = [
  {
    id: "1",
    username: "narendramodi",
    displayName: "Narendra Modi",
    avatar: "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400",
    verified: true,
  },
  {
    id: "2",
    username: "akshaykumar",
    displayName: "Akshay Kumar",
    avatar: "https://images.pexels.com/photos/1382735/pexels-photo-1382735.jpeg?auto=compress&cs=tinysrgb&w=400",
    verified: true,
  },
  {
    id: "3",
    username: "rashtrapatibhvn",
    displayName: "President of India",
    avatar: "https://images.pexels.com/photos/1080213/pexels-photo-1080213.jpeg?auto=compress&cs=tinysrgb&w=400",
    verified: true,
  },
];

export default function RightSidebar() {
  return (
    <div className="w-full space-y-4 sticky top-0">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
        <Input
          placeholder="Search"
          className="pl-12 bg-muted/50 border-transparent text-foreground placeholder:text-muted-foreground rounded-full py-3 focus-visible:border-brand/40 focus-visible:ring-brand/20 focus-visible:ring-[3px]"
        />
      </div>

      {/* Subscribe to Premium */}
      <Card className="bg-card border-border rounded-2xl overflow-hidden">
        <div className="h-1.5 bg-brand-gradient animate-gradient" />
        <CardContent className="p-4">
          <h3 className="text-foreground text-xl font-bold mb-2">
            Subscribe to Premium
          </h3>
          <p className="text-muted-foreground text-sm mb-4">
            Subscribe to unlock new features and if eligible, receive a share
            of revenue.
          </p>
          <Button className="bg-brand-gradient animate-gradient text-white font-semibold rounded-full shadow-lg shadow-brand/30 hover:brightness-110">
            Subscribe
          </Button>
        </CardContent>
      </Card>

      {/* Who to follow */}
      <Card className="bg-card border-border rounded-2xl overflow-hidden">
        <CardContent className="p-4">
          <h3 className="text-foreground text-xl font-bold mb-4">
            You might like
          </h3>
          <div className="space-y-1">
            {suggestions.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between px-2 py-2 rounded-xl hover:bg-accent/60 -mx-2 transition-colors"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={user.avatar} alt={user.displayName} />
                    <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1">
                      <span className="text-foreground font-semibold truncate hover:underline">
                        {user.displayName}
                      </span>
                      {user.verified && (
                        <BadgeCheck className="h-4 w-4 text-brand shrink-0" />
                      )}
                    </div>
                    <span className="text-muted-foreground text-sm">
                      @{user.username}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="bg-foreground text-background hover:bg-foreground/80 font-semibold rounded-full px-4 shrink-0"
                >
                  Follow
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            className="text-brand hover:text-brand/80 hover:bg-brand/10 p-0 mt-3 rounded-lg"
          >
            Show more
          </Button>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="p-4 text-xs text-muted-foreground space-y-2">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <a href="#" className="hover:underline hover:text-foreground transition-colors">
            Terms of Service
          </a>
          <a href="#" className="hover:underline hover:text-foreground transition-colors">
            Privacy Policy
          </a>
          <a href="#" className="hover:underline hover:text-foreground transition-colors">
            Cookie Policy
          </a>
          <a href="#" className="hover:underline hover:text-foreground transition-colors">
            Accessibility
          </a>
          <a href="#" className="hover:underline hover:text-foreground transition-colors">
            Ads info
          </a>
        </div>
        <div>© 2024 Twiller Corp.</div>
      </div>
    </div>
  );
}
