"use client";

import React from 'react';

import {
  Home,
  Search,
  Bell,
  Mail,
  Bookmark,
  User,
  MoreHorizontal,
  Settings,
  LogOut,
  Sparkles,
  PenSquare
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { TwillerBrand } from '../Twitterlogo';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import ThemeToggle from '../ThemeToggle';
import { cn } from '@/lib/utils';

interface SidebarProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
}

export default function Sidebar({ currentPage = 'home', onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const navigation = [
    { name: t('home'), icon: Home, current: currentPage === 'home', page: 'home' },
    { name: t('explore'), icon: Search, current: currentPage === 'explore', page: 'explore' },
    { name: t('notifications'), icon: Bell, current: currentPage === 'notifications', page: 'notifications', badge: true },
    { name: t('messages'), icon: Mail, current: currentPage === 'messages', page: 'messages' },
    { name: t('bookmarks'), icon: Bookmark, current: currentPage === 'bookmarks', page: 'bookmarks' },
    { name: t('profile'), icon: User, current: currentPage === 'profile', page: 'profile' },
    { name: t('premium'), icon: Sparkles, current: currentPage === 'pricing', page: 'pricing' },
    { name: t('more'), icon: MoreHorizontal, current: currentPage === 'more', page: 'more' },
  ];

  const focusComposer = () => {
    onNavigate?.('home');
    window.dispatchEvent(new CustomEvent('twiller:focus-composer'));
  };

  return (
    <div className="flex flex-col h-screen w-full border-r border-border bg-background">
      <div className="p-4">
        <TwillerBrand />
      </div>

      <nav className="flex-1 px-2 overflow-y-auto">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              <Button
                variant="ghost"
                className={cn(
                  'group w-full justify-start text-xl py-3 px-4 rounded-full hover:bg-accent text-foreground hover:text-foreground',
                  item.current && 'font-bold'
                )}
                onClick={() => onNavigate?.(item.page)}
              >
                <item.icon className={cn('mr-4 h-7 w-7 shrink-0 transition-transform duration-200 group-hover:scale-90', item.current && 'text-brand')} />
                <span className="truncate">{item.name}</span>
                {item.badge && (
                  <span className="ml-2 bg-brand text-brand-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-md shadow-brand/40">
                    3
                  </span>
                )}
              </Button>
            </li>
          ))}
        </ul>

        <div className="mt-6 px-2">
          <Button
            className="w-full bg-brand-gradient animate-gradient text-white font-bold py-3 rounded-full text-lg shadow-lg shadow-brand/30 hover:brightness-110 hover:-translate-y-0.5 transition-all"
            onClick={focusComposer}
          >
            <PenSquare className="mr-2 h-5 w-5" />
            {t('post')}
          </Button>
        </div>
      </nav>

      <div className="p-2 border-t border-border">
        <div className="flex justify-end px-2 pb-1">
          <ThemeToggle />
        </div>
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start p-3 rounded-full hover:bg-accent"
              >
                <Avatar className="h-10 w-10 mr-3 ring-2 ring-transparent transition-shadow group-hover:ring-brand/40">
                  <AvatarImage src={user.avatar} alt={user.displayName} />
                  <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-foreground font-semibold truncate">{user.displayName}</div>
                  <div className="text-muted-foreground text-sm truncate">@{user.username}</div>
                </div>
                <MoreHorizontal className="h-5 w-5 text-muted-foreground shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                {t('settings')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                {t('logout')} @{user.username}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
