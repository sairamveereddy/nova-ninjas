import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import SideMenu from './SideMenu';
import './SideMenu.css';
import {
    MapPin,
    DollarSign,
    Globe,
    Clock,
    Menu,
    Loader2,
    Users,
    Linkedin,
    TrendingUp,
    Newspaper,
    Check,
    Briefcase,
    Building2,
    Calendar,
    ArrowLeft,
    Sparkles,
    MessageSquare,
    ExternalLink
} from 'lucide-react';
import { BRAND } from '../config/branding';
import { API_URL } from '../config/api';

const MatchRing = ({ percentage, label, color }) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="32" cy="32" r={radius} stroke="#e5e7eb" strokeWidth="4" fill="transparent" className="scale-75 origin-center" />
                    <circle cx="32" cy="32" r={radius} stroke={color} strokeWidth="4" fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className="scale-75 origin-center transition-all duration-1000 ease-out" />
                </svg>
                <span className="absolute text-sm font-bold text-gray-700">{percentage}%</span>
            </div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase mt-1">{label}</div>
        </div>
    );
};

const JobDetailsOrion = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAuthenticated } = useAuth();
    const [sideMenuOpen, setSideMenuOpen] = useState(false);
    const [job, setJob] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch job from API
    useEffect(() => {
        const fetchJob = async () => {
            setIsLoading(true);
            try {
                const token = localStorage.getItem('auth_token');
                const headers = token ? { 'token': token } : {};

                const response = await fetch(`${API_URL}/api/jobs/${id}`, { headers });
                if (!response.ok) throw new Error('Job not found');

                const data = await response.json();
                const jobData = data.job || data;

                if (jobData && (jobData.id || jobData._id || jobData.externalId)) {
                    // Normalize data
                    setJob({
                        ...jobData,
                        id: jobData.id || jobData._id || jobData.externalId,
                        salaryRange: jobData.salaryRange && jobData.salaryRange !== '0' ? jobData.salaryRange : 'Competitive',
                        postedDate: jobData.createdAt ? new Date(jobData.createdAt).toLocaleDateString() : 'Recently',
                        logo: jobData.companyLogo || jobData.logo,
                        // inferred fields for UI if missing
                        rating: jobData.rating || (4.0 + Math.random()).toFixed(1),
                        reviewCount: jobData.reviewCount || Math.floor(Math.random() * 500) + 50,
                        employees: jobData.companyData?.employees || "1000-5000",
                        founded: jobData.companyData?.founded || "2006",

                        // Mock Match Breakdown (derive from total score)
                        matchBreakdown: {
                            exp: Math.min(100, (jobData.matchScore || 70) + Math.floor(Math.random() * 10)),
                            skill: (jobData.matchScore || 70),
                            industry: Math.max(40, (jobData.matchScore || 70) - Math.floor(Math.random() * 15))
                        }
                    });
                } else {
                    setError('Job not found');
                }
            } catch (err) {
                console.error('Error fetching job:', err);
                setError('Job not found');
            } finally {
                setIsLoading(false);
            }
        };

        if (id) fetchJob();
    }, [id]);

    const renderListSection = (title, content, icon = Check) => {
        if (!content || typeof content !== 'string') return null;
        // Split by newlines or bullets
        const items = content.split(/\n+/).filter(item => item && item.trim().length > 0);

        if (items.length === 0) return null;

        return (
            <Card className="p-6 mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
                <ul className="space-y-3">
                    {items.map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                            <div className="mt-1 min-w-5">
                                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                                    <Check className="w-3 h-3 text-green-600" />
                                </div>
                            </div>
                            <span className="text-gray-700 text-sm leading-relaxed">{item.replace(/^[•\-\*]\s*/, '')}</span>
                        </li>
                    ))}
                </ul>
            </Card>
        );
    };

    const formatJobDescription = (text) => {
        if (!text) return '';

        // 0. CHECK FOR HTML: If text contains HTML tags like <p>, <ul>, <li>, assume it is pre-formatted/sanitized
        if (/<[a-z][\s\S]*>/i.test(text)) {
            // It has HTML tags, return as is (backend sanitizes it)
            return text;
        }

        // Improve formatting for "wall of text" descriptions (Plain Text Fallback)
        let formatted = text;

        // 1. Detect and format common headers if they are stuck in the text
        // Looks for "Header:" or specific keywords followed by text
        const headers = [
            "About the Role", "About the Job", "About Us", "About [A-Za-z]+",
            "Summary", "What You Will Do", "Responsibilities", "Key Responsibilities",
            "Requirements", "Qualifications", "Minimum Qualifications", "Preferred Qualifications",
            "Benefits", "Compensation", "What We Offer", "How You Will Contribute", "Who You Are"
        ];

        headers.forEach(header => {
            const regex = new RegExp(`(${header}[:\\?]?)`, 'gi');
            // Add double break before and bold the header
            formatted = formatted.replace(regex, '<br/><br/><strong class="text-gray-900 block mb-2">$1</strong>');
        });

        // 2. Handle bullet points that might be copy-pasted as "•" or "-" without newlines
        formatted = formatted.replace(/([•\-])\s/g, '<br/>$1 ');

        // 3. Ensure newlines from source are respected (if any exist)
        formatted = formatted.replace(/\n/g, '<br/>');

        // 4. Cleanup excessive breaks
        formatted = formatted.replace(/(<br\/>){3,}/g, '<br/><br/>');

        return formatted;
    };

    if (isLoading) return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
    );

    if (error || !job) return (
        <div className="container py-12 text-center">
            <h1>Job Not Found</h1>
            <Button onClick={() => navigate('/jobs')} className="mt-4">Back to Jobs</Button>
        </div>
    );

    return (
        <div className="job-detail-page bg-[#F3F4F6] min-h-screen font-sans">
            <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />

            {/* Navigation */}
            <header className="bg-white border-b sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => setSideMenuOpen(true)}>
                            <Menu className="w-5 h-5" />
                        </Button>
                        <img src={BRAND.logoPath} alt="Logo" className="h-8 cursor-pointer" onClick={() => navigate('/')} />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => navigate('/jobs')}>Jobs</Button>
                        <Button variant="ghost" onClick={() => navigate('/dashboard')}>Dashboard</Button>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-6 max-w-6xl">
                <Button variant="ghost" onClick={() => navigate('/jobs')} className="mb-4 text-gray-500 hover:text-gray-900 pl-0">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Jobs
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Job Info */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* 1. Header Card (New Design) */}
                        <Card className="p-6 border-none shadow-sm">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex gap-4">
                                    {job.logo && (
                                        <div className="w-16 h-16 rounded-lg border border-gray-100 p-2 flex items-center justify-center bg-white shadow-sm">
                                            <img src={job.logo} alt="logo" className="w-full h-full object-contain" />
                                        </div>
                                    )}
                                    <div>
                                        <h1 className="text-2xl font-bold text-gray-900 leading-tight">{job.title}</h1>
                                        <div className="text-gray-500 font-medium mt-1">{job.company}</div>
                                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                                            <span>{job.postedDate}</span>
                                            <span>•</span>
                                            {(job.visaTags || []).length > 0 && <span className="text-green-600 font-medium">Visa Sponsor Likely</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-gray-900">{job.salaryRange}</div>
                                    <Badge variant="secondary" className="mt-1 bg-blue-50 text-blue-700 hover:bg-blue-100">
                                        {job.type}
                                    </Badge>
                                </div>
                            </div>

                            <hr className="border-gray-100 my-6" />

                            {/* Match Breakdown */}
                            <div className="flex justify-between items-center">
                                <div className="flex gap-8">
                                    <MatchRing percentage={job.matchBreakdown?.exp || 75} label="Exp. Level" color="#3b82f6" />
                                    <MatchRing percentage={job.matchBreakdown?.skill || 80} label="Skill" color="#10b981" />
                                    <MatchRing percentage={job.matchBreakdown?.industry || 60} label="Industry" color="#f59e0b" />
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-gray-900">{job.matchScore}%</div>
                                    <div className="text-xs font-bold text-green-600 uppercase tracking-wide">Good Match</div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 mt-8">
                                <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-12 text-lg rounded-xl shadow-sm"
                                    onClick={() => navigate('/ai-apply', {
                                        state: {
                                            jobId: job.id,
                                            jobTitle: job.title,
                                            company: job.company,
                                            jobDescription: job.fullDescription || job.description
                                        }
                                    })}>
                                    <Sparkles className="w-5 h-5 mr-2" /> Apply with Autofill
                                </Button>
                                <Button variant="outline" className="flex-1 h-12 text-lg border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700"
                                    onClick={() => navigate('/ai-ninja', { state: { initialMessage: `Tell me about ${job.title} at ${job.company}`, jobContext: job } })}>
                                    <MessageSquare className="w-5 h-5 mr-2" /> Ask Nova
                                </Button>
                            </div>
                        </Card>

                        {/* 2. Responsibilities (Parsed or Fallback) */}
                        {renderListSection("Responsibilities", job.responsibilities)}

                        {/* 3. Qualifications (Parsed or Fallback) */}
                        {renderListSection("Qualifications", job.qualifications)}

                        {/* 4. Full Description (Fallback / Context) */}
                        {(!job.responsibilities && !job.qualifications) && (
                            <Card className="p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">About the Role</h3>
                                <div className="prose max-w-none text-gray-700 text-sm leading-relaxed whitespace-pre-line"
                                    dangerouslySetInnerHTML={{ __html: formatJobDescription(job.fullDescription || job.description) }}
                                />
                            </Card>
                        )}

                        {/* 5. Benefits */}
                        {job.benefits && typeof job.benefits === 'string' && (
                            <Card className="p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Benefits</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {job.benefits.split(/\n+/).slice(0, 9).map((benefit, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm text-gray-600 p-2 bg-gray-50 rounded-lg">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                            <span className="truncate">{benefit.replace(/^[•\-\*]\s*/, '')}</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* Right Column: Company & Sidebar */}
                    <div className="space-y-6">

                        {/* Company Card (Crunchbase Style) */}
                        <Card className="p-6 border-none shadow-sm bg-white">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                                    {job.logo ? <img src={job.logo} className="w-full h-full object-contain" /> : <Building2 className="w-6 h-6 text-gray-400" />}
                                </div>
                                <div>
                                    <div className="font-bold text-gray-900">{job.company}</div>
                                    <div className="flex text-xs text-amber-500 items-center">
                                        <span className="font-bold mr-1">{job.rating}</span>
                                        {[1, 2, 3, 4, 5].map(i => <div key={i} className={`w-2 h-2 rounded-full mx-px ${i <= Math.floor(job.rating) ? 'bg-amber-400' : 'bg-gray-200'}`} />)}
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                                {job.company} is a leading company in the {(job.categoryTags || [])[1] || 'technology'} space.
                            </p>

                            <div className="space-y-3 pt-4 border-t border-gray-100">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 flex items-center gap-2"><Calendar className="w-4 h-4" /> Founded</span>
                                    <span className="font-medium text-gray-900">{job.founded}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 flex items-center gap-2"><MapPin className="w-4 h-4" /> HQ</span>
                                    <span className="font-medium text-gray-900 truncate max-w-[120px]">{job.location ? job.location.split(',')[0] : "USA"}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 flex items-center gap-2"><Users className="w-4 h-4" /> Employees</span>
                                    <span className="font-medium text-gray-900">{job.employees}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 flex items-center gap-2"><Globe className="w-4 h-4" /> Website</span>
                                    <a href="#" className="font-medium text-blue-600 hover:underline">Visit Site</a>
                                </div>
                            </div>

                            {/* Funding Section */}
                            {job.companyData?.stage && (
                                <div className="mt-6 pt-6 border-t border-gray-100">
                                    <h4 className="font-bold text-gray-900 text-sm mb-3">Funding</h4>
                                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg">
                                        <div>
                                            <div className="text-[10px] text-gray-500 uppercase">Stage</div>
                                            <div className="font-bold text-sm text-gray-800">{job.companyData.stage}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-gray-500 uppercase">Total</div>
                                            <div className="font-bold text-sm text-green-600">{job.companyData.totalFunding}</div>
                                        </div>
                                    </div>
                                    {job.companyData.investors?.length > 0 && (
                                        <div className="mt-3">
                                            <div className="text-[10px] text-gray-500 uppercase mb-2">Key Investors</div>
                                            <div className="flex flex-wrap gap-1">
                                                {job.companyData.investors.map((inv, i) => (
                                                    <Badge key={i} variant="outline" className="text-[10px] font-normal bg-white text-gray-600 border-gray-200">{inv}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                        </Card>

                        {/* Insider Connections */}
                        <Card className="p-6 border-none shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="w-5 h-5 text-blue-600" />
                                <h3 className="font-bold text-gray-900 text-sm">Insider Connections</h3>
                            </div>

                            {(job.insiderConnections || []).length > 0 ? (
                                <div className="space-y-4">
                                    {(job.insiderConnections || []).slice(0, 3).map((conn, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                                                {conn.name[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium truncate">{conn.name}</div>
                                                <div className="text-xs text-gray-500 truncate">{conn.role}</div>
                                            </div>
                                            <Linkedin className="w-4 h-4 text-blue-600 cursor-pointer" />
                                        </div>
                                    ))}
                                    <Button variant="outline" size="sm" className="w-full text-blue-600 border-blue-100 hover:bg-blue-50 mt-2">
                                        View All Connections
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center py-2">
                                    <p className="text-xs text-gray-500 mb-3">No direct connections found.</p>
                                    <Button variant="outline" size="sm" className="w-full text-[#0077b5] border-[#0077b5] hover:bg-blue-50"
                                        onClick={() => window.open(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(job.company)}`, '_blank')}>
                                        <Linkedin className="w-3 h-3 mr-2" /> Find on LinkedIn
                                    </Button>
                                </div>
                            )}
                        </Card>

                        {/* News Widget */}
                        {job.companyData?.news && (
                            <Card className="p-6 border-none shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <Newspaper className="w-4 h-4 text-gray-500" />
                                    <h3 className="font-bold text-gray-900 text-sm">Recent News</h3>
                                </div>
                                <div className="space-y-4">
                                    {job.companyData.news.slice(0, 2).map((news, i) => (
                                        <div key={i}>
                                            <a href="#" className="text-sm font-medium text-gray-900 hover:underline line-clamp-2">{news.title}</a>
                                            <div className="text-xs text-gray-400 mt-1">{news.source} • {news.date}</div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default JobDetailsOrion;
