import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { X, Zap } from 'lucide-react';

const UpgradeModal = ({ tier, limit, resetDate, onClose }) => {
    const navigate = useNavigate();

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] px-4">
            <Card className="max-w-md w-full p-6 relative shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Zap className="w-8 h-8 text-orange-500" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Resume Limit Reached</h2>

                    {tier === 'free' ? (
                        <p className="text-gray-600">
                            You've used all {limit} free resumes. Upgrade to a paid plan to keep generating tailored resumes!
                        </p>
                    ) : (
                        <>
                            <p className="text-gray-600 mb-2">
                                You've reached your {limit} resume limit for this billing cycle.
                            </p>
                            {resetDate && (
                                <p className="text-sm text-gray-500">
                                    Resets on: {new Date(resetDate).toLocaleDateString()}
                                </p>
                            )}
                        </>
                    )}
                </div>

                <div className="space-y-4 mb-6">
                    <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                        <h3 className="font-bold text-green-900 mb-2">
                            {tier === 'free' ? 'Unlock AI Ninja Beginner' : 'Unlock AI Ninja Pro'}
                        </h3>
                        <ul className="text-sm text-green-800 space-y-2">
                            <li className="flex items-start gap-2">
                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                                <span>{tier === 'free' ? '200 resumes per month' : 'Unlimited resumes per month'}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                                <span>Voice AI Interview practice</span>
                            </li>
                            {tier === 'beginner' && (
                                <li className="flex items-start gap-2">
                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                                    <span>AI Video Call Interview Prep</span>
                                </li>
                            )}
                        </ul>
                    </div>
                </div>

                <Button
                    className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-green-200 transition-all border-none"
                    onClick={() => {
                        onClose();
                        navigate('/pricing');
                    }}
                >
                    Upgrade Now
                </Button>

                <p className="text-center mt-4 text-sm text-gray-400">
                    Cancel anytime. 100% money back guarantee.
                </p>
            </Card>
        </div>
    );
};

export default UpgradeModal;
