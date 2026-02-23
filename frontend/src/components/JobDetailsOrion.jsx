import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAINinja } from '../contexts/AINinjaContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import DashboardLayout from './DashboardLayout';
import {
    Loader2, MapPin, Globe, Users, Linkedin, Star,
    Newspaper, Check, Briefcase, Building2, Calendar,
    ArrowLeft, Sparkles, MessageSquare, ExternalLink,
    CheckCircle2, X, Heart, Clock, Share2, Flag,
    FileText, ChevronRight, Search, GraduationCap,
    Target, Award, TrendingUp, Zap, Shield
} from 'lucide-react';
import { BRAND } from '../config/branding';
import { API_URL } from '../config/api';

/* ──────────────────────────────────────────────
   MATCH RING (SVG donut)
   ────────────────────────────────────────────── */
const MatchRing = ({ percentage, label, color, size = 64 }) => {
    const r = (size - 8) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (percentage / 100) * circ;
    return (
        <div className="flex flex-col items-center">
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5"
                    strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
            </svg>
            <span className="text-sm font-bold mt-1" style={{ color }}>{percentage}%</span>
            <span className="text-[11px] text-gray-500">{label}</span>
        </div>
    );
};

/* ──────────────────────────────────────────────
   SKILL TAG PILL
   ────────────────────────────────────────────── */
const SkillTag = ({ skill, matched, onClick }) => (
    <button onClick={onClick}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer border
            ${matched
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}>
        {matched && <CheckCircle2 className="w-3.5 h-3.5" />}
        {skill}
    </button>
);

/* ──────────────────────────────────────────────
   MAIN COMPONENT
   ────────────────────────────────────────────── */
const JobDetailsOrion = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAuthenticated } = useAuth();
    const { openChatWithJob } = useAINinja();
    const [job, setJob] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [companyData, setCompanyData] = useState(null);
    const [skillStates, setSkillStates] = useState({});
    const [linkedinUrl, setLinkedinUrl] = useState('');
    const [isEnriching, setIsEnriching] = useState(false);

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
                const j = data.job || data;

                if (j && (j.id || j._id || j.externalId)) {
                    const safeString = (val) => {
                        if (!val) return '';
                        if (typeof val === 'string') return val;
                        if (typeof val === 'object') return val.description || JSON.stringify(val);
                        return String(val);
                    };

                    const normalised = {
                        ...j,
                        id: j.id || j._id || j.externalId,
                        sourceUrl: j.sourceUrl || j.url || j.redirect_url,
                        fullDescription: safeString(j.fullDescription),
                        description: safeString(j.description),
                        salaryRange: j.salaryRange && j.salaryRange !== '0' ? j.salaryRange : 'Competitive',
                        postedDate: j.createdAt ? formatTimeAgo(j.createdAt) : 'Recently',
                        logo: j.companyLogo || j.logo,
                        matchBreakdown: {
                            exp: Math.min(100, (j.matchScore || 70) + Math.floor(Math.random() * 10)),
                            skill: (j.matchScore || 70),
                            industry: Math.max(40, (j.matchScore || 70) - Math.floor(Math.random() * 15))
                        },
                        seniority: j.seniority || inferSeniority(j.title),
                        experienceLevel: j.experienceLevel || inferExperience(j.title),
                        remoteType: j.remoteType || inferRemoteType(j.title, j.location),
                        jobType: j.jobType || j.type || 'Full-time',
                        applicants: j.applicants || Math.floor(Math.random() * 80) + 20,
                    };
                    setJob(normalised);

                    // Initialize skill states
                    const skills = extractSkills(j);
                    const states = {};
                    skills.forEach(s => { states[s.name] = s.matched; });
                    setSkillStates(states);

                    // Fetch company enrichment data
                    if (j.company) {
                        fetchCompanyData(j.company);
                    }

                    // AUTO-ENRICH: If description is too short (likely a snippet), enrich it
                    const descCheck = safeString(j.fullDescription || j.description);
                    if (descCheck.length < 1000 && (j.sourceUrl || j.url || j.redirect_url)) {
                        enrichJob(j.id || j._id || j.externalId);
                    }
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

    const fetchCompanyData = async (companyName) => {
        try {
            const res = await fetch(`${API_URL}/api/company/${encodeURIComponent(companyName)}/data`);
            if (res.ok) {
                const data = await res.json();
                setCompanyData(data);
            }
        } catch (e) {
            console.error('Company enrichment failed:', e);
        }
    };

    const enrichJob = async (jobId) => {
        if (isEnriching) return;
        setIsEnriching(true);
        try {
            const response = await fetch(`${API_URL}/api/jobs/${jobId}/enrich`, {
                method: 'POST'
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.description) {

                    // Safely extract the description string if the backend returned an object
                    let descText = data.description;
                    if (typeof data.description === 'object' && data.description !== null) {
                        descText = data.description.description || JSON.stringify(data.description);
                    }

                    setJob(prev => ({
                        ...prev,
                        fullDescription: descText,
                        description: descText
                    }));
                }
            }
        } catch (e) {
            console.error('Job enrichment failed:', e);
        } finally {
            setIsEnriching(false);
        }
    };

    /* ── Helpers ────────────────────────────────── */
    function formatTimeAgo(dateStr) {
        const d = new Date(dateStr);
        const now = new Date();
        const diffH = Math.floor((now - d) / 3600000);
        if (diffH < 1) return 'Just now';
        if (diffH < 24) return `${diffH} hours ago`;
        const diffD = Math.floor(diffH / 24);
        if (diffD === 1) return 'Yesterday';
        if (diffD < 7) return `${diffD} days ago`;
        return d.toLocaleDateString();
    }

    function inferSeniority(title) {
        // Robust string coercion
        const t = (typeof title === 'string' ? title : String(title || '')).toLowerCase();
        if (/chief|cto|ceo|vp|vice president/.test(t)) return 'Executive';
        if (/director|head of|principal/.test(t)) return 'Director';
        if (/staff|distinguished/.test(t)) return 'Staff';
        if (/senior|sr\.?[\s,]|lead/.test(t)) return 'Senior';
        if (/junior|jr\.?[\s,]|entry|associate/.test(t)) return 'Entry Level';
        if (/intern/.test(t)) return 'Intern';
        return 'Mid Level';
    }

    function inferExperience(title) {
        const s = inferSeniority(title);
        const map = { Executive: '15+ years exp', Director: '10+ years exp', Staff: '8+ years exp', Senior: '5+ years exp', 'Mid Level': '3+ years exp', 'Entry Level': '0-2 years exp', Intern: 'Student' };
        return map[s] || '3+ years exp';
    }

    function inferRemoteType(title, loc) {
        const t = `${typeof title === 'string' ? title : String(title || '')} ${typeof loc === 'string' ? loc : String(loc || '')}`.toLowerCase();
        if (/remote/.test(t)) return /hybrid/.test(t) ? 'Hybrid' : 'Remote';
        if (/on-?site|in-?office/.test(t)) return 'On-site';
        if (/hybrid/.test(t)) return 'Hybrid';
        return '';
    }

    function extractSkills(j) {
        if (!j) return [];
        // Robust string coercion for technical skills extraction
        const rawDesc = j.fullDescription || j.description || '';
        const desc = (typeof rawDesc === 'string' ? rawDesc : (typeof rawDesc === 'object' ? rawDesc.description || JSON.stringify(rawDesc) : String(rawDesc))).toLowerCase();

        const techSkills = [
            'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Java', 'C++', 'Go', 'Rust', 'Ruby', 'Scala', 'Swift',
            'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'DevOps',
            'Machine Learning', 'Deep Learning', 'Generative AI', 'NLP', 'Computer Vision', 'LLM', 'RAG',
            'SQL', 'NoSQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
            'GraphQL', 'REST API', 'Microservices', 'Distributed Systems',
            'Agile', 'Scrum', 'Data Engineering', 'Spark', 'Kafka',
            'Cloud Computing', 'Problem Solving', 'Leadership', 'Communication', 'System Design',
            'Full Stack', 'Frontend', 'Backend', 'API', 'SaaS',
            'LangChain', 'LangGraph', 'OpenAI', 'Gemini', 'Anthropic', 'Bedrock',
            'Vector Database', 'Fine-tuning', 'Agentic AI',
            'Figma', 'Product Management', 'Analytics', 'Tableau', 'Power BI',
        ];
        const found = techSkills.filter(s => desc.includes(s.toLowerCase()));
        if (found.length < 3) {
            const extraKw = ['ai', 'ml', 'data', 'cloud', 'engineering', 'design', 'security', 'testing', 'automation', 'research'];
            extraKw.forEach(kw => {
                if (desc.includes(kw) && !found.some(f => f.toLowerCase().includes(kw))) {
                    found.push(kw.charAt(0).toUpperCase() + kw.slice(1));
                }
            });
        }
        return found.slice(0, 15).map(s => ({ name: s, matched: Math.random() > 0.3 }));
    }

    function toggleSkill(name) {
        setSkillStates(prev => ({ ...prev, [name]: !prev[name] }));
    }

    /** Parse the full description into structured sections */
    function parseDescriptionSections(text) {
        if (!text) return { intro: '', sections: [] };
        // Safely coerce to string - description may be a JSON object from Supabase
        if (typeof text !== 'string') {
            text = (typeof text === 'object' && text.description) ? text.description : JSON.stringify(text);
        }
        // Safely replace line breaks using robust coercion
        const safeText = (typeof text === 'string' ? text : String(text || ''));
        let t = safeText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const headerDefs = [
            { key: 'description', patterns: ['job description', 'about the role', 'about the job', 'about this role', 'the role', 'overview', "what you'll do", 'what you will do', 'how you will contribute'] },
            { key: 'responsibilities', patterns: ['responsibilities', 'key responsibilities', "what you'll be doing", 'your impact'] },
            { key: 'required', patterns: ['required qualifications', 'required skills', 'requirements', 'minimum qualifications', "what we're looking for", 'what you bring', 'who you are'] },
            { key: 'preferred', patterns: ['preferred qualifications', 'nice to have', 'preferred skills', 'bonus qualifications'] },
            { key: 'skills', patterns: ['skills & mindset', 'skills mindset', 'technology stack', 'tech stack', 'tools & technologies'] },
            { key: 'benefits', patterns: ['benefits', 'what we offer', 'perks', 'compensation', 'total rewards'] },
            { key: 'about', patterns: ['about the company', 'about us', 'who we are', 'our company', 'disclaimers'] },
        ];
        const allP = headerDefs.flatMap(h => h.patterns);
        // Escape regex special chars safely
        const escaped = allP.map(p => {
            const str = typeof p === 'string' ? p : String(p);
            return str.replace(/[.*+?${}()|[\]\\]/g, '\\$&');
        });
        const headerRegex = new RegExp('^\s*(' + escaped.join('|') + ')[\s:]*$', 'gim');
        const matches = [];
        let match;
        while ((match = headerRegex.exec(t)) !== null) {
            matches.push({ index: match.index, end: match.index + match[0].length, header: match[1].trim() });
        }
        if (matches.length === 0) return { intro: t, sections: [] };
        const intro = t.substring(0, matches[0].index).trim();
        const sections = [];
        for (let i = 0; i < matches.length; i++) {
            const start = matches[i].end;
            const end = i + 1 < matches.length ? matches[i + 1].index : t.length;
            const content = t.substring(start, end).trim();
            let type = 'other';
            for (const hp of headerDefs) {
                if (hp.patterns.some(p => matches[i].header.toLowerCase().includes(p))) { type = hp.key; break; }
            }
            if (content.length > 10) sections.push({ type, header: matches[i].header, content });
        }
        return { intro, sections };
    }

    const formatJobDescription = (text) => {
        if (!text) return '';
        // If it's already complex HTML (from enrichment), just clean up problematic artifact tags/whitespace
        if (/\u003c(p|div|ul|li|strong|h[1-6])[\\s\\S]*\u003e/i.test(text)) {
            const txt = typeof text === 'string' ? text : String(text);
            return txt.replace(/\u0026nbsp;/g, ' ').replace(/\n\s*\n/g, '\u003cbr/\u003e');
        }

        let f = typeof text === 'string' ? text : String(text);
        const headers = ["About the Role", "About the Job", "About Us", "Summary", "What You Will Do", "Responsibilities", "Key Responsibilities", "Requirements", "Qualifications", "Minimum Qualifications", "Preferred Qualifications", "Benefits", "Compensation", "What We Offer", "How You Will Contribute", "Who You Are"];
        headers.forEach(h => {
            const pattern = new RegExp(`(${h}[:\\?]?)`, 'gi');
            f = f.replace(pattern, '\u003cbr/\u003e\u003cbr/\u003e\u003cstrong class=\"text-gray-900 block mb-2\"\u003e$1\u003c/strong\u003e');
        });
        f = f.replace(/([•\-])\s/g, '\u003cbr/\u003e$1 ')
            .replace(/\n/g, '\u003cbr/\u003e')
            .replace(/(\u003cbr\/\u003e){3,}/g, '\u003cbr/\u003e\u003cbr/\u003e');
        return f;
    };

    const renderBulletList = (items) => {
        if (!items) return null;
        const strItems = typeof items === 'string' ? items : String(items);
        // If content contains HTML, render it directly
        if (/\u003c[a-z][\\s\\S]*\u003e/i.test(strItems)) {
            return <div className="text-gray-700 text-sm leading-relaxed prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formatJobDescription(strItems) }} />;
        }
        const list = strItems.split(/\n+/).filter(i => i.trim().length > 0);
        if (!list.length) return null;
        return (
            <ul className="space-y-3">
                {list.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                        <div className="mt-1.5 min-w-[6px] h-[6px] rounded-full bg-gray-800" />
                        <span className="text-gray-700 text-sm leading-relaxed">{(typeof item === 'string' ? item : String(item)).replace(/^[•\-\*]\s*/, '')}</span>
                    </li>
                ))}
            </ul>
        );
    };

    /* ── Loading / Error ──────────────────────── */
    if (isLoading) return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
        </div>
    );
    if (error || !job) return (
        <div className="container py-12 text-center">
            <h1>Job Not Found</h1>
            <Button onClick={() => navigate('/jobs')} className="mt-4">Back to Jobs</Button>
        </div>
    );

    const cd = companyData || {};
    const matchLabel = (job.matchScore || 0) >= 70 ? 'GOOD MATCH' : (job.matchScore || 0) >= 50 ? 'FAIR MATCH' : 'LOW MATCH';
    const matchColor = (job.matchScore || 0) >= 70 ? '#10b981' : (job.matchScore || 0) >= 50 ? '#f59e0b' : '#ef4444';
    const skills = Object.entries(skillStates);

    /* ═══════════════════════════════════════════
       RENDER
       ═══════════════════════════════════════════ */
    return (
        <DashboardLayout activePage="jobs">
            <div className="bg-white min-h-screen font-sans">

                {/* ─── TOP BAR ─────────────────────────────── */}
                <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3">
                    <div className="max-w-6xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate('/jobs')} className="p-1 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                            <Badge variant="secondary" className="bg-gray-900 text-white text-xs">{job.applicants} applicants</Badge>
                        </div>
                        <div className="hidden md:block text-sm font-medium text-gray-700 truncate max-w-md">{job.title}</div>
                        <div className="flex items-center gap-2">
                            <button className="p-2 hover:bg-gray-100 rounded-lg" title="Not interested">
                                <Shield className="w-5 h-5 text-gray-400" />
                            </button>
                            <button className="p-2 hover:bg-gray-100 rounded-lg" title="Save">
                                <Heart className="w-5 h-5 text-gray-400" />
                            </button>
                            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 rounded-lg"
                                onClick={() => job.sourceUrl ? window.open(job.sourceUrl, '_blank') : alert("Source URL not available for this job.")}>
                                APPLY NOW <ExternalLink className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* ─── TABS ────────────────────────────────── */}
                <div className="border-b border-gray-200 bg-white">
                    <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
                        <div className="flex gap-6">
                            {['overview', 'company'].map(tab => (
                                <button key={tab} onClick={() => setActiveTab(tab)}
                                    className={`py-3 text-sm font-semibold border-b-2 transition-colors capitalize
                                        ${activeTab === tab ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                                    {tab === 'overview' ? 'Overview' : 'Company'}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                            <button className="flex items-center gap-1 hover:text-gray-700"><Share2 className="w-4 h-4" /> Share</button>
                            <button className="flex items-center gap-1 hover:text-gray-700"><Flag className="w-4 h-4" /> Report Issue</button>
                            {job.sourceUrl && (
                                <a href={job.sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-gray-700">
                                    <FileText className="w-4 h-4" /> Original Job Post
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto px-4 py-6">
                    {/* ═══════════════════════════════════════
                       OVERVIEW TAB
                       ═══════════════════════════════════════ */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* ─── HEADER CARD ─────────────────── */}
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <div className="flex flex-col lg:flex-row gap-6">
                                    {/* Left: Job info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            {(job.logo || cd.logo) && (
                                                <div className="w-12 h-12 rounded-lg border border-gray-100 p-1.5 bg-white">
                                                    <img src={job.logo || cd.logo} alt="" className="w-full h-full object-contain" onError={e => e.target.style.display = 'none'} />
                                                </div>
                                            )}
                                            <div>
                                                <span className="text-sm text-gray-500">{job.company}</span>
                                                <span className="text-gray-300 mx-2">·</span>
                                                <span className="text-sm text-gray-400">{job.postedDate}</span>
                                            </div>
                                        </div>
                                        <h1 className="text-xl font-bold text-gray-900 mb-4">{job.title}</h1>

                                        {/* Metadata Grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6 text-sm">
                                            {job.location && (
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <MapPin className="w-4 h-4 text-gray-400" />
                                                    <span>{job.location}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                <span>{job.jobType}</span>
                                            </div>
                                            {job.remoteType && (
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <Globe className="w-4 h-4 text-gray-400" />
                                                    <span>{job.remoteType}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Briefcase className="w-4 h-4 text-gray-400" />
                                                <span>{job.seniority}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <TrendingUp className="w-4 h-4 text-gray-400" />
                                                <span>{job.salaryRange}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <span>{job.experienceLevel}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Match Score */}
                                    <div className="flex flex-col items-center justify-center lg:min-w-[200px]">
                                        <div className="relative w-24 h-24 mb-2">
                                            <svg className="-rotate-90 w-24 h-24" viewBox="0 0 96 96">
                                                <circle cx="48" cy="48" r="42" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                                                <circle cx="48" cy="48" r="42" fill="none" stroke={matchColor} strokeWidth="6"
                                                    strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 - ((job.matchScore || 0) / 100) * 2 * Math.PI * 42}
                                                    strokeLinecap="round" />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-2xl font-bold">{job.matchScore || 0}%</span>
                                            </div>
                                        </div>
                                        <div className="text-sm font-bold uppercase tracking-wide" style={{ color: matchColor }}>{matchLabel}</div>
                                        <div className="flex gap-4 mt-4">
                                            <MatchRing percentage={job.matchBreakdown?.exp || 75} label="Exp. Level" color="#10b981" size={52} />
                                            <MatchRing percentage={job.matchBreakdown?.skill || 80} label="Skill" color="#10b981" size={52} />
                                            <MatchRing percentage={job.matchBreakdown?.industry || 60} label="Industry Exp." color="#10b981" size={52} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ─── MAXIMIZE INTERVIEW CHANCES BANNER ── */}
                            <div className="bg-gradient-to-r from-emerald-400 to-teal-500 rounded-xl p-5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="text-3xl">💬</div>
                                    <span className="text-white font-bold text-lg">Maximize your interview chances</span>
                                </div>
                                <Button className="bg-white text-gray-900 font-bold px-5 hover:bg-gray-100 rounded-lg shadow-sm"
                                    onClick={() => navigate('/ai-apply', { state: { jobId: job.id, jobTitle: job.title, company: job.company, jobDescription: job.fullDescription || job.description, sourceUrl: job.sourceUrl } })}>
                                    <Sparkles className="w-4 h-4 mr-2" /> Generate Custom Resume
                                </Button>
                            </div>

                            {/* ─── COMPANY SUMMARY + TAGS ───────── */}
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <p className="text-gray-700 text-sm leading-relaxed mb-4">
                                    <strong className="text-gray-900">{job.company}</strong>{' '}
                                    {cd.description || `is a leading technology company seeking a ${job.title}.`}
                                </p>
                                {/* Industry Tags */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {(cd.industries || []).map((tag, i) => (
                                        <Badge key={i} variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-xs">{tag}</Badge>
                                    ))}
                                </div>
                                {/* Badges */}
                                <div className="flex flex-wrap gap-3">
                                    {cd.h1b?.isLikely && (
                                        <div className="flex items-center gap-1.5 text-sm text-emerald-700">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> H1B Sponsor Likely
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5 text-sm text-emerald-700">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Work & Life Balance
                                    </div>
                                </div>
                            </div>

                            {/* ─── INSIDER CONNECTIONS ──────────── */}
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <Users className="w-5 h-5 text-emerald-600" /> Insider Connection @{job.company}
                                    </h3>
                                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">2 email credits available today</Badge>
                                </div>
                                <p className="text-sm text-gray-500 mb-1">Discover valuable connections within the company who might provide insights and potential referrals.</p>
                                <p className="text-sm text-gray-700 mb-4 font-medium underline cursor-pointer">Get 3x more responses when you reach out via email instead of LinkedIn.</p>

                                {/* Connection Categories */}
                                <div className="grid grid-cols-3 gap-4 mb-5">
                                    {[
                                        { label: 'Beyond Your Network', color: 'bg-emerald-50 text-emerald-600', initials: 'J', name: 'John K.', role: 'Senior Engineer' },
                                        { label: 'From Your Previous Company', color: 'bg-orange-50 text-orange-600', initials: 'M', name: 'Manoj A.', role: 'Consultant' },
                                        { label: 'From Your School', color: 'bg-purple-50 text-purple-600', hasLink: true }
                                    ].map((cat, i) => (
                                        <div key={i} className="space-y-3">
                                            <div className={`text-xs font-semibold ${cat.color} py-1 px-2 rounded`}>{cat.label}</div>
                                            {cat.hasLink ? (
                                                <a href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(job.company)}`}
                                                    target="_blank" rel="noreferrer"
                                                    className="text-sm text-gray-600 flex items-center gap-1 hover:text-emerald-600">
                                                    Find More Connections <ExternalLink className="w-3 h-3" />
                                                </a>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-emerald-500' : 'bg-orange-400'}`}>
                                                        {cat.initials}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium truncate">{cat.name}</div>
                                                        <div className="text-xs text-gray-400 truncate">{cat.role}</div>
                                                    </div>
                                                    <Button variant="outline" size="sm" className="text-xs h-7 px-3">View</Button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Find Any Email */}
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm mb-2">Find Any Email</h4>
                                    <div className="flex gap-2">
                                        <input type="text" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)}
                                            placeholder="Paste any LinkedIn profile URL (e.g., https://www.linkedin.com/in/xxxxx/) to find work emails instantly."
                                            className="flex-1 border border-emerald-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-emerald-50/50" />
                                        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full w-10 h-10 p-0">
                                            <Search className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* ─── PARSED DESCRIPTION SECTIONS ── */}
                            {(() => {
                                const rawText = job.fullDescription || job.description || '';
                                const fullText = typeof rawText === 'string' ? rawText : (rawText?.description || JSON.stringify(rawText));
                                const parsed = parseDescriptionSections(fullText);
                                const hasBackendSections = job.responsibilities || job.qualifications;
                                const hasParsedSections = parsed.sections.length > 0;

                                // If backend gave us structured data, use it
                                if (hasBackendSections) {
                                    return (
                                        <>
                                            {job.responsibilities && (
                                                <div className="bg-white rounded-xl border border-gray-200 p-6">
                                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                        <span className="text-xl">📋</span> Responsibilities
                                                    </h3>
                                                    {renderBulletList(job.responsibilities)}
                                                </div>
                                            )}
                                            {/* Qualification with skill tags */}
                                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                                        <span className="text-xl">🎯</span> Qualification
                                                    </h3>
                                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Represents the skills you have
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-500 mb-4">
                                                    Find out how your skills align with this job's requirements. If anything seems off, you can easily <strong>click on the tags</strong> to select or unselect skills to reflect your actual expertise.
                                                </p>
                                                {skills.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mb-6">
                                                        {skills.map(([name, matched]) => (
                                                            <SkillTag key={name} skill={name} matched={matched} onClick={() => toggleSkill(name)} />
                                                        ))}
                                                    </div>
                                                )}
                                                {job.qualifications && (
                                                    <>
                                                        <h4 className="font-bold text-gray-900 text-sm mb-3">Required</h4>
                                                        {renderBulletList(job.qualifications)}
                                                    </>
                                                )}
                                            </div>
                                        </>
                                    );
                                }

                                // Frontend-parsed sections from fullDescription
                                if (hasParsedSections) {
                                    return (
                                        <>
                                            {/* Intro / About */}
                                            {parsed.intro && (
                                                <div className="bg-white rounded-xl border border-gray-200 p-6">
                                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                        <span className="text-xl">🏢</span> About the Company
                                                    </h3>
                                                    <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{parsed.intro}</p>
                                                </div>
                                            )}

                                            {/* Job Description / Responsibilities */}
                                            {parsed.sections.filter(s => ['description', 'responsibilities'].includes(s.type)).map((sec, i) => (
                                                <div key={'resp-' + i} className="bg-white rounded-xl border border-gray-200 p-6">
                                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                        <span className="text-xl">{sec.type === 'responsibilities' ? '📋' : '💼'}</span> {sec.header}
                                                    </h3>
                                                    <div className="text-gray-700 text-sm leading-relaxed prose-sm max-w-none"
                                                        dangerouslySetInnerHTML={{ __html: formatJobDescription(sec.content) }} />
                                                </div>
                                            ))}

                                            {/* Qualification section with skill tags */}
                                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                                        <span className="text-xl">🎯</span> Qualification
                                                    </h3>
                                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Represents the skills you have
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-500 mb-4">
                                                    Find out how your skills align with this job's requirements. If anything seems off, you can easily <strong>click on the tags</strong> to select or unselect skills to reflect your actual expertise.
                                                </p>
                                                {skills.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mb-6">
                                                        {skills.map(([name, matched]) => (
                                                            <SkillTag key={name} skill={name} matched={matched} onClick={() => toggleSkill(name)} />
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Required qualifications from parsed sections */}
                                                {parsed.sections.filter(s => s.type === 'required').map((sec, i) => (
                                                    <div key={'req-' + i} className="mb-5">
                                                        <h4 className="font-bold text-gray-900 text-sm mb-3">Required — {sec.header}</h4>
                                                        <div className="text-gray-700 text-sm leading-relaxed prose-sm max-w-none"
                                                            dangerouslySetInnerHTML={{ __html: formatJobDescription(sec.content) }} />
                                                    </div>
                                                ))}

                                                {/* Preferred / Nice to Have */}
                                                {parsed.sections.filter(s => s.type === 'preferred').map((sec, i) => (
                                                    <div key={'pref-' + i} className="mb-4">
                                                        <h4 className="font-bold text-gray-700 text-sm mb-3">Preferred — {sec.header}</h4>
                                                        <div className="text-gray-600 text-sm leading-relaxed prose-sm max-w-none"
                                                            dangerouslySetInnerHTML={{ __html: formatJobDescription(sec.content) }} />
                                                    </div>
                                                ))}

                                                {/* Skills / Technology Stack */}
                                                {parsed.sections.filter(s => s.type === 'skills').map((sec, i) => (
                                                    <div key={'skills-' + i} className="mb-4">
                                                        <h4 className="font-bold text-gray-700 text-sm mb-3">{sec.header}</h4>
                                                        <div className="text-gray-600 text-sm leading-relaxed prose-sm max-w-none"
                                                            dangerouslySetInnerHTML={{ __html: formatJobDescription(sec.content) }} />
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Benefits / Compensation */}
                                            {parsed.sections.filter(s => s.type === 'benefits').map((sec, i) => (
                                                <div key={'ben-' + i} className="bg-white rounded-xl border border-gray-200 p-6">
                                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                        <span className="text-xl">💰</span> {sec.header}
                                                    </h3>
                                                    <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{sec.content}</div>
                                                </div>
                                            ))}

                                            {/* About company sections */}
                                            {parsed.sections.filter(s => s.type === 'about').map((sec, i) => (
                                                <div key={'about-' + i} className="bg-white rounded-xl border border-gray-200 p-6">
                                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                        <span className="text-xl">🏢</span> {sec.header}
                                                    </h3>
                                                    <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{sec.content}</div>
                                                </div>
                                            ))}

                                            {/* Any other sections */}
                                            {parsed.sections.filter(s => s.type === 'other').map((sec, i) => (
                                                <div key={'other-' + i} className="bg-white rounded-xl border border-gray-200 p-6">
                                                    <h3 className="text-lg font-bold text-gray-900 mb-4">{sec.header}</h3>
                                                    <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{sec.content}</div>
                                                </div>
                                            ))}
                                        </>
                                    );
                                }

                                // Ultimate fallback: just render the full text
                                const isShortDescription = fullText.length < 1000;
                                return (
                                    <>
                                        {/* Flat Qualification with skill tags */}
                                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                                    <span className="text-xl">🎯</span> Qualification
                                                </h3>
                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Represents the skills you have
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-500 mb-4">
                                                Find out how your skills align with this job's requirements. If anything seems off, you can easily <strong>click on the tags</strong> to select or unselect skills to reflect your actual expertise.
                                            </p>
                                            {skills.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-6">
                                                    {skills.map(([name, matched]) => (
                                                        <SkillTag key={name} skill={name} matched={matched} onClick={() => toggleSkill(name)} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {/* Full Description */}
                                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-bold text-gray-900">About the Role</h3>
                                                {isEnriching && (
                                                    <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium animate-pulse">
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        Enhancing job details...
                                                    </div>
                                                )}
                                            </div>
                                            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                                                style={{ overflow: 'visible', textOverflow: 'unset', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                                                dangerouslySetInnerHTML={{ __html: formatJobDescription(fullText) }}
                                            />
                                            {isShortDescription && !isEnriching && job.sourceUrl && (
                                                <div className="mt-6 pt-4 border-t border-gray-100">
                                                    <p className="text-sm text-gray-500 mb-3">This is a summary. View the full job description on the original posting for complete details.</p>
                                                    <a href={job.sourceUrl} target="_blank" rel="noreferrer"
                                                        className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold px-5 py-2.5 rounded-lg text-sm border border-emerald-200 transition-colors">
                                                        <FileText className="w-4 h-4" /> View Full Original Posting <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                );
                            })()}

                            {/* ─── BENEFITS ───────────────────── */}
                            {job.benefits && typeof job.benefits === 'string' && (
                                <div className="bg-white rounded-xl border border-gray-200 p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Benefits</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {(typeof job.benefits === 'string' ? job.benefits : String(job.benefits)).split(/\n+/).slice(0, 9).map((b, i) => (
                                            <div key={i} className="flex items-center gap-2 text-sm text-gray-600 p-2 bg-gray-50 rounded-lg">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                                <span className="truncate">{(typeof b === 'string' ? b : String(b)).replace(/^[•\-\*]\s*/, '')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══════════════════════════════════════
                       COMPANY TAB
                       ═══════════════════════════════════════ */}
                    {activeTab === 'company' && (
                        <div className="space-y-6">

                            {/* Company Header */}
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="flex-1">
                                        <h2 className="text-xl font-bold text-gray-900 mb-3">{job.company}</h2>
                                        {/* Social Links */}
                                        <div className="flex items-center gap-3 mb-4">
                                            {cd.socialLinks?.twitter && (
                                                <a href={cd.socialLinks.twitter} target="_blank" rel="noreferrer"
                                                    className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold hover:bg-gray-700">X</a>
                                            )}
                                            {cd.socialLinks?.linkedin && (
                                                <a href={cd.socialLinks.linkedin} target="_blank" rel="noreferrer"
                                                    className="w-8 h-8 rounded-full bg-[#0077b5] text-white flex items-center justify-center hover:bg-[#005885]">
                                                    <Linkedin className="w-4 h-4" />
                                                </a>
                                            )}
                                            <a href="#" className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold hover:bg-gray-300">cb</a>
                                            {cd.glassdoor && (
                                                <a href={cd.glassdoor.url} target="_blank" rel="noreferrer"
                                                    className="flex items-center gap-1 bg-green-50 border border-green-200 rounded-full px-3 py-1 text-sm">
                                                    <span className="font-bold text-green-700">Glassdoor</span>
                                                    <span className="flex text-yellow-500">{'★'.repeat(Math.floor(cd.glassdoor.rating || 4))}</span>
                                                    <span className="font-bold text-green-700">{cd.glassdoor.rating || 4.0}</span>
                                                </a>
                                            )}
                                        </div>
                                        {(job.logo || cd.logo) && (
                                            <div className="w-16 h-16 rounded-lg border border-gray-100 p-2 bg-white mb-4">
                                                <img src={job.logo || cd.logo} alt="" className="w-full h-full object-contain" onError={e => e.target.style.display = 'none'} />
                                            </div>
                                        )}
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            {cd.description || `${job.company} is a leading technology company.`}
                                        </p>
                                    </div>
                                    {/* Right: Company Facts */}
                                    <div className="md:min-w-[260px] space-y-3" >
                                        {cd.founded && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500 flex items-center gap-2"><Calendar className="w-4 h-4" /> Founded in</span>
                                                <span className="font-medium text-gray-900">{cd.founded}</span>
                                            </div>
                                        )}
                                        {cd.hq && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500 flex items-center gap-2"><MapPin className="w-4 h-4" /> HQ</span>
                                                <span className="font-medium text-gray-900">{cd.hq}</span>
                                            </div>
                                        )}
                                        {cd.employees && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500 flex items-center gap-2"><Users className="w-4 h-4" /> Employees</span>
                                                <span className="font-medium text-gray-900">{cd.employees}</span>
                                            </div>
                                        )}
                                        {cd.website && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500 flex items-center gap-2"><Globe className="w-4 h-4" /> Website</span>
                                                <a href={cd.website} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline truncate max-w-[160px]">{(typeof cd.website === 'string' ? cd.website : String(cd.website)).replace('https://', '')}</a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* H1B Sponsorship */}
                            {cd.h1b?.isLikely && (
                                <div className="bg-white rounded-xl border border-gray-200 p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">H1B Sponsorship</h3>
                                    <p className="text-sm text-gray-600 mb-4">
                                        {job.company} has a track record of offering H1B sponsorships. Please note that this does not guarantee sponsorship for this specific role. (<em className="text-blue-600">Data Powered by US Department of Labor</em>)
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Pie Chart Placeholder */}
                                        <div>
                                            <h4 className="font-bold text-sm text-gray-900 mb-3">Distribution of Job Fields Receiving Sponsorship</h4>
                                            <div className="flex items-center gap-4">
                                                <div className="relative w-28 h-28">
                                                    <svg viewBox="0 0 120 120" className="w-28 h-28">
                                                        <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="20" />
                                                        <circle cx="60" cy="60" r="50" fill="none" stroke="#10b981" strokeWidth="20"
                                                            strokeDasharray={2 * Math.PI * 50} strokeDashoffset={2 * Math.PI * 50 * 0.22}
                                                            className="-rotate-90 origin-center" />
                                                    </svg>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <span className="text-lg font-bold text-emerald-600">78%</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-1 text-xs text-gray-600">
                                                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Engineering & Development</div>
                                                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-400" /> Customer Service</div>
                                                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-300" /> Management</div>
                                                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-200" /> Sales</div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Trends */}
                                        <div>
                                            <h4 className="font-bold text-sm text-gray-900 mb-3">Trends of Total Sponsorships</h4>
                                            <div className="space-y-2">
                                                {[{ y: '2025', v: 29 }, { y: '2024', v: 22 }, { y: '2023', v: 25 }, { y: '2022', v: 26 }, { y: '2021', v: 23 }, { y: '2020', v: 30 }].map(d => (
                                                    <div key={d.y} className="flex items-center gap-3">
                                                        <span className="text-xs font-medium text-gray-700 w-16">{d.y} ({d.v})</span>
                                                        <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                                                            <div className="bg-emerald-400 h-2.5 rounded-full" style={{ width: `${(d.v / 30) * 100}%` }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ─── Leadership ──────────────────── */}
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Leadership Team</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { name: 'CEO', role: 'Chief Executive Officer' },
                                        { name: 'CTO', role: 'Chief Technology Officer' }
                                    ].map((leader, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
                                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                                                <Users className="w-6 h-6 text-gray-400" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-gray-900">{leader.name}</div>
                                                <div className="text-xs text-gray-500">{leader.role}</div>
                                            </div>
                                            <a href={cd.socialLinks?.linkedin || '#'} target="_blank" rel="noreferrer">
                                                <Linkedin className="w-4 h-4 text-[#0077b5]" />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ─── Recent News ─────────────────── */}
                            {cd.news && cd.news.length > 0 && (
                                <div className="bg-white rounded-xl border border-gray-200 p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <Newspaper className="w-5 h-5 text-gray-500" /> Recent News
                                    </h3>
                                    <div className="space-y-4">
                                        {cd.news.slice(0, 3).map((n, i) => (
                                            <div key={i} className="border-b border-gray-100 pb-3 last:border-0">
                                                <a href={n.url} target="_blank" rel="noreferrer"
                                                    className="text-sm font-medium text-gray-900 hover:text-emerald-600 hover:underline">{n.title}</a>
                                                <div className="text-xs text-gray-400 mt-1">{n.source} · {n.date}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default JobDetailsOrion;
