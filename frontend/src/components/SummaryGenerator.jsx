import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
    FileText,
    Loader2,
    Copy,
    Check,
    Sparkles,
    RefreshCw,
    Target
} from 'lucide-react';
import { API_URL } from '../config/api';
import SideMenu from './SideMenu';
import Header from './Header';
import SubscriptionWall from './SubscriptionWall';
import './SummaryGenerator.css';

const SummaryGenerator = () => {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();
    const [sideMenuOpen, setSideMenuOpen] = useState(false);

    const [jobTitle, setJobTitle] = useState('');
    const [yearsExperience, setYearsExperience] = useState('');
    const [keySkills, setKeySkills] = useState('');
    const [achievements, setAchievements] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [summary, setSummary] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState(null);

    const handleGenerate = async () => {
        if (!jobTitle.trim()) {
            setError('Please enter a job title');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const prompt = `Write a professional resume summary for a ${jobTitle} with ${yearsExperience || 'several'} years of experience.

${keySkills ? `Key skills: ${keySkills}` : ''}
${achievements ? `Notable achievements: ${achievements}` : ''}

The summary should be:
- 2-4 sentences long
- ATS-friendly with relevant keywords
- Highlight value proposition and key strengths
- Professional and compelling tone
- No first-person pronouns (I, my, me)

Return ONLY the summary text, no explanations.`;

            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/ai/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': token
                },
                body: JSON.stringify({ prompt, max_tokens: 500 })
            });

            if (!response.ok) {
                // Fallback summary
                const exp = yearsExperience || '5+';
                setSummary(`Results-driven ${jobTitle} with ${exp} years of experience delivering high-impact solutions. Proven track record of ${keySkills ? `leveraging ${keySkills} to` : ''} drive business outcomes and exceed performance targets. ${achievements ? `Notable achievements include ${achievements}.` : ''} Committed to continuous improvement and delivering exceptional value to organizations.`);
                return;
            }

            const data = await response.json();
            const responseText = typeof data.response === 'string' ? data.response : String(data.response || '');
            setSummary(responseText.trim());

        } catch (err) {
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const copySummary = () => {
        navigator.clipboard.writeText(summary);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <SubscriptionWall>
            <div className="summary-page">
                <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />
                <Header onMenuClick={() => setSideMenuOpen(true)} />

                <div className="summary-container">
                    <div className="summary-hero">
                        <div className="hero-badge">
                            <Target className="w-5 h-5" />
                            <span>Summary Generator</span>
                        </div>
                        <h1>Create Your Perfect <span className="text-gradient">Resume Summary</span></h1>
                        <p>Generate a personalized, ATS-friendly professional summary that makes you stand out.</p>
                    </div>

                    <div className="summary-grid">
                        <Card className="input-card">
                            <h2><Sparkles className="w-5 h-5" /> Your Details</h2>

                            <div className="form-group">
                                <label>Target Job Title *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Senior Software Engineer"
                                    value={jobTitle}
                                    onChange={(e) => setJobTitle(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label>Years of Experience</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 5"
                                    value={yearsExperience}
                                    onChange={(e) => setYearsExperience(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label>Key Skills</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Python, Cloud Architecture, Team Leadership"
                                    value={keySkills}
                                    onChange={(e) => setKeySkills(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label>Notable Achievements</label>
                                <textarea
                                    placeholder="e.g. Led a team of 10, increased revenue by 25%..."
                                    value={achievements}
                                    onChange={(e) => setAchievements(e.target.value)}
                                    rows={4}
                                />
                            </div>

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
                                        Generate Summary
                                    </>
                                )}
                            </Button>
                        </Card>

                        <Card className="output-card">
                            <div className="output-header">
                                <h2><FileText className="w-5 h-5" /> Your Summary</h2>
                                {summary && (
                                    <Button variant="outline" size="sm" onClick={copySummary}>
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        {copied ? 'Copied!' : 'Copy'}
                                    </Button>
                                )}
                            </div>

                            {!summary ? (
                                <div className="empty-state">
                                    <FileText className="w-16 h-16 text-gray-300" />
                                    <p>Fill in your details and click Generate to create your professional summary</p>
                                </div>
                            ) : (
                                <div className="summary-output">
                                    <p>{summary}</p>
                                </div>
                            )}

                            {summary && (
                                <div className="output-actions">
                                    <Button
                                        variant="ghost"
                                        onClick={handleGenerate}
                                        disabled={isGenerating}
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Regenerate
                                    </Button>
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Examples Section */}
                    <div className="examples-section">
                        <h3>Example Summaries</h3>
                        <div className="examples-grid">
                            <div className="example-card">
                                <span className="example-role">Software Engineer</span>
                                <p>Innovative Software Engineer with 5+ years of experience building scalable web applications. Expert in React, Node.js, and cloud technologies with proven ability to reduce deployment time by 40%.</p>
                            </div>
                            <div className="example-card">
                                <span className="example-role">Product Manager</span>
                                <p>Strategic Product Manager with 7+ years driving product roadmaps from concept to launch. Track record of increasing user engagement by 60% and leading cross-functional teams of 15+ members.</p>
                            </div>
                            <div className="example-card">
                                <span className="example-role">Data Scientist</span>
                                <p>Results-oriented Data Scientist with expertise in machine learning, Python, and statistical modeling. Delivered $2M+ in cost savings through predictive analytics and process optimization.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SubscriptionWall>
    );
};

export default SummaryGenerator;
