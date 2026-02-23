import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
    Linkedin,
    Loader2,
    Copy,
    Check,
    Sparkles,
    RefreshCw,
    User,
    Briefcase,
    FileText
} from 'lucide-react';
import { API_URL } from '../config/api';
import SideMenu from './SideMenu';
import Header from './Header';
import SubscriptionWall from './SubscriptionWall';
import './LinkedInOptimizer.css';

const LinkedInOptimizer = () => {
    const navigate = useNavigate();
    const [sideMenuOpen, setSideMenuOpen] = useState(false);

    const [activeTab, setActiveTab] = useState('headline');
    const [jobTitle, setJobTitle] = useState('');
    const [industry, setIndustry] = useState('');
    const [skills, setSkills] = useState('');
    const [currentRole, setCurrentRole] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState(null);

    const tabs = [
        { id: 'headline', label: 'Headline', icon: User },
        { id: 'summary', label: 'Summary', icon: FileText },
        { id: 'about', label: 'About Section', icon: Briefcase }
    ];

    const handleGenerate = async () => {
        if (!jobTitle.trim()) {
            setError('Please enter your target job title');
            return;
        }

        setIsGenerating(true);
        setError(null);

        let prompt = '';

        if (activeTab === 'headline') {
            prompt = `Generate 5 compelling LinkedIn headlines for a ${jobTitle} ${industry ? `in the ${industry} industry` : ''}.

Each headline should:
- Be under 120 characters
- Include relevant keywords for recruiters
- Be ATS and recruiter-friendly
- Show value proposition

Return as a numbered list.`;
        } else if (activeTab === 'summary') {
            prompt = `Write a professional LinkedIn summary for a ${jobTitle} ${industry ? `in ${industry}` : ''}.

${skills ? `Key skills: ${skills}` : ''}
${currentRole ? `Current role: ${currentRole}` : ''}

The summary should:
- Be 150-300 words
- Include industry keywords
- Have a strong opening hook
- Include a call to action
- Use first person (I, my)`;
        } else {
            prompt = `Write a compelling LinkedIn About section for a ${jobTitle} ${industry ? `in ${industry}` : ''}.

${skills ? `Expertise: ${skills}` : ''}

Make it:
- Personal and engaging
- Include achievements
- 200-400 words
- End with what you're looking for`;
        }

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/ai/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': token
                },
                body: JSON.stringify({ prompt, max_tokens: 1000 })
            });

            if (!response.ok) {
                // Fallback content
                if (activeTab === 'headline') {
                    setResult(`1. ${jobTitle} | Helping Companies Achieve Their Goals | Open to Opportunities
2. ${jobTitle} | ${industry || 'Technology'} Expert | Driving Results & Innovation
3. Experienced ${jobTitle} | ${skills?.split(',')[0] || 'Problem Solver'} | Building the Future
4. ${jobTitle} @ [Company] | ${industry || 'Industry'} Professional | Let's Connect
5. Passionate ${jobTitle} | ${skills?.split(',')[0] || 'Strategic Thinker'} | Making Impact`);
                } else {
                    setResult(`As a dedicated ${jobTitle} with expertise in ${skills || 'my field'}, I am passionate about driving results and making meaningful impact. ${industry ? `With experience in the ${industry} industry,` : ''} I bring a unique combination of technical skills and strategic thinking to every challenge.

Throughout my career, I have focused on delivering value and building strong relationships with stakeholders. I am always eager to learn and grow, staying current with industry trends and best practices.

I'm open to connecting with fellow professionals and exploring new opportunities. Let's connect!`);
                }
                return;
            }

            const data = await response.json();
            const responseText = typeof data.response === 'string' ? data.response : String(data.response || '');
            setResult(responseText);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const copyResult = () => {
        navigator.clipboard.writeText(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <SubscriptionWall>
            <div className="linkedin-page">
                <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />
                <Header onMenuClick={() => setSideMenuOpen(true)} />

                <div className="linkedin-container">
                    <div className="linkedin-hero">
                        <div className="hero-badge linkedin-badge">
                            <Linkedin className="w-5 h-5" />
                            <span>LinkedIn Optimizer</span>
                        </div>
                        <h1>Optimize Your <span className="text-gradient-blue">LinkedIn Profile</span></h1>
                        <p>Get noticed by recruiters with an optimized headline, summary, and about section.</p>
                        <div style={{ marginTop: '1.5rem' }}>
                            <Button
                                variant="outline"
                                className="li-mockup-btn"
                                style={{
                                    borderRadius: '50px',
                                    padding: '0.75rem 1.5rem',
                                    background: 'rgba(255,255,255,0.1)',
                                    borderColor: 'var(--primary)'
                                }}
                                onClick={() => navigate('/linkedin-mockup')}
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                See Simulation on LinkedIn
                            </Button>
                        </div>
                    </div>

                    <Card className="linkedin-card">
                        {/* Tabs */}
                        <div className="linkedin-tabs">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => { setActiveTab(tab.id); setResult(''); }}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="linkedin-content">
                            <div className="input-section">
                                <div className="form-group">
                                    <label>Target Job Title *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Senior Product Manager"
                                        value={jobTitle}
                                        onChange={(e) => setJobTitle(e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Industry</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. FinTech, Healthcare, SaaS"
                                        value={industry}
                                        onChange={(e) => setIndustry(e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Key Skills</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Product Strategy, User Research, Agile"
                                        value={skills}
                                        onChange={(e) => setSkills(e.target.value)}
                                    />
                                </div>

                                {(activeTab === 'summary' || activeTab === 'about') && (
                                    <div className="form-group">
                                        <label>Current Role/Company</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Product Lead at TechCorp"
                                            value={currentRole}
                                            onChange={(e) => setCurrentRole(e.target.value)}
                                        />
                                    </div>
                                )}

                                {error && <div className="error-message">{error}</div>}

                                <Button
                                    className="generate-btn"
                                    onClick={handleGenerate}
                                    disabled={!jobTitle.trim() || isGenerating}
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5" />
                                            Generate {tabs.find(t => t.id === activeTab)?.label}
                                        </>
                                    )}
                                </Button>
                            </div>

                            <div className="output-section">
                                <div className="output-header">
                                    <h3>Generated Content</h3>
                                    {result && (
                                        <Button variant="outline" size="sm" onClick={copyResult}>
                                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            {copied ? 'Copied!' : 'Copy'}
                                        </Button>
                                    )}
                                </div>

                                {!result ? (
                                    <div className="empty-state">
                                        <Linkedin className="w-16 h-16" />
                                        <p>Enter your details and click Generate to create your {activeTab}</p>
                                    </div>
                                ) : (
                                    <div className="result-content">
                                        <pre>{result}</pre>
                                    </div>
                                )}

                                {result && (
                                    <Button
                                        variant="ghost"
                                        className="regenerate-btn"
                                        onClick={handleGenerate}
                                        disabled={isGenerating}
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Regenerate
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </SubscriptionWall>
    );
};

export default LinkedInOptimizer;
