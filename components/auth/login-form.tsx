'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { loginUserSession, verifyTotpSession } from '@/lib/api/auth';
import type { LoginCredentials, User } from '@/types/auth';

interface LoginFormProps {
    onSuccess: (user: User, mustSetup2fa?: boolean) => void;
    onError?: (error: Error) => void;
}

export default function LoginForm({ onSuccess, onError }: LoginFormProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [totpToken, setTotpToken] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [step, setStep] = useState<'credentials' | 'totp'>('credentials');
    const totpInputRef = useRef<HTMLInputElement>(null);

    const loginMutation = useMutation({
        mutationFn: (credentials: LoginCredentials) => loginUserSession(credentials),
        onSuccess: (data) => {
            if ('requires_2fa' in data && data.requires_2fa) {
                setTotpToken(data.totp_token);
                setStep('totp');
                setTimeout(() => totpInputRef.current?.focus(), 50);
            } else if ('user' in data) {
                onSuccess(data.user, data.must_setup_2fa);
            }
        },
        onError: (error: Error) => {
            onError?.(error);
        },
    });

    const totpMutation = useMutation({
        mutationFn: ({ token, code }: { token: string; code: string }) =>
            verifyTotpSession(token, code),
        onSuccess: (data) => {
            onSuccess(data.user);
        },
        onError: (error: Error) => {
            setTotpCode('');
            onError?.(error);
        },
    });

    const handleCredentialsSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!username.trim() || !password.trim()) return;
        loginMutation.mutate({ username: username.trim(), password: password.trim() });
    };

    const handleTotpSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const code = totpCode.replace(/\s/g, '');
        if (code.length !== 6) return;
        totpMutation.mutate({ token: totpToken, code });
    };

    if (step === 'totp') {
        const isSubmitting = totpMutation.isPending;
        const code = totpCode.replace(/\s/g, '');
        return (
            <form onSubmit={handleTotpSubmit} className="space-y-5">
                <div className="text-center mb-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-3">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <p className="text-white/90 text-sm">
                        Enter the 6-digit code from your authenticator app
                    </p>
                </div>

                <div>
                    <label htmlFor="totp-code" className="block text-sm font-semibold text-white mb-2">
                        Authentication Code
                    </label>
                    <input
                        ref={totpInputRef}
                        id="totp-code"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                        disabled={isSubmitting}
                        required
                        placeholder="000000"
                        className="w-full px-4 py-3 bg-white/95 border border-white/30 rounded-lg focus:ring-2 focus:ring-white focus:border-white disabled:bg-white/50 disabled:cursor-not-allowed transition-all placeholder-gray-400 text-center text-2xl font-mono tracking-[0.5em]"
                    />
                </div>

                {totpMutation.isError && (
                    <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg backdrop-blur-sm">
                        <p className="text-sm text-white font-medium">
                            Invalid code. Please check your authenticator app and try again.
                        </p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={code.length !== 6 || isSubmitting}
                    className="w-full py-3 px-4 bg-white text-brand-blue font-semibold rounded-lg hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-brand-blue disabled:bg-white/50 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                    {isSubmitting ? (
                        <span className="inline-flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Verifying...
                        </span>
                    ) : (
                        'Verify & Sign In'
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => { setStep('credentials'); setTotpCode(''); setTotpToken(''); }}
                    className="w-full text-sm text-white/70 hover:text-white underline underline-offset-2 transition-colors"
                >
                    Back to login
                </button>
            </form>
        );
    }

    const isFormValid = username.trim().length > 0 && password.trim().length > 0;
    const isSubmitting = loginMutation.isPending;

    return (
        <form onSubmit={handleCredentialsSubmit} className="space-y-5">
            <div>
                <label
                    htmlFor="username"
                    className="block text-sm font-semibold text-white mb-2"
                >
                    Username
                </label>
                <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isSubmitting}
                    required
                    autoComplete="username"
                    className="w-full px-4 py-3 bg-white/95 border border-white/30 rounded-lg focus:ring-2 focus:ring-white focus:border-white disabled:bg-white/50 disabled:cursor-not-allowed transition-all placeholder-gray-400"
                    placeholder="Enter your username"
                />
            </div>

            <div>
                <div className="flex items-center justify-between mb-2">
                    <label
                        htmlFor="password"
                        className="block text-sm font-semibold text-white"
                    >
                        Password
                    </label>
                    <Link
                        href="/forgot-password"
                        className="text-xs text-white/70 hover:text-white underline underline-offset-2 transition-colors"
                    >
                        Forgot password?
                    </Link>
                </div>
                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                    autoComplete="current-password"
                    className="w-full px-4 py-3 bg-white/95 border border-white/30 rounded-lg focus:ring-2 focus:ring-white focus:border-white disabled:bg-white/50 disabled:cursor-not-allowed transition-all placeholder-gray-400"
                    placeholder="Enter your password"
                />
            </div>

            {loginMutation.isError && (
                <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg backdrop-blur-sm">
                    <p className="text-sm text-white font-medium">
                        Invalid username or password. Please try again.
                    </p>
                </div>
            )}

            <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="w-full py-3 px-4 bg-white text-brand-blue font-semibold rounded-lg hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-brand-blue disabled:bg-white/50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
                {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Signing in...
                    </span>
                ) : (
                    'Sign In'
                )}
            </button>
        </form>
    );
}
