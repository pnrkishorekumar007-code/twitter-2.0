"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

import LoadingSpinner from './loading-spinner';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { useAuth } from '@/context/AuthContext';
import TwitterLogo from './Twitterlogo';
import axiosInstance from '@/lib/axiosInstance';
import { getErrorMessage } from '@/lib/types';
import { getClientInfo } from '@/lib/clientInfo';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';



interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const { login, signup, logout, isLoading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    displayName: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [lastOpen, setLastOpen] = useState(false);
  if (isOpen && !lastOpen) {
    setLastOpen(true);
    setMode(initialMode);
    setErrors({});
    setFormData({ email: '', password: '', username: '', displayName: '' });
  } else if (!isOpen && lastOpen) {
    setLastOpen(false);
  }

  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (mode === 'signup') {
      if (!formData.username.trim()) {
        newErrors.username = 'Username is required';
      } else if (formData.username.length < 3) {
        newErrors.username = 'Username must be at least 3 characters';
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        newErrors.username = 'Username can only contain letters, numbers, and underscores';
      }

      if (!formData.displayName.trim()) {
        newErrors.displayName = 'Display name is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || isLoading) return;

    try {
      if (mode === 'login') {
        // Credential validation first (Firebase) — this matches the task's
        // "after successful credential validation" step.
        await login(formData.email, formData.password);

        // Advanced login security: device gate + Chrome OTP decision.
        const loginRes = await axiosInstance.post('/auth/login', {
          email: formData.email,
          method: 'email',
          clientInfo: getClientInfo(),
        });

        if (loginRes.data?.requiresOtp) {
          localStorage.setItem('twiller-login-token', loginRes.data.loginToken || '');
          localStorage.setItem('twiller-login-email', formData.email);
          localStorage.setItem(
            'twiller-login-expires-at',
            String(Date.now() + (loginRes.data.expiresIn ?? 300) * 1000)
          );
          localStorage.setItem('twiller-login-method', 'email');
          if (loginRes.data.devCode) {
            localStorage.setItem('twiller-login-dev-code', loginRes.data.devCode);
          }
          onClose();
          router.push(`/verify-login-otp?email=${encodeURIComponent(formData.email)}`);
          return;
        }

        if (loginRes.data?.token) {
          localStorage.setItem('twiller-jwt', loginRes.data.token);
        }
      } else {
        await signup(formData.email, formData.password, formData.username, formData.displayName);
      }
      onClose();
      setFormData({ email: '', password: '', username: '', displayName: '' });
      setErrors({});
    } catch (error) {
      // If the device gate rejected the login (e.g. mobile outside the IST
      // window) the account is already signed into Firebase — roll it back.
      const axiosErr = error as {
        response?: { status?: number; data?: { message?: string; error?: string } };
      };
      if (axiosErr?.response?.status === 403) {
        try {
          await logout();
        } catch {
          // ignore
        }
        const msg =
          axiosErr.response.data?.message ||
          axiosErr.response.data?.error ||
          'Login is not allowed on this device right now.';
        setErrors({ general: msg });
        return;
      }
      setErrors({ general: getErrorMessage(error, 'Authentication failed. Please try again.') });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setErrors({});
    setFormData({ email: '', password: '', username: '', displayName: '' });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto">
        <Card className="w-full max-w-md my-auto max-h-[90dvh] overflow-y-auto bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] animate-fade-up">
          <CardHeader className="relative pb-6">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 text-white/70 hover:bg-white/10 hover:text-white transition-colors duration-200"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <TwitterLogo size="xl" className="text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">
                {mode === 'login' ? 'Sign in to X' : 'Create your account'}
              </CardTitle>
            </div>
          </CardHeader>

        <CardContent className="space-y-6">
          {errors.general && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-white">Display Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="Your display name"
                      value={formData.displayName}
                      onChange={(e) => handleInputChange('displayName', e.target.value)}
                      className="pl-10 bg-white/[0.03] border-white/[0.1] text-white placeholder-gray-400 focus:border-brand focus:ring-brand/30"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.displayName && (
                    <p className="text-red-400 text-sm">{errors.displayName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-white">Username</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">@</span>
                    <Input
                      id="username"
                      type="text"
                      placeholder="username"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      className="pl-8 bg-white/[0.03] border-white/[0.1] text-white placeholder-gray-400 focus:border-brand focus:ring-brand/30"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.username && (
                    <p className="text-red-400 text-sm">{errors.username}</p>
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="pl-10 bg-white/[0.03] border-white/[0.1] text-white placeholder-gray-400 focus:border-brand focus:ring-brand/30"
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-sm">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="pl-10 pr-10 bg-white/[0.03] border-white/[0.1] text-white placeholder-gray-400 focus:border-brand focus:ring-brand/30"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-sm">{errors.password}</p>
              )}
              {mode === 'login' && (
                <button
                  type="button"
                  className="text-blue-400 text-sm hover:underline"
                  onClick={() => {
                    onClose();
                    router.push('/forgot-password');
                  }}
                >
                  Forgot password?
                </button>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-brand-gradient animate-gradient text-white font-bold py-3 rounded-full text-lg shadow-lg shadow-brand/30 hover:brightness-110 hover:scale-[1.02] transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                </div>
              ) : (
                mode === 'login' ? 'Sign in' : 'Create account'
              )}
            </Button>
          </form>

          <div className="relative">
            <Separator className="bg-gray-700" />
            <span className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black px-2 text-gray-400 text-sm">
              OR
            </span>
          </div>

          <div className="text-center">
            <p className="text-gray-400">
              {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
              <Button
                variant="link"
                className="text-blue-400 hover:text-blue-300 font-semibold pl-1"
                onClick={switchMode}
                disabled={isLoading}
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </Button>
            </p>
          </div>

          {mode === 'signup' && (
            <div className="text-center text-xs text-gray-400">
              By signing up, you agree to our Terms of Service and Privacy Policy, including Cookie Use.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}