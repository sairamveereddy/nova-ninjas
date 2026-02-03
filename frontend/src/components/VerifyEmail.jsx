import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Header from './Header';
import SideMenu from './SideMenu';
import { API_URL } from '../config/api';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { refreshUser, isAuthenticated } = useAuth();
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    const [status, setStatus] = useState('loading'); // loading, success, error
    const [message, setMessage] = useState('');
    const [sideMenuOpen, setSideMenuOpen] = useState(false);

    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setStatus('error');
                setMessage('Missing verification token.');
                return;
            }

            try {
                let url = `${API_URL}/api/auth/verify-email?token=${token}`;
                if (email) url += `&email=${encodeURIComponent(email)}`;

                const response = await fetch(url);
                const data = await response.json();

                if (response.ok) {
                    setStatus('success');
                    setMessage('Your email has been successfully verified! You can now access all features.');

                    // Refresh user data if logged in to update verification status in session
                    if (isAuthenticated) {
                        try {
                            await refreshUser();
                        } catch (e) {
                            console.error('Error refreshing user status:', e);
                        }
                    }
                } else {
                    setStatus('error');
                    setMessage(data.detail || 'Verification failed. The link may be invalid or expired.');
                }
            } catch (error) {
                setStatus('error');
                setMessage('An error occurred during verification. Please try again later.');
            }
        };

        verifyToken();
    }, [token, isAuthenticated, refreshUser]);

    return (
        <div className="min-h-screen bg-slate-50">
            <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />
            <Header onMenuClick={() => setSideMenuOpen(true)} />

            <main className="container mx-auto px-6 py-20 flex justify-center">
                <Card className="max-w-md w-full p-8 text-center shadow-lg">
                    {status === 'loading' && (
                        <div className="space-y-4">
                            <Loader2 className="w-16 h-16 mx-auto text-blue-500 animate-spin" />
                            <h1 className="text-2xl font-bold">Verifying your email...</h1>
                            <p className="text-gray-600">Please wait while we confirm your account.</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="space-y-6">
                            <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
                            <h1 className="text-2xl font-bold">Account Verified!</h1>
                            <p className="text-gray-600">{message}</p>
                            <Button
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
                                onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
                            >
                                {isAuthenticated ? 'Go to Dashboard' : 'Go to Login'}
                            </Button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="space-y-6">
                            <XCircle className="w-16 h-16 mx-auto text-red-500" />
                            <h1 className="text-2xl font-bold">Verification Failed</h1>
                            <p className="text-gray-600">{message}</p>
                            <div className="flex flex-col gap-3">
                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={() => navigate('/signup')}
                                >
                                    Back to Sign Up
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => navigate('/')}
                                >
                                    Return to Home
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            </main>
        </div>
    );
};

export default VerifyEmail;
