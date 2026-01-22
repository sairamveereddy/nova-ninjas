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
    Sparkles,
    DollarSign,
    Linkedin,
    Clock,
    FileSearch,
    Scale
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
        'networking-templates': 'networking_icon.png',
        'interview-framework': 'interview_icon.png',
        'reference-prep': 'reference_icon.png',
        'salary-negotiator': 'salary_icon.png',
        'linkedin-headline': 'linkedin_icon.png',
        'career-gap': 'career_gap_icon.png',
        'job-decoder': 'job_decoder_icon.png',
        'offer-comparator': 'offer_icon.png'
    };

    const freeTools = [
        {
            id: 'networking-templates',
            icon: <MessageSquare className="w-8 h-8" />,
            name: 'Networking Message Templates',
            description: 'Ready-to-use templates for LinkedIn, email, and networking events.',
            path: '/networking-templates',
            color: 'from-indigo-500 to-purple-500',
            users: 'New!'
        },
        {
            id: 'interview-framework',
            icon: <Target className="w-8 h-8" />,
            name: 'Interview Answer Framework',
            description: 'Master STAR, CAR, and SOAR methods for behavioral interviews.',
            path: '/interview-framework',
            color: 'from-pink-500 to-rose-500',
            users: 'New!'
        },
        {
            id: 'reference-prep',
            icon: <Users className="w-8 h-8" />,
            name: 'Reference Check Prep',
            description: 'Prepare your references to give you the best recommendation.',
            path: '/reference-prep',
            color: 'from-green-500 to-emerald-500',
            users: 'New!'
        },
        {
            id: 'salary-negotiator',
            icon: <DollarSign className="w-8 h-8" />,
            name: 'Salary Negotiation Script',
            description: 'Get a personalized script to negotiate your best offer.',
            path: '/salary-negotiator',
            color: 'from-green-600 to-teal-500',
            users: 'New!',
            badge: 'AI'
        },
        {
            id: 'linkedin-headline',
            icon: <Linkedin className="w-8 h-8" />,
            name: 'LinkedIn Headline Optimizer',
            description: 'Get 10 optimized headline options with recruiter keywords.',
            path: '/linkedin-headline',
            color: 'from-blue-600 to-indigo-500',
            users: 'New!',
            badge: 'AI'
        },
        {
            id: 'career-gap',
            icon: <Clock className="w-8 h-8" />,
            name: 'Career Gap Explainer',
            description: 'Turn your career gap into a professional story for resumes.',
            path: '/career-gap',
            color: 'from-amber-500 to-orange-500',
            users: 'New!',
            badge: 'AI'
        },
        {
            id: 'job-decoder',
            icon: <FileSearch className="w-8 h-8" />,
            name: 'Job Description Decoder',
            description: 'Decode what they really mean, spot red flags, find hidden requirements.',
            path: '/job-decoder',
            color: 'from-purple-500 to-violet-500',
            users: 'New!',
            badge: 'AI'
        },
        {
            id: 'offer-comparator',
            icon: <Scale className="w-8 h-8" />,
            name: 'Offer Comparison Calculator',
            description: 'Compare multiple job offers with total compensation analysis.',
            path: '/offer-comparator',
            color: 'from-teal-500 to-cyan-500',
            users: 'New!'
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
                                    background: `linear-gradient(135deg, ${tool.color})`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    marginBottom: '1.5rem'
                                }}>
                                    {tool.icon}
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
