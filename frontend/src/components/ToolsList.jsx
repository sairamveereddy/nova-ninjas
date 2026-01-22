import React from 'react';
import { CheckCircle, Sparkles, Zap } from 'lucide-react';

const ToolsList = ({ type = 'free' }) => {
    const freeTools = [
        'Networking Templates',
        'Interview Framework',
        'Reference Check Prep',
        'Salary Negotiator',
        'LinkedIn Optimizer',
        'Career Gap Explainer',
        'Job Decoder',
        'Offer Comparator'
    ];

    const paidTools = [
        'AI Resume Builder',
        'ATS Score Checker',
        'AI Cover Letter',
        'Human Job Service',
        'AI Auto Apply',
        'Interview Prep AI',
        'Job Tracker',
        'Strategy Planner'
    ];

    const tools = type === 'free' ? freeTools : paidTools;
    const icon = type === 'free' ? <Sparkles className="w-4 h-4" /> : <Zap className="w-4 h-4" />;
    const title = type === 'free' ? 'Free Tools' : 'Paid Tools';
    const iconColor = type === 'free' ? 'text-green-600' : 'text-yellow-600';

    return (
        <div className="hidden lg:block">
            <div className="flex items-center gap-2 mb-3">
                <div className={iconColor}>{icon}</div>
                <h3 className="text-sm font-bold text-gray-700">{title}</h3>
            </div>
            <div className="space-y-1.5">
                {tools.map((tool, index) => (
                    <div key={index} className="flex items-start gap-1.5">
                        <CheckCircle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${iconColor}`} />
                        <span className="text-xs text-gray-600">{tool}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ToolsList;
