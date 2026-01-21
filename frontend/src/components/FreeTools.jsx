import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Checkbox } from './ui/checkbox';
import {
    FileText,
    MessageSquare,
    Target,
    TrendingUp,
    Briefcase,
    Zap,
    Users,
    Mail,
    Lightbulb,
    Award,
    BookOpen,
    Pen,
    Search,
    BarChart3,
    Globe,
    CheckCircle,
    ArrowRight,
    Sparkles
} from 'lucide-react';
import { BRAND } from '../config/branding';
import { API_URL } from '../config/api';
import SideMenu from './SideMenu';
import Header from './Header';
import './SideMenu.css';

const FreeTools = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const [sideMenuOpen, setSideMenuOpen] = useState(false);
    const [consent, setConsent] = useState(false);
    const [showConsentModal, setShowConsentModal] = useState(false);
    const [selectedTool, setSelectedTool] = useState(null);
    const [savingConsent, setSavingConsent] = useState(false);

    // Map tool IDs to actual icon filenames
    const iconMap = {
        'ats-score': 'ats_score_icon_1769016476448.png',
        'cover-letter': 'cover_letter_icon_1769016491731.png',
        'career-netflix': 'netflix_career_icon_1769016507886.png',
        'roast-resume': 'roast_resume_icon_1769016525581.png',
        'job-tracker': 'job_tracker_icon_1769016541321.png',
        'job-strategy': 'job_strategy_icon_1769016555901.png',
        'interview-predictor': 'interview_predictor_icon_1769016570832.png',
        'self-intro': 'self_intro_icon_1769016583102.png',
        'buzzword-detector': 'buzzword_detector_icon_1769016596691.png',
        'cold-email': 'cold_email_icon_1769016610895.png',
        'tech-comparison': 'tech_comparison_icon_1769016623766.png',
        'wikipedia-generator': 'wikipedia_icon_1769016637087.png'
    };

    const freeTools = [
        {
            id: 'ats-score',
            icon: <BarChart3 className="w-8 h-8" />,
            name: 'ATS Score Checker',
            description: 'Get your resume past ATS systems with 90% or higher success rate.',
            path: '/scanner',
            color: 'from-blue-500 to-cyan-500',
            users: '2450+'
        },
        {
            id: 'cover-letter',
            icon: <MessageSquare className="w-8 h-8" />,
            name: 'Cover Letter Generator',
            description: 'Create personalized cover letters in seconds.',
            path: '/chatgpt-cover-letter',
            color: 'from-orange-500 to-red-500',
            users: '1230+'
        },
        {
            id: 'career-netflix',
            icon: <Sparkles className="w-8 h-8" />,
            name: 'Your Career as a Netflix Series',
            description: 'Transform your professional journey into a binge-worthy Netflix show.',
            path: '/career-change',
            color: 'from-red-600 to-pink-500',
            users: 'New!'
        },
        {
            id: 'roast-resume',
            icon: <Award className="w-8 h-8" />,
            name: 'Roast My Resume',
            description: 'Get hilariously honest feedback about your resume.',
            path: '/summary-generator',
            color: 'from-yellow-500 to-orange-500',
            users: '1600+'
        },
        {
            id: 'job-tracker',
            icon: <Briefcase className="w-8 h-8" />,
            name: 'Job Application Tracker',
            description: 'Track and organize your jobs with a visual Kanban board.',
            path: '/dashboard',
            color: 'from-green-500 to-emerald-500',
            users: '870+'
        },
        {
            id: 'job-strategy',
            icon: <Target className="w-8 h-8" />,
            name: '30-Day Job Search Strategy Generator',
            description: 'Get a personalized day-by-day plan to land your dream job in 30 days.',
            path: '/interview-prep',
            color: 'from-purple-500 to-pink-500',
            users: 'New!',
            badge: 'New!'
        },
        {
            id: 'interview-predictor',
            icon: <Users className="w-8 h-8" />,
            name: 'Interview Question Predictor',
            description: "Know what they'll ask before they ask it based on your resume.",
            path: '/interview-prep',
            color: 'from-indigo-500 to-purple-500',
            users: '970+'
        },
        {
            id: 'self-intro',
            icon: <Award className="w-8 h-8" />,
            name: 'Killer Self-Intro Generator',
            description: 'Hook any interviewer in 30 seconds flat that make you unforgettable.',
            path: '/summary-generator',
            color: 'from-pink-500 to-rose-500',
            users: '1600+'
        },
        {
            id: 'buzzword-detector',
            icon: <Pen className="w-8 h-8" />,
            name: 'Resume Buzzword Detector',
            description: 'Remove cliché phrases that make recruiters cringe.',
            path: '/bullet-points',
            color: 'from-amber-500 to-yellow-500',
            users: '870+'
        },
        {
            id: 'cold-email',
            icon: <Mail className="w-8 h-8" />,
            name: 'Cold Email Generator for Job Seekers',
            description: 'Craft personalized recruiter outreach emails that get responses.',
            path: '/chatgpt-cover-letter',
            color: 'from-blue-600 to-indigo-500',
            users: 'New!',
            badge: 'New!'
        },
        {
            id: 'tech-comparison',
            icon: <TrendingUp className="w-8 h-8" />,
            name: 'Tech Legend Comparison',
            description: 'Compare yourself against tech leaders like Elon or Mark at your age.',
            path: '/linkedin-optimizer',
            color: 'from-red-500 to-orange-500',
            users: '1200+'
        },
        {
            id: 'wikipedia-generator',
            icon: <Globe className="w-8 h-8" />,
            name: 'Wikipedia Page Generator',
            description: 'Create a Wikipedia page about yourself in seconds.',
            path: '/linkedin-examples',
            color: 'from-gray-600 to-gray-400',
            users: '890+'
        }
    ];

    const handleToolClick = (tool) => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        // Check if user has already given consent
        const hasConsent = localStorage.getItem(`marketing_consent_${user?.email}`);

        if (hasConsent === 'true') {
            navigate(tool.path);
        } else {
            setSelectedTool(tool);
            setShowConsentModal(true);
        }
    };

    const handleConsentSubmit = async () => {
        if (!consent) {
            alert('Please agree to receive communications to use our free tools.');
            return;
        }

        setSavingConsent(true);
        try {
            // Save consent to backend
            await fetch(`${API_URL}/api/user/consent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: user.email,
                    consent_type: 'marketing',
                    consent_given: true,
                    consent_date: new Date().toISOString()
                })
            });

            // Save to localStorage
            localStorage.setItem(`marketing_consent_${user.email}`, 'true');

            // Navigate to tool
            setShowConsentModal(false);
            navigate(selectedTool.path);
        } catch (error) {
            console.error('Error saving consent:', error);
            // Still allow access even if backend fails
            localStorage.setItem(`marketing_consent_${user.email}`, 'true');
            setShowConsentModal(false);
            navigate(selectedTool.path);
        } finally {
            setSavingConsent(false);
        }
    };

    return (
        <div className="free-tools-page" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: '#f8fafc' }}>
            <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />
            <Header onMenuClick={() => setSideMenuOpen(true)} />

            {/* Hero Section */}
            <section style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                padding: '4rem 0',
                textAlign: 'center'
            }}>
                <div className="container" style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2rem' }}>
                    <h1 style={{
                        fontSize: '3rem',
                        fontWeight: 800,
                        color: 'white',
                        marginBottom: '1rem',
                        letterSpacing: '-0.02em'
                    }}>
                        Free Tools for Job Seekers 💖
                    </h1>
                    <p style={{
                        fontSize: '1.25rem',
                        color: '#cbd5e1',
                        marginBottom: '2rem'
                    }}>
                        We've built these tools to help you land your dream job and they're <span style={{ color: '#10b981', fontWeight: 700 }}>100% Free</span>
                    </p>
                </div>
            </section>

            {/* Tools Grid */}
            <section style={{ padding: '4rem 0' }}>
                <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '2rem'
                    }}>
                        {freeTools.map((tool) => (
                            <Card
                                key={tool.id}
                                onClick={() => handleToolClick(tool)}
                                style={{
                                    padding: '2rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '16px',
                                    background: 'white',
                                    position: 'relative'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-8px)';
                                    e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                {tool.badge && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '1rem',
                                        right: '1rem',
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        color: 'white',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '12px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700
                                    }}>
                                        {tool.badge}
                                    </div>
                                )}

                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    marginBottom: '1.5rem'
                                }}>
                                    <img
                                        src={`/tool-icons/${iconMap[tool.id]}`}
                                        alt={tool.name}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                        }}
                                    />
                                </div>

                                <div style={{
                                    fontSize: '0.75rem',
                                    color: '#64748b',
                                    marginBottom: '0.5rem',
                                    fontWeight: 600
                                }}>
                                    {tool.users}
                                </div>

                                <h3 style={{
                                    fontSize: '1.125rem',
                                    fontWeight: 700,
                                    marginBottom: '0.75rem',
                                    color: '#0f172a',
                                    lineHeight: 1.3
                                }}>
                                    {tool.name}
                                </h3>

                                <p style={{
                                    fontSize: '0.875rem',
                                    color: '#64748b',
                                    lineHeight: 1.6,
                                    marginBottom: '1rem'
                                }}>
                                    {tool.description}
                                </p>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    color: '#10b981',
                                    fontSize: '0.875rem',
                                    fontWeight: 600
                                }}>
                                    Try Now
                                    <ArrowRight className="w-4 h-4" />
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Consent Modal */}
            {showConsentModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '2rem'
                }} onClick={() => setShowConsentModal(false)}>
                    <Card style={{
                        maxWidth: '500px',
                        width: '100%',
                        padding: '2rem',
                        background: 'white',
                        borderRadius: '16px'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1rem'
                            }}>
                                <Sparkles className="w-8 h-8" style={{ color: 'white' }} />
                            </div>
                            <h2 style={{
                                fontSize: '1.5rem',
                                fontWeight: 700,
                                marginBottom: '0.5rem',
                                color: '#0f172a'
                            }}>
                                Get Personalized Job Tips
                            </h2>
                            <p style={{
                                fontSize: '0.875rem',
                                color: '#64748b'
                            }}>
                                To use our free tools, we'd love to send you helpful career advice
                            </p>
                        </div>

                        <div style={{
                            background: '#f8fafc',
                            padding: '1.5rem',
                            borderRadius: '12px',
                            marginBottom: '1.5rem'
                        }}>
                            <label style={{
                                display: 'flex',
                                gap: '1rem',
                                cursor: 'pointer',
                                alignItems: 'flex-start'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={consent}
                                    onChange={(e) => setConsent(e.target.checked)}
                                    style={{
                                        width: '20px',
                                        height: '20px',
                                        marginTop: '2px',
                                        cursor: 'pointer'
                                    }}
                                />
                                <span style={{
                                    fontSize: '0.875rem',
                                    color: '#475569',
                                    lineHeight: 1.6
                                }}>
                                    I agree to receive <strong>WhatsApp messages</strong> and <strong>Marketing Emails</strong> with personalized job search tips and actionable career advice.
                                </span>
                            </label>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <Button
                                variant="outline"
                                onClick={() => setShowConsentModal(false)}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    fontSize: '1rem'
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleConsentSubmit}
                                disabled={!consent || savingConsent}
                                style={{
                                    flex: 1,
                                    background: consent ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#e2e8f0',
                                    color: consent ? 'white' : '#94a3b8',
                                    padding: '0.75rem',
                                    fontSize: '1rem',
                                    cursor: consent ? 'pointer' : 'not-allowed'
                                }}
                            >
                                {savingConsent ? 'Saving...' : 'Continue'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Footer */}
            <footer style={{ background: '#0f172a', padding: '3rem 0', color: '#94a3b8' }}>
                <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.875rem' }}>{BRAND.copyright}</p>
                </div>
            </footer>
        </div>
    );
};

export default FreeTools;
