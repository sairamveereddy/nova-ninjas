import React from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useNavigate } from 'react-router-dom';
import {
    MapPin,
    Clock,
    Briefcase,
    DollarSign,
    Calendar,
    Zap,
    MessageSquare,
    CheckCircle2,
    Building2
} from 'lucide-react';

const MatchScore = ({ score }) => {
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    let color = '#ef4444'; // red
    if (score >= 70) color = '#eab308'; // yellow
    if (score >= 85) color = '#10b981'; // green

    return (
        <div className="flex flex-col items-center justify-center">
            <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="32"
                        cy="32"
                        r={radius}
                        stroke="#e5e7eb"
                        strokeWidth="4"
                        fill="transparent"
                    />
                    <circle
                        cx="32"
                        cy="32"
                        r={radius}
                        stroke={color}
                        strokeWidth="4"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                    />
                </svg>
                <span className="absolute text-lg font-bold" style={{ color }}>{score}%</span>
            </div>
            <span className="text-[10px] font-bold mt-1 uppercase tracking-wider text-gray-500">
                {score >= 85 ? 'Strong Match' : score >= 70 ? 'Good Match' : 'Fair Match'}
            </span>
        </div>
    );
};

const JobCardOrion = ({ job, onAskNova }) => {
    const navigate = useNavigate();

    // Parse date for "posted x hours ago"
    const getTimeAgo = (dateString) => {
        if (!dateString) return 'Recently';
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
        return `${Math.floor(diffInHours / 24)} day${Math.floor(diffInHours / 24) !== 1 ? 's' : ''} ago`;
    };

    const handleApply = (e) => {
        e.stopPropagation();
        navigate('/ai-apply', {
            state: {
                jobId: job.id,
                jobTitle: job.title,
                company: job.company
            }
        });
    };

    const handleAskNova = (e) => {
        e.stopPropagation();
        if (onAskNova) {
            onAskNova(job);
        } else {
            // Open Nova chat with context (fallback)
            navigate('/ai-ninja', {
                state: {
                    initialMessage: `Tell me about the ${job.title} role at ${job.company}. Is it a good fit for me?`,
                    jobContext: job
                }
            });
        }
    };

    return (
        <Card className="p-6 hover:shadow-lg transition-shadow border-l-4 border-l-transparent hover:border-l-primary cursor-pointer group" onClick={() => navigate(`/ai-ninja/jobs/${job.id}`)}>
            <div className="flex flex-col md:flex-row gap-6">

                {/* Left: Company Logo & Info */}
                <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xl">
                                {job.company.charAt(0)}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-lg text-gray-900 group-hover:text-primary transition-colors">
                                        {job.title}
                                    </h3>
                                    {job.isNew && (
                                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-[10px] h-5">
                                            New
                                        </Badge>
                                    )}
                                </div>
                                <div className="text-sm text-gray-600 flex items-center gap-2">
                                    <span className="font-medium">{job.company}</span>
                                    <span>•</span>
                                    <span className="text-gray-500">{getTimeAgo(job.createdAt)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Match Score (shown only on small screens) */}
                        <div className="md:hidden">
                            <MatchScore score={job.matchScore || 0} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-4 mb-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {job.location}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {job.type ? job.type.charAt(0).toUpperCase() + job.type.slice(1) : 'Full-time'}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Briefcase className="w-4 h-4 text-gray-400" />
                            {job.level || 'Mid-Senior Level'}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4 text-gray-400" />
                            {job.salaryRange || 'Competitive'}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                        {job.visaTags && job.visaTags.includes('visa-sponsoring') && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> H1B Sponsor Likely
                            </Badge>
                        )}
                        {job.categoryTags && job.categoryTags.slice(0, 3).map((tag, i) => (
                            <Badge key={i} variant="secondary" className="bg-gray-100 text-gray-600 font-normal">
                                {tag}
                            </Badge>
                        ))}
                    </div>
                </div>

                {/* Right: Actions & Score */}
                <div className="flex flex-col items-center gap-4 min-w-[180px] border-l border-gray-100 pl-6 md:flex">
                    <div className="hidden md:block">
                        <MatchScore score={job.matchScore || 0} />
                    </div>

                    <div className="flex flex-col w-full gap-2 mt-auto">
                        <Button
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-sm"
                            onClick={handleApply}
                        >
                            <Zap className="w-4 h-4 mr-2 fill-current" />
                            Apply with Autofill
                        </Button>

                        <Button
                            variant="outline"
                            className="w-full border-gray-300 hover:bg-gray-50 text-gray-700"
                            onClick={handleAskNova}
                        >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Ask Nova
                        </Button>
                    </div>
                </div>

            </div>
        </Card>
    );
};

export default JobCardOrion;
