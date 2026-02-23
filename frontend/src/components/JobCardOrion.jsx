import React from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useAINinja } from '../contexts/AINinjaContext';
import { Card } from './ui/card';
import { useNavigate } from 'react-router-dom';
import './JobCardOrion.css';
import {
    MapPin,
    Clock,
    Briefcase,
    DollarSign,
    Calendar,
    Zap,
    MessageSquare,
    CheckCircle2,
    Building2,
    ExternalLink
} from 'lucide-react';

const MatchScore = ({ score, size = 'default' }) => {
    const isSmall = size === 'small';
    const radius = isSmall ? 18 : 24;
    const svgSize = isSmall ? 44 : 64;
    const center = svgSize / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    let color = '#94a3b8'; // gray-400 for low match
    if (score >= 40) color = '#f97316'; // orange-500 for fair match
    if (score >= 70) color = '#0ea5e9'; // sky-500 for good match
    if (score >= 90) color = '#10b981'; // emerald-500 for strong match

    const label = score >= 90 ? 'Strong Match' : score >= 70 ? 'Good Match' : score >= 40 ? 'Fair Match' : 'Low Match';

    return (
        <div className="flex flex-col items-center justify-center flex-shrink-0">
            <div className="relative flex items-center justify-center"
                style={{ width: svgSize, height: svgSize }}>
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx={center} cy={center} r={radius}
                        stroke="#e5e7eb" strokeWidth={isSmall ? 3 : 4} fill="transparent" />
                    <circle cx={center} cy={center} r={radius}
                        stroke={color} strokeWidth={isSmall ? 3 : 4} fill="transparent"
                        strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round" />
                </svg>
                <span className={`absolute font-bold ${isSmall ? 'text-xs' : 'text-base'}`}
                    style={{ color }}>{score}%</span>
            </div>
            <span className={`font-bold uppercase tracking-wider text-gray-500 text-center leading-tight ${isSmall ? 'text-[8px] mt-0.5' : 'text-[10px] mt-1'}`}>
                {label}
            </span>
        </div>
    );
};

const JobCardOrion = ({ job, onAskNova }) => {
    const navigate = useNavigate();
    const { openChatWithJob } = useAINinja();

    const getTimeAgo = (dateString) => {
        if (!dateString) return 'Recently';
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours}h ago`;
        const days = Math.floor(diffInHours / 24);
        if (days < 7) return `${days}d ago`;
        return `${Math.floor(days / 7)}w ago`;
    };

    const handleApply = (e) => {
        e.stopPropagation();
        const urlToOpen = job.sourceUrl || job.url || job.redirect_url;
        if (urlToOpen) {
            window.open(urlToOpen, '_blank');
        } else {
            alert("Source URL not available for this job.");
        }
    };

    const handleAskNova = (e) => {
        e.stopPropagation();
        openChatWithJob(job);
    };

    const workType = job.type ? job.type.charAt(0).toUpperCase() + job.type.slice(1) : 'Full-time';

    return (
        <Card
            className="jobcard-orion hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => navigate(`/ai-ninja/jobs/${job.id}`)}
        >
            {/* ── HEADER: Logo + Title + Match Score ── */}
            <div className="jobcard-header">
                <div className="jobcard-logo">
                    {job.companyLogo ? (
                        <img src={job.companyLogo} alt={job.company}
                            className="w-full h-full object-contain rounded-lg" />
                    ) : (
                        <span>{String(job.company || '?').charAt(0)}</span>
                    )}
                </div>

                <div className="jobcard-title-block">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="jobcard-title group-hover:text-emerald-600 transition-colors">
                            {job.title}
                        </h3>
                        {job.isNew && (
                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-[10px] h-5 flex-shrink-0">
                                New
                            </Badge>
                        )}
                    </div>
                    <div className="jobcard-company-line">
                        <span className="font-medium">{job.company}</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-gray-400">{getTimeAgo(job.createdAt)}</span>
                    </div>
                </div>

                <div className="jobcard-score-desktop">
                    <MatchScore score={job.matchScore || 0} />
                </div>
                <div className="jobcard-score-mobile">
                    <MatchScore score={job.matchScore || 0} size="small" />
                </div>
            </div>

            {/* ── METADATA GRID ── */}
            <div className="jobcard-meta-grid">
                <div className="jobcard-meta-item">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{job.location || 'Not specified'}</span>
                </div>
                <div className="jobcard-meta-item">
                    <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>{workType}</span>
                </div>
                <div className="jobcard-meta-item">
                    <Briefcase className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>{job.level || 'Mid-Senior Level'}</span>
                </div>
                <div className="jobcard-meta-item">
                    <DollarSign className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>{job.salaryRange || 'Competitive'}</span>
                </div>
            </div>

            {/* ── TAGS ── */}
            <div className="jobcard-tags">
                {job.visaTags && job.visaTags.includes('visa-sponsoring') && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> H1B Sponsor Likely
                    </Badge>
                )}
                {job.categoryTags && job.categoryTags.slice(0, 4).map((tag, i) => (
                    <Badge key={i} variant="secondary" className="bg-gray-100 text-gray-600 font-normal text-xs">
                        {tag}
                    </Badge>
                ))}
            </div>

            {/* ── ACTION BUTTONS ── */}
            <div className="jobcard-actions">
                <Button
                    className="jobcard-btn-apply bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-sm"
                    onClick={handleApply}
                >
                    <ExternalLink className="w-4 h-4 mr-1.5" />
                    Apply Now
                </Button>
                <Button
                    variant="outline"
                    className="jobcard-btn-ask border-gray-300 hover:bg-gray-50 text-gray-700"
                    onClick={handleAskNova}
                >
                    <MessageSquare className="w-4 h-4 mr-1.5" />
                    Ask AI Ninja
                </Button>
            </div>
        </Card>
    );
};

export default JobCardOrion;
