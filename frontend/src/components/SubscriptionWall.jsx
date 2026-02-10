import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';

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
    const { isAuthenticated, user, hasActiveSubscription, isTrialActive } = useAuth();

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

    // If authenticated but no active subscription/trial, show upgrade wall
    if (!hasActiveSubscription && !isTrialActive) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <Card className="max-w-2xl w-full p-8 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        Upgrade to Access This Tool
                    </h2>
                    <p className="text-lg text-gray-600 mb-6">
                        Get unlimited access to all AI-powered job search tools with a 2 weeks free trial.
                    </p>

                    {/* Feature highlights */}
                    <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
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
                        className="w-full sm:w-auto"
                        onClick={() => navigate('/pricing')}
                    >
                        Start 2 Weeks Free Trial <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>

                    <p className="text-sm text-gray-500 mt-4">
                        No credit card required • Cancel anytime
                    </p>
                </Card>
            </div>
        );
    }

    // User has active subscription or trial - render the tool
    return <>{children}</>;
};

export default SubscriptionWall;
