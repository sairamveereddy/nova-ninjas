import React from 'react';
import { CheckCircle, Sparkles, Zap } from 'lucide-react';

const AuthSidebar = () => {
    const freeTools = [
        'Networking Message Templates',
        'Interview Answer Framework',
        'Reference Check Prep',
        'Salary Negotiation Script',
        'LinkedIn Headline Optimizer',
        'Career Gap Explainer',
        'Job Description Decoder',
        'Offer Comparison Calculator'
    ];

    const paidFeatures = [
        'AI Resume Builder & Optimizer',
        'ATS Score Checker (90%+ Success)',
        'AI Cover Letter Generator',
        'Human Job Application Service',
        'AI Ninja - Auto Apply to 50+ Jobs',
        'Interview Prep & Question Predictor',
        'Job Application Tracker',
        '30-Day Job Search Strategy'
    ];

    return (
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-500 to-teal-600 p-12 flex-col justify-center text-white">
            <div className="max-w-md">
                <div className="mb-8">
                    <h2 className="text-4xl font-bold mb-4">
                        Let's land your dream job
                    </h2>
                    <p className="text-green-50 text-lg">
                        Join 30,000+ professionals who got hired faster.
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-12 bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                    <div>
                        <div className="text-3xl font-bold">130k+</div>
                        <div className="text-sm text-green-50">Jobs Applied</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold">43,000+</div>
                        <div className="text-sm text-green-50">Hours Saved</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold">93%</div>
                        <div className="text-sm text-green-50">Hired in 90 Days</div>
                    </div>
                </div>

                {/* Free Tools */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5" />
                        <h3 className="text-xl font-bold">Free Tools (8)</h3>
                    </div>
                    <div className="space-y-2">
                        {freeTools.map((tool, index) => (
                            <div key={index} className="flex items-start gap-2">
                                <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-green-200" />
                                <span className="text-sm text-green-50">{tool}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Paid Features */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Zap className="w-5 h-5" />
                        <h3 className="text-xl font-bold">Premium Features</h3>
                    </div>
                    <div className="space-y-2">
                        {paidFeatures.slice(0, 5).map((feature, index) => (
                            <div key={index} className="flex items-start gap-2">
                                <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-yellow-200" />
                                <span className="text-sm text-green-50">{feature}</span>
                            </div>
                        ))}
                        <div className="text-sm text-green-100 italic mt-2">
                            + 3 more premium features
                        </div>
                    </div>
                </div>

                {/* Testimonial */}
                <div className="mt-12 bg-white/10 backdrop-blur-sm rounded-xl p-6">
                    <p className="text-green-50 italic mb-4">
                        "I signed my dream offer in just 3 weeks. Scale.jobs' assistant sent 50 targeted applications daily on my behalf—it was a game changer."
                    </p>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                            AS
                        </div>
                        <div>
                            <div className="font-semibold">Aubrey Smith</div>
                            <div className="text-sm text-green-100">Software Engineer @ PayPal</div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex items-center gap-1 text-sm text-green-100">
                    <span>⭐⭐⭐⭐⭐</span>
                    <span className="ml-2">4.8 on Trustpilot</span>
                </div>
            </div>
        </div>
    );
};

export default AuthSidebar;
