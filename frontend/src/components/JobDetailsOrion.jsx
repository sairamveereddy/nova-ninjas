import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import SideMenu from './SideMenu';
import './SideMenu.css';
import {
    Bot,
    UserCheck,
    MapPin,
    DollarSign,
    Globe,
    Home,
    Building2,
    Briefcase,
    ExternalLink,
    ArrowLeft,
    Sparkles,
    FileText,
    MessageSquare,
    Clock,
    Menu,
    Loader2,
    Users,
    Linkedin,
    TrendingUp,
    Newspaper,
    CheckCircle2
} from 'lucide-react';
import { BRAND } from '../config/branding';
import { API_URL } from '../config/api';

const JobDetailsOrion = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAuthenticated, loading: authLoading } = useAuth();
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
                    setJob({
                        id: jobData.id || jobData._id || jobData.externalId,
                        title: jobData.title,
                        company: jobData.company,
                        location: jobData.location,
                        salaryRange: jobData.salaryRange || 'Competitive',
                        description: jobData.description,
                        fullDescription: jobData.fullDescription || jobData.description,
                        type: jobData.type || 'onsite',
                        visaTags: jobData.visaTags || [],
                        matchScore: jobData.matchScore || 0,
                        companyData: jobData.companyData || {},
                        insiderConnections: jobData.insiderConnections || [],
                        sourceUrl: jobData.sourceUrl,
                        postedDate: jobData.createdAt ? new Date(jobData.createdAt).toLocaleDateString() : 'Recently'
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

    const getMatchLevel = (score) => {
        if (score >= 85) return { label: 'Strong Match', color: '#10b981', textColor: 'text-emerald-600' };
        if (score >= 70) return { label: 'Good Match', color: '#eab308', textColor: 'text-yellow-600' };
        if (score >= 50) return { label: 'Fair Match', color: '#f97316', textColor: 'text-orange-600' };
        return { label: 'Poor Match', color: '#ef4444', textColor: 'text-red-600' };
    };

    const formatJobDescription = (text) => {
        if (!text) return '';

        // Improve formatting for "wall of text" descriptions
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

    const matchLevel = getMatchLevel(job.matchScore);

    return (
        <div className="job-detail-page bg-gray-50 min-h-screen">
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

            <div className="container mx-auto px-4 py-8">
                <Button variant="ghost" onClick={() => navigate('/jobs')} className="mb-4 text-gray-500 hover:text-gray-900">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Jobs
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Job Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Header Card */}
                        <Card className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
                                    <div className="text-lg text-gray-600 mt-1">{job.company}</div>
                                    <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
                                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {job.location}</span>
                                        <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" /> {job.salaryRange}</span>
                                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Posted {job.postedDate}</span>
                                    </div>
                                </div>
                                {/* Match Score */}
                                <div className="text-center">
                                    <div className="relative w-20 h-20 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle cx="40" cy="40" r="36" stroke="#e5e7eb" strokeWidth="6" fill="transparent" />
                                            <circle cx="40" cy="40" r="36" stroke={matchLevel.color} strokeWidth="6" fill="transparent"
                                                strokeDasharray={2 * Math.PI * 36}
                                                strokeDashoffset={2 * Math.PI * 36 * (1 - (job.matchScore / 100))}
                                                strokeLinecap="round" />
                                        </svg>
                                        <span className={`absolute text-xl font-bold ${matchLevel.textColor}`}>{job.matchScore}%</span>
                                    </div>
                                    <div className={`text-xs font-bold ${matchLevel.textColor} uppercase tracking-wide mt-1`}>{matchLevel.label}</div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mt-6">
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer">
                                    {job.type}
                                </Badge>
                                {job.visaTags.map((tag, i) => (
                                    <Badge key={i} variant="outline" className="border-green-200 text-green-700 bg-green-50">
                                        <Globe className="w-3 h-3 mr-1" /> {tag}
                                    </Badge>
                                ))}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 mt-6">
                                <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-12 text-lg"
                                    onClick={() => navigate('/ai-apply', { state: { jobId: job.id, jobTitle: job.title, company: job.company } })}>
                                    <Sparkles className="w-5 h-5 mr-2" /> Apply with Autofill
                                </Button>
                                <Button variant="outline" className="flex-1 h-12 text-lg border-gray-300"
                                    onClick={() => navigate('/ai-ninja', { state: { initialMessage: `Tell me about ${job.title} at ${job.company}`, jobContext: job } })}>
                                    <MessageSquare className="w-5 h-5 mr-2" /> Ask Nova
                                </Button>
                            </div>
                        </Card>

                        {/* Job Description */}
                        <Card className="p-6">
                            <h2 className="text-xl font-bold mb-4">About the Role</h2>
                            <div className="prose max-w-none text-gray-700 leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: formatJobDescription(job.fullDescription) }}
                            />
                        </Card>
                    </div>

                    {/* Right Column: Insights & Connections */}
                    <div className="space-y-6">

                        {/* Insider Connections Widget */}
                        <Card className="p-6 border-blue-100 bg-blue-50">
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="w-5 h-5 text-blue-600" />
                                <h3 className="font-bold text-gray-900">Insider Connections</h3>
                            </div>

                            {job.insiderConnections && job.insiderConnections.length > 0 ? (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-600">
                                        You have <strong>{job.insiderConnections.length} potential connections</strong> at {job.company}.
                                    </p>
                                    <div className="space-y-3">
                                        {job.insiderConnections.map((conn, i) => (
                                            <div key={i} className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm">
                                                <img src={conn.avatar} alt={conn.name} className="w-10 h-10 rounded-full bg-gray-200" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-sm truncate">{conn.name}</div>
                                                    <div className="text-xs text-gray-500 truncate">{conn.role}</div>
                                                </div>
                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                                    <Linkedin className="w-4 h-4 text-[#0077b5]" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <Button variant="outline" className="w-full text-blue-600 border-blue-200 hover:bg-blue-100">
                                        View All Connections
                                    </Button>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 italic">No direct connections found. Try reaching out to recruiters directly!</p>
                            )}
                        </Card>

                        {/* Company Insights */}
                        <Card className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp className="w-5 h-5 text-gray-700" />
                                <h3 className="font-bold text-gray-900">Company Insights</h3>
                            </div>

                            {job.companyData?.stage && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-xs text-gray-500 uppercase">Stage</div>
                                            <div className="font-medium">{job.companyData.stage}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-500 uppercase">Total Funding</div>
                                            <div className="font-medium text-green-600">{job.companyData.totalFunding}</div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-gray-500 uppercase mb-2">Key Investors</div>
                                        <div className="flex flex-wrap gap-2">
                                            {job.companyData.investors?.map((inv, i) => (
                                                <Badge key={i} variant="secondary" className="bg-gray-100 font-normal">{inv}</Badge>
                                            ))}
                                        </div>
                                    </div>

                                    {job.companyData.news && (
                                        <div className="pt-4 border-t">
                                            <div className="text-xs text-gray-500 uppercase mb-2 flex items-center gap-1">
                                                <Newspaper className="w-3 h-3" /> Recent News
                                            </div>
                                            <ul className="space-y-3">
                                                {job.companyData.news.map((news, i) => (
                                                    <li key={i} className="text-sm">
                                                        <a href="#" className="font-medium hover:underline block truncate">{news.title}</a>
                                                        <div className="text-xs text-gray-400">{news.source} • {news.date}</div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default JobDetailsOrion;
