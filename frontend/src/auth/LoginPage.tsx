import React, { useState } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth';
import { auth, googleProvider, isDemoMode } from './firebase';
import { Shield, ArrowRight, Lock, Phone, Mail } from 'lucide-react';

type FieldError = string | null;
type AuthMethod = 'email' | 'phone';

interface LoginPageProps {
  onNavigate?: (route: string) => void;
  onLoginSuccess?: () => void;
}

export default function LoginPage({ onNavigate, onLoginSuccess }: LoginPageProps) {
  // Shared state
  const [formError, setFormError] = useState<FieldError>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');

  // Email/Password state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<FieldError>(null);
  const [passwordError, setPasswordError] = useState<FieldError>(null);

  // Phone auth state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState<FieldError>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<FieldError>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  const handleNav = (route: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (onNavigate) {
      onNavigate(route);
    } else {
      window.location.href = route;
    }
  };

  const handleSuccess = () => {
    if (onLoginSuccess) {
      onLoginSuccess();
    } else if (onNavigate) {
      onNavigate('/workstation');
    } else {
      window.location.href = '/';
    }
  };

  // --- Demo Mode ---
  const handleDemoLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      handleSuccess();
    }, 400);
  };

  // --- Email/Password ---
  const validateEmail = (): boolean => {
    let valid = true;
    setEmailError(null);
    setPasswordError(null);
    setFormError(null);

    if (!email.trim()) {
      setEmailError('Badge ID or agency email is required.');
      valid = false;
    }
    if (!password) {
      setPasswordError('Password is required.');
      valid = false;
    }
    return valid;
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDemoMode()) {
      handleDemoLogin();
      return;
    }

    if (!validateEmail()) return;

    setIsLoading(true);
    setFormError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      handleSuccess();
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setFormError('Invalid credentials. Check your department authorization.');
      } else if (error.code === 'auth/too-many-requests') {
        setFormError('Account locked due to multiple failed attempts. Please contact your system administrator.');
      } else {
        setFormError('Department authentication service unreachable. Check Firebase configuration.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- Google SSO ---
  const handleGoogleSignIn = async () => {
    if (isDemoMode()) {
      handleDemoLogin();
      return;
    }

    setIsGoogleLoading(true);
    setFormError(null);

    try {
      await signInWithPopup(auth, googleProvider);
      handleSuccess();
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code === 'auth/popup-closed-by-user') {
        setIsGoogleLoading(false);
        return;
      } else {
        setFormError('Google Department SSO service unavailable.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // --- Phone Auth ---
  const validatePhone = (): boolean => {
    setPhoneError(null);
    setFormError(null);
    if (!phoneNumber.trim()) {
      setPhoneError('Phone number is required (include country code, e.g. +91...).');
      return false;
    }
    if (!/^\+\d{10,15}$/.test(phoneNumber.replace(/\s/g, ''))) {
      setPhoneError('Enter a valid phone number with country code (e.g. +919876543210).');
      return false;
    }
    return true;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDemoMode()) {
      handleDemoLogin();
      return;
    }

    if (!validatePhone()) return;

    setIsLoading(true);
    setFormError(null);

    try {
      // Set up invisible reCAPTCHA
      const recaptchaContainer = document.getElementById('recaptcha-container');
      if (!recaptchaContainer) {
        setFormError('reCAPTCHA container not found.');
        setIsLoading(false);
        return;
      }

      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });

      const result = await signInWithPhoneNumber(auth, phoneNumber.replace(/\s/g, ''), recaptchaVerifier);
      setConfirmationResult(result);
      setOtpSent(true);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === 'auth/invalid-phone-number') {
        setPhoneError('Invalid phone number format.');
      } else if (error.code === 'auth/too-many-requests') {
        setFormError('Too many OTP requests. Please wait before retrying.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setFormError('Phone authentication is not enabled for this project. Contact administrator.');
      } else {
        setFormError(`SMS verification failed: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    setFormError(null);

    if (!otpCode.trim()) {
      setOtpError('Verification code is required.');
      return;
    }

    if (!confirmationResult) {
      setFormError('Session expired. Please request a new OTP.');
      return;
    }

    setIsLoading(true);

    try {
      await confirmationResult.confirm(otpCode);
      handleSuccess();
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code === 'auth/invalid-verification-code') {
        setOtpError('Invalid verification code. Please try again.');
      } else if (error.code === 'auth/code-expired') {
        setOtpError('Verification code expired. Request a new one.');
        setOtpSent(false);
        setConfirmationResult(null);
      } else {
        setFormError('Verification failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isAnyLoading = isLoading || isGoogleLoading;

  return (
    <div className="min-h-screen bg-[#F5F5F2] text-[#1C1F1D] flex flex-col justify-between font-sans">
      
      {/* Top Banner */}
      <div className="bg-[#EBEBE6] border-b border-[#D9DCD8] text-xs py-1.5 px-6 text-[#666B67]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#1C1F1D]">MHA / NCRB</span>
            <span className="text-[#D9DCD8]">|</span>
            <span>SECURE INVESTIGATOR AUTHENTICATION GATEWAY</span>
          </div>
          <span className="text-[#556B5D] font-semibold">AUTHORIZED ACCESS ONLY</span>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white border-b border-[#D9DCD8]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={(e) => handleNav('/', e)} className="flex items-center gap-3 cursor-pointer">
            <div className="w-8 h-8 rounded bg-[#556B5D] text-white flex items-center justify-center font-bold text-sm">
              <Shield className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="font-bold text-base tracking-tight text-[#1C1F1D] leading-none">
                NEXUS-CRIME
              </div>
              <div className="text-xs text-[#666B67] mt-0.5">
                Criminal Network Analytics
              </div>
            </div>
          </button>

          <button
            onClick={(e) => handleNav('/landing', e)}
            className="text-xs text-[#666B67] hover:text-[#1C1F1D] transition-colors cursor-pointer font-medium"
          >
            ← Back to Overview
          </button>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md bg-white border border-[#D9DCD8] rounded p-7 sm:p-8 space-y-6 shadow-sm">

          {/* Header */}
          <div className="space-y-1 pb-4 border-b border-[#D9DCD8]">
            <div className="text-xs text-[#556B5D] font-semibold">
              INVESTIGATOR SIGN IN
            </div>
            <h1 className="text-2xl font-bold text-[#1C1F1D] tracking-tight">
              Access Workspace
            </h1>
            <p className="text-xs text-[#666B67]">
              Authorized law-enforcement personnel only. All access is logged.
            </p>
            {isDemoMode() && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                ⚠ Demo Mode — Authentication is bypassed. Actions will be attributed to INV-DEMO-001.
              </div>
            )}
          </div>

          {/* Google Workspace SSO */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isAnyLoading}
            className="w-full flex items-center justify-center gap-3 bg-[#F5F5F2] hover:bg-[#EBEBE6] disabled:opacity-50 border border-[#D9DCD8] text-xs font-semibold text-[#1C1F1D] px-4 py-2.5 rounded transition-colors cursor-pointer"
          >
            <span className="font-bold font-mono text-[#556B5D]">G</span>
            <span>{isGoogleLoading ? 'Verifying Department SSO…' : 'Sign in with Official Department Google SSO'}</span>
          </button>

          {/* Auth Method Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-[#D9DCD8]" />
            <div className="flex gap-1 bg-[#F5F5F2] rounded p-0.5 border border-[#D9DCD8]">
              <button
                onClick={() => { setAuthMethod('email'); setFormError(null); }}
                className={`flex items-center gap-1 text-[11px] font-medium px-3 py-1 rounded transition-colors cursor-pointer ${
                  authMethod === 'email'
                    ? 'bg-white text-[#1C1F1D] shadow-sm border border-[#D9DCD8]'
                    : 'text-[#666B67] hover:text-[#1C1F1D]'
                }`}
              >
                <Mail className="w-3 h-3" /> Email
              </button>
              <button
                onClick={() => { setAuthMethod('phone'); setFormError(null); }}
                className={`flex items-center gap-1 text-[11px] font-medium px-3 py-1 rounded transition-colors cursor-pointer ${
                  authMethod === 'phone'
                    ? 'bg-white text-[#1C1F1D] shadow-sm border border-[#D9DCD8]'
                    : 'text-[#666B67] hover:text-[#1C1F1D]'
                }`}
              >
                <Phone className="w-3 h-3" /> Phone
              </button>
            </div>
            <div className="flex-1 h-px bg-[#D9DCD8]" />
          </div>

          {/* Form Error */}
          {formError && (
            <div className="p-3 bg-rose-50 border border-[#914B4B]/30 rounded text-xs text-[#914B4B]">
              {formError}
            </div>
          )}

          {/* Email/Password Form */}
          {authMethod === 'email' && (
            <form onSubmit={handleEmailSignIn} className="space-y-4" noValidate>
              <div className="space-y-1 text-xs">
                <label htmlFor="badge-id" className="block text-[#1C1F1D] font-medium">
                  Officer Badge ID / Official Email
                </label>
                <input
                  id="badge-id"
                  type="text"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                  placeholder="e.g. officer@department.gov.in"
                  className="w-full bg-[#F5F5F2] border border-[#D9DCD8] focus:border-[#556B5D] rounded px-3 py-2 text-xs text-[#1C1F1D] placeholder:text-[#666B67]/60 focus:outline-none transition-colors"
                />
                {emailError && <p className="text-[11px] text-[#914B4B] mt-1">{emailError}</p>}
              </div>

              <div className="space-y-1 text-xs">
                <label htmlFor="password" className="block text-[#1C1F1D] font-medium">
                  Passphrase / Token
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(null); }}
                  placeholder="••••••••••••"
                  className="w-full bg-[#F5F5F2] border border-[#D9DCD8] focus:border-[#556B5D] rounded px-3 py-2 text-xs text-[#1C1F1D] placeholder:text-[#666B67]/60 focus:outline-none transition-colors"
                />
                {passwordError && <p className="text-[11px] text-[#914B4B] mt-1">{passwordError}</p>}
              </div>

              <button
                type="submit"
                disabled={isAnyLoading}
                className="w-full flex items-center justify-center gap-2 text-xs font-semibold bg-[#556B5D] hover:bg-[#435449] disabled:opacity-50 text-white py-2.5 rounded transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Verifying Authorization…' : 'Sign In'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* Phone Auth Form */}
          {authMethod === 'phone' && !otpSent && (
            <form onSubmit={handleSendOtp} className="space-y-4" noValidate>
              <div className="space-y-1 text-xs">
                <label htmlFor="phone-number" className="block text-[#1C1F1D] font-medium">
                  Registered Mobile Number
                </label>
                <input
                  id="phone-number"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => { setPhoneNumber(e.target.value); setPhoneError(null); }}
                  placeholder="+91 98765 43210"
                  className="w-full bg-[#F5F5F2] border border-[#D9DCD8] focus:border-[#556B5D] rounded px-3 py-2 text-xs text-[#1C1F1D] placeholder:text-[#666B67]/60 focus:outline-none transition-colors"
                />
                {phoneError && <p className="text-[11px] text-[#914B4B] mt-1">{phoneError}</p>}
              </div>

              <button
                type="submit"
                disabled={isAnyLoading}
                className="w-full flex items-center justify-center gap-2 text-xs font-semibold bg-[#556B5D] hover:bg-[#435449] disabled:opacity-50 text-white py-2.5 rounded transition-colors cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Sending OTP…' : 'Send Verification Code'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* OTP Verification Form */}
          {authMethod === 'phone' && otpSent && (
            <form onSubmit={handleVerifyOtp} className="space-y-4" noValidate>
              <div className="p-3 bg-[#F5F5F2] border border-[#D9DCD8] rounded text-xs text-[#666B67]">
                A verification code was sent to <strong className="text-[#1C1F1D]">{phoneNumber}</strong>
              </div>

              <div className="space-y-1 text-xs">
                <label htmlFor="otp-code" className="block text-[#1C1F1D] font-medium">
                  6-Digit Verification Code
                </label>
                <input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, '')); setOtpError(null); }}
                  placeholder="000000"
                  className="w-full bg-[#F5F5F2] border border-[#D9DCD8] focus:border-[#556B5D] rounded px-3 py-2 text-xs text-[#1C1F1D] text-center tracking-[0.5em] font-mono placeholder:text-[#666B67]/60 focus:outline-none transition-colors"
                />
                {otpError && <p className="text-[11px] text-[#914B4B] mt-1">{otpError}</p>}
              </div>

              <button
                type="submit"
                disabled={isAnyLoading}
                className="w-full flex items-center justify-center gap-2 text-xs font-semibold bg-[#556B5D] hover:bg-[#435449] disabled:opacity-50 text-white py-2.5 rounded transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Verifying…' : 'Verify & Sign In'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => { setOtpSent(false); setConfirmationResult(null); setOtpCode(''); }}
                className="w-full text-xs text-[#666B67] hover:text-[#1C1F1D] transition-colors cursor-pointer"
              >
                ← Use a different number
              </button>
            </form>
          )}

          {/* Invisible reCAPTCHA container for Phone Auth */}
          <div id="recaptcha-container" />

          {/* Audit Notice */}
          <div className="pt-3 border-t border-[#D9DCD8] text-[11px] text-[#666B67] leading-relaxed">
            NOTICE: Unauthorized access is an offense under Section 66 of the Information Technology Act, 2000. All sessions are logged for accountability.
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#D9DCD8] bg-white py-4 text-xs text-[#666B67] text-center">
        NEXUS-CRIME · AI-Powered Criminal Network Analysis System
      </footer>

    </div>
  );
}
