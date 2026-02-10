import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Sparkles, Calendar, ArrowRight } from 'lucide-react';

/**
 * TrialActivationModal Component
 * 
 * Shows success message after trial activation.
 * Displays trial expiration date and next steps.
 * 
 * Props:
 *   - isOpen: boolean
 *   - onClose: function
 *   - expiresAt: Date object
 */
const TrialActivationModal = ({ isOpen, onClose, expiresAt }) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const handleGetStarted = () => {
        onClose();
        navigate('/dashboard');
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-lg w-full p-8 relative animate-in fade-in zoom-in duration-300">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Success icon */}
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="w-10 h-10 text-white" />
                </div>

                {/* Title */}
                <h2 className="text-3xl font-bold text-center text-gray-900 mb-3">
                    Welcome to JobNinjas! 🎉
                </h2>

                {/* Main message */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
                    <p className="text-xl font-semibold text-center text-gray-900 mb-2">
                        You have free access for 2 weeks
                    </p>
                    <div className="flex items-center justify-center gap-2 text-gray-600">
                        <Calendar className="w-5 h-5" />
                        <span>Expires on {formatDate(expiresAt)}</span>
                    </div>
                </div>

                {/* Payment info */}
                <p className="text-center text-gray-600 mb-6">
                    You can make the payment after 2 weeks to continue using all features.
                </p>

                {/* CTA buttons */}
                <div className="space-y-3">
                    <Button
                        size="lg"
                        className="w-full"
                        onClick={handleGetStarted}
                    >
                        Start Using Tools <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                    <Button
                        size="lg"
                        variant="outline"
                        className="w-full"
                        onClick={onClose}
                    >
                        Explore Features
                    </Button>
                </div>

                {/* Footer note */}
                <p className="text-sm text-center text-gray-500 mt-6">
                    We'll send you a reminder before your trial ends
                </p>
            </Card>
        </div>
    );
};

export default TrialActivationModal;
