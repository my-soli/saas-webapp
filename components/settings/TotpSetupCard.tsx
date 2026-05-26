'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, ShieldOff, Loader2, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { getTotpStatus, getTotpSetupData, confirmTotp, disableTotp } from '@/lib/api/auth';
import type { TotpStatus } from '@/lib/api/auth';
import { toast } from 'sonner';

type CardState = 'idle' | 'setting-up' | 'disabling';

export default function TotpSetupCard() {
    const queryClient = useQueryClient();
    const [cardState, setCardState] = useState<CardState>('idle');
    const [confirmCode, setConfirmCode] = useState('');
    const [disablePassword, setDisablePassword] = useState('');
    const [disableCode, setDisableCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const { data: status, isLoading } = useQuery<TotpStatus>({
        queryKey: ['totp-status'],
        queryFn: getTotpStatus,
    });

    const { data: setupData, isLoading: loadingSetup } = useQuery({
        queryKey: ['totp-setup'],
        queryFn: getTotpSetupData,
        enabled: cardState === 'setting-up',
        staleTime: 0,
    });

    const confirmMutation = useMutation({
        mutationFn: (code: string) => confirmTotp(code),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['totp-status'] });
            queryClient.removeQueries({ queryKey: ['totp-setup'] });
            setCardState('idle');
            setConfirmCode('');
            toast.success('Two-factor authentication enabled.');
        },
        onError: () => {
            toast.error('Invalid code. Please try again.');
        },
    });

    const disableMutation = useMutation({
        mutationFn: ({ password, code }: { password: string; code: string }) =>
            disableTotp(password, code),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['totp-status'] });
            setCardState('idle');
            setDisablePassword('');
            setDisableCode('');
            toast.success('Two-factor authentication disabled.');
        },
        onError: () => {
            toast.error('Incorrect password or invalid code. Please try again.');
        },
    });

    if (isLoading) {
        return (
            <div className="rounded-lg border border-gray-200 p-6 animate-pulse">
                <div className="h-5 w-48 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-72 bg-gray-200 rounded" />
            </div>
        );
    }

    const enabled = status?.enabled ?? false;

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-5">
            <div className="flex items-start gap-3">
                {enabled ? (
                    <ShieldCheck className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                    <ShieldOff className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                )}
                <div>
                    <h3 className="text-sm font-semibold text-gray-900">Two-Factor Authentication (2FA)</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {enabled
                            ? 'Your account is protected with an authenticator app.'
                            : 'Add an extra layer of security using an authenticator app like Google Authenticator or Authy.'}
                    </p>
                </div>
                {enabled && (
                    <span className="ml-auto flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
                        <CheckCircle2 className="w-3 h-3" /> Enabled
                    </span>
                )}
            </div>

            {/* ── Disabled idle ── */}
            {!enabled && cardState === 'idle' && (
                <button
                    onClick={() => setCardState('setting-up')}
                    className="px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-brand-blue/90 active:scale-95 transition-all"
                >
                    Enable 2FA
                </button>
            )}

            {/* ── Setup flow ── */}
            {!enabled && cardState === 'setting-up' && (
                <div className="space-y-5 pt-2 border-t border-gray-100">
                    {loadingSetup && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Loader2 className="w-4 h-4 animate-spin" /> Generating QR code...
                        </div>
                    )}

                    {setupData && (
                        <>
                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">
                                    1. Scan this QR code with your authenticator app
                                </p>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={setupData.qr_url}
                                    alt="TOTP QR Code"
                                    width={160}
                                    height={160}
                                    className="rounded border border-gray-200"
                                />
                            </div>

                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-1">
                                    Or enter this key manually
                                </p>
                                <code className="block px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm font-mono tracking-widest select-all break-all">
                                    {setupData.secret}
                                </code>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    2. Enter the 6-digit code from your app to confirm
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={6}
                                    value={confirmCode}
                                    onChange={(e) => setConfirmCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                    placeholder="000000"
                                    className="w-40 px-4 py-2 border border-gray-300 rounded-lg text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => confirmMutation.mutate(confirmCode)}
                                    disabled={confirmCode.length !== 6 || confirmMutation.isPending}
                                    className="px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all inline-flex items-center gap-2"
                                >
                                    {confirmMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Confirm & Enable
                                </button>
                                <button
                                    onClick={() => { setCardState('idle'); setConfirmCode(''); }}
                                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── Enabled idle ── */}
            {enabled && cardState === 'idle' && (
                <button
                    onClick={() => setCardState('disabling')}
                    className="px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 active:scale-95 transition-all"
                >
                    Disable 2FA
                </button>
            )}

            {/* ── Disable flow ── */}
            {enabled && cardState === 'disabling' && (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <XCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-amber-800">
                            Disabling 2FA reduces your account security. Confirm with your password and current authenticator code.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                        <div className="relative w-72">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={disablePassword}
                                onChange={(e) => setDisablePassword(e.target.value)}
                                autoComplete="current-password"
                                className="w-full pr-10 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                placeholder="Your current password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Authenticator Code
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            value={disableCode}
                            onChange={(e) => setDisableCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                            placeholder="000000"
                            className="w-40 px-4 py-2 border border-gray-300 rounded-lg text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => disableMutation.mutate({ password: disablePassword, code: disableCode })}
                            disabled={!disablePassword || disableCode.length !== 6 || disableMutation.isPending}
                            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all inline-flex items-center gap-2"
                        >
                            {disableMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Confirm Disable
                        </button>
                        <button
                            onClick={() => { setCardState('idle'); setDisablePassword(''); setDisableCode(''); }}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
