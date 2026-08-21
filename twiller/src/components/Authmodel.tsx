"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Mail, Lock, User, Eye, EyeOff, Phone } from 'lucide-react';

import LoadingSpinner from './loading-spinner';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import TwitterLogo from './Twitterlogo';
import axiosInstance from '@/lib/axiosInstance';
import { getErrorMessage } from '@/lib/types';
import { getClientInfo } from '@/lib/clientInfo';
import { isWithinISTWindow, looksLikeMobileDevice } from '@/lib/timeWindow';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';



interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const { login, signup, logout, completeLogin, isLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    displayName: '',
    phone: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [lastOpen, setLastOpen] = useState(false);
  if (isOpen && !lastOpen) {
    setLastOpen(true);
    setMode(initialMode);
    setErrors({});
    setFormData({ email: '', password: '', username: '', displayName: '', phone: '' });
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
      newErrors.email = t('auth_err_email_required');
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
      newErrors.email = t('auth_err_email_invalid');
    }

    if (!formData.password.trim()) {
      newErrors.password = t('auth_err_password_required');
    } else if (formData.password.length < 6) {
      newErrors.password = t('auth_err_password_short');
    }

    if (mode === 'signup') {
      if (!formData.username.trim()) {
        newErrors.username = t('auth_err_username_required');
      } else if (formData.username.length < 3) {
        newErrors.username = t('auth_err_username_short');
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        newErrors.username = t('auth_err_username_chars');
      }

      if (!formData.displayName.trim()) {
        newErrors.displayName = t('auth_err_displayname_required');
      }

      if (formData.phone && !/^[+]?[0-9\s\-()]{7,20}$/.test(formData.phone)) {
        newErrors.phone = t('auth_err_phone_invalid');
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
        // Mobile devices may only sign in 10:00 AM–1:00 PM IST. The backend
        // enforces the same rule; this pre-check gives an instant, translated
        // message without touching Firebase first.
        if (looksLikeMobileDevice() && !isWithinISTWindow(10, 13)) {
          setErrors({ general: t('auth_err_mobile_window') });
          return;
        }

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
          onClose();
          router.push(`/verify-login-otp?email=${encodeURIComponent(formData.email)}`);
          return;
        }

        if (loginRes.data?.token) {
          // Hydrate the session state (user + token) so direct logins on
          // non-Chrome browsers actually sign the user in. The OTP flow calls
          // completeLogin on the /verify-login-otp page instead.
          completeLogin({
            token: loginRes.data.token,
            user: loginRes.data.user,
          });
        }
      } else {
        await signup(
          formData.email,
          formData.password,
          formData.username,
          formData.displayName,
          formData.phone || undefined
        );
      }
      onClose();
      setFormData({ email: '', password: '', username: '', displayName: '', phone: '' });
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
        const serverMsg =
          axiosErr.response.data?.message ||
          axiosErr.response.data?.error ||
          '';
        const msg =
          serverMsg ||
          (looksLikeMobileDevice() && !isWithinISTWindow(10, 13)
            ? t('auth_err_mobile_window')
            : t('auth_err_login_blocked'));
        setErrors({ general: msg });
        return;
      }
      setErrors({ general: getErrorMessage(error, t('auth_err_auth_failed')) });
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
    setFormData({ email: '', password: '', username: '', displayName: '', phone: '' });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto">
        <Card className="w-full max-w-md my-auto max-h-[90dvh] overflow-y-auto rounded-2xl">
          <CardHeader className="relative pb-6">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 text-muted-foreground hover:bg-hover-overlay hover:text-foreground transition-colors duration-200"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <TwitterLogo size="xl" className="text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                {mode === 'login' ? t('auth_sign_in_title') : t('auth_signup_title')}
              </CardTitle>
            </div>
          </CardHeader>

        <CardContent className="space-y-6">
          {errors.general && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-destructive text-sm">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-foreground">{t('auth_display_name')}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                    <Input
                      id="displayName"
                      type="text"
                      placeholder={t('auth_display_name_placeholder')}
                      value={formData.displayName}
                      onChange={(e) => handleInputChange('displayName', e.target.value)}
                      className="pl-10 bg-transparent border-border text-white placeholder:text-muted-foreground focus:border-brand"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.displayName && (
                    <p className="text-destructive text-sm">{errors.displayName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-foreground">{t('auth_username')}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">@</span>
                    <Input
                      id="username"
                      type="text"
                      placeholder={t('auth_username_placeholder')}
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      className="pl-8 bg-transparent border-border text-white placeholder:text-muted-foreground focus:border-brand"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.username && (
                    <p className="text-destructive text-sm">{errors.username}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-foreground">{t('auth_phone_optional')}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder={t('auth_phone_placeholder')}
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="pl-10 bg-transparent border-border text-white placeholder:text-muted-foreground focus:border-brand"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-destructive text-sm">{errors.phone}</p>
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">{t('auth_email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth_email_placeholder')}
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="pl-10 bg-transparent border-border text-white placeholder:text-muted-foreground focus:border-brand"
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="text-destructive text-sm">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">{t('auth_password')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth_password_placeholder')}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="pl-10 pr-10 bg-transparent border-border text-white placeholder:text-muted-foreground focus:border-brand"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.password && (
                <p className="text-destructive text-sm">{errors.password}</p>
              )}
              {mode === 'login' && (
                <button
                  type="button"
                  className="text-brand text-sm hover:underline"
                  onClick={() => {
                    onClose();
                    router.push('/forgot-password');
                  }}
                >
                  {t('auth_forgot_password')}
                </button>
              )}
            </div>

          <Button
            type="submit"
              className="w-full bg-brand text-white font-bold py-3 rounded-full text-lg hover:bg-x-blue-hover"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span>{mode === 'login' ? t('auth_signing_in') : t('auth_creating_account')}</span>
                </div>
              ) : (
                mode === 'login' ? t('auth_sign_in') : t('auth_create_account')
              )}
            </Button>
          </form>

          <div className="relative">
            <Separator className="bg-border" />
            <span className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-muted-foreground text-sm">
              {t('auth_or')}
            </span>
          </div>

          <div className="text-center">
            <p className="text-muted-foreground">
              {mode === 'login' ? t('auth_no_account') : t('auth_have_account')}
              <Button
                variant="link"
                className="text-brand hover:text-brand/80 font-semibold pl-1"
                onClick={switchMode}
                disabled={isLoading}
              >
                {mode === 'login' ? t('auth_sign_up') : t('auth_sign_in')}
              </Button>
            </p>
          </div>

          {mode === 'signup' && (
            <div className="text-center text-xs text-muted-foreground">
              {t('auth_terms')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}