import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Lock, ArrowRight } from 'lucide-react';

/**
 * SubscriptionWall Component
 * 
 * Blocks access to tools for users without active subscription or trial.
 * Shows upgrade modal with pricing information.
 * 
 * Usage:
 *   <SubscriptionWall>
 *     <YourToolComponent />
 *   </SubscriptionWall>
 */
const SubscriptionWall = ({ children }) => {
    const navigate = useNavigate();
    const { isAuthenticated, hasActiveSubscription, isTrialActive, loading } = useAuth();

    console.log('SubscriptionWall State:', { isAuthenticated, hasActiveSubscription, isTrialActive, loading });

    // Handle loading state to prevent flash of content or white screen
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // If not authenticated, redirect to signup
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <Card className="max-w-md w-full p-8 text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Sign In Required
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Please sign in to access this tool.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <Button onClick={() => navigate('/login')} variant="outline">
                            Log In
                        </Button>
                        <Button onClick={() => navigate('/signup')}>
                            Sign Up Free
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    // If authenticated but no active subscription/trial, show upgrade wall WITH background blur
    if (!hasActiveSubscription && !isTrialActive) {
        return (
            <div className="relative min-h-screen w-full">
                {/* Background Content (Blurred) */}
                <div className="filter blur-sm pointer-events-none select-none opacity-50 h-full w-full overflow-hidden">
                    {children}
                </div>

                {/* Overlay - Using fixed to ensure it covers the viewport */}
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] px-4">
                    <Card className="max-w-lg w-full p-8 text-center shadow-2xl relative bg-white/95 backdrop-blur">
                        <div className="w-20 h-20 bg-transparent rounded-full flex items-center justify-center mx-auto mb-4">
                            <img
                                src="/ninjasface.png"
                                alt="Ninja Pro"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">
                            Get Ninja Pro to use this tool
                        </h2>
                        <p className="text-lg text-gray-600 mb-6">
                            Get unlimited access to all AI-powered job search tools with a 2 weeks free trial.
                        </p>

                        {/* Feature highlights */}
                        <div className="bg-gray-50/80 rounded-lg p-6 mb-6 text-left border border-gray-100">
                            <h3 className="font-semibold text-gray-900 mb-3">What you'll get:</h3>
                            <ul className="space-y-2 text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 mt-1">✓</span>
                                    <span>Unlimited AI-powered job applications</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 mt-1">✓</span>
                                    <span>Auto-fill Chrome extension</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 mt-1">✓</span>
                                    <span>AI Interview Prep</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 mt-1">✓</span>
                                    <span>Tailored resume + cover letter for each job</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 mt-1">✓</span>
                                    <span>24/7 Job Board with match scores</span>
                                </li>
                            </ul>
                        </div>

                        <Button
                            size="lg"
                            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
                            onClick={() => navigate('/pricing')}
                        >
                            View Pricing & Plans <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>

                    </Card>
                </div>
            </div>
        );
    }

    // User has active subscription or trial - render the tool
    return <>{children}</>;
};

export default SubscriptionWall;
