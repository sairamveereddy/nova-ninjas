import React, { useState } from 'react';
import { AlertCircle, Send, Check, X, Loader2 } from 'lucide-react';
import { API_URL } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

const VerificationBanner = () => {
    const { user, isAuthenticated, refreshUser } = useAuth();
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Check localStorage for persistent dismissal
    const [hidden, setHidden] = useState(() => {
        if (typeof window !== 'undefined' && user?.email) {
            const key = `verification_banner_dismissed_${user.email}`;
            return localStorage.getItem(key) === 'true';
        }
        return false;
    });

    // EMERGENCY FIX: Hide for known verified users while DB issue is resolved
    const knownVerifiedEmails = ['srkreddy452@gmail.com'];
    const isKnownVerified = user?.email && knownVerifiedEmails.includes(user.email.toLowerCase());

    // Only show if user is logged in but NOT verified
    // We check explicitly for is_verified === true to avoid showing it for non-boolean falsy values
    if (!isAuthenticated || !user || user.is_verified === true || hidden || isKnownVerified) {
        return null;
    }

    const handleRefreshStatus = async () => {
        setRefreshing(true);
        setError(null);
        try {
            const updatedUser = await refreshUser();
            if (updatedUser?.is_verified === true) {
                // Success! Component will unmount
            } else {
                setError('Still unverified. Please check your email or resend the link.');
                setTimeout(() => setError(null), 5000);
            }
        } catch (err) {
            setError('Failed to refresh status.');
        } finally {
            setRefreshing(false);
        }
    };

    const handleResend = async () => {
        setSending(true);
        setError(null);
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/auth/resend-verification`, {
                method: 'POST',
                headers: {
                    'token': token
                }
            });

            if (response.ok) {
                setSent(true);
                setTimeout(() => setSent(false), 5000);
            } else {
                const data = await response.json();
                setError(data.detail || 'Failed to resend verification email');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 sticky top-0 z-[60]">
            <div className="container mx-auto flex items-center justify-between gap-3 text-sm text-amber-800">
                <div className="flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="truncate">Please verify <strong>{user?.email}</strong> to access all features.</span>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    <button
                        onClick={handleRefreshStatus}
                        disabled={refreshing}
                        className="text-amber-600 hover:text-amber-700 underline text-xs font-semibold whitespace-nowrap disabled:opacity-50 flex items-center gap-1"
                    >
                        {refreshing && <Loader2 className="w-3 h-3 animate-spin" />}
                        Check status
                    </button>

                    <button
                        onClick={handleResend}
                        disabled={sending || sent}
                        className="flex items-center gap-1.5 font-bold underline hover:text-amber-900 disabled:no-underline disabled:opacity-70 transition-all whitespace-nowrap"
                    >
                        {sending ? 'Sending...' : sent ? (
                            <span className="flex items-center gap-1 text-green-700">
                                <Check className="w-3.5 h-3.5" /> Sent!
                            </span>
                        ) : (
                            <>
                                <Send className="w-3.5 h-3.5" />
                                Resend Link
                            </>
                        )}
                    </button>

                    <button
                        onClick={() => {
                            if (user?.email) {
                                const key = `verification_banner_dismissed_${user.email}`;
                                localStorage.setItem(key, 'true');
                            }
                            setHidden(true);
                        }}
                        className="text-amber-400 hover:text-amber-600 ml-1 p-1 rounded-full hover:bg-amber-100 transition-colors"
                        title="Dismiss for now"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
            {error && (
                <div className="container mx-auto mt-1 flex justify-center">
                    <span className="text-[10px] text-red-600 font-bold bg-white px-2 py-0.5 rounded border border-red-100 shadow-sm animate-pulse">
                        {error}
                    </span>
                </div>
            )}
        </div>
    );
};

export default VerificationBanner;
