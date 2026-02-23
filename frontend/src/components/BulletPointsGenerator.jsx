import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
    List,
    Loader2,
    Copy,
    Check,
    Sparkles,
    ArrowRight,
    RefreshCw
} from 'lucide-react';
import { BRAND } from '../config/branding';
import { API_URL } from '../config/api';
import SideMenu from './SideMenu';
import Header from './Header';
import SubscriptionWall from './SubscriptionWall';
import './BulletPointsGenerator.css';

const BulletPointsGenerator = () => {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();
    const [sideMenuOpen, setSideMenuOpen] = useState(false);

    const [jobTitle, setJobTitle] = useState('');
    const [skills, setSkills] = useState('');
    const [experience, setExperience] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [bulletPoints, setBulletPoints] = useState([]);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [error, setError] = useState(null);

    const handleGenerate = async () => {
        if (!jobTitle.trim()) {
            setError('Please enter a job title');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const prompt = `Generate 6 professional resume bullet points for a ${jobTitle} position.
${skills ? `Key skills to highlight: ${skills}` : ''}
${experience ? `Experience context: ${experience}` : ''}

Each bullet point should:
- Start with a strong action verb
- Include quantifiable achievements where possible
- Be concise but impactful (1-2 lines max)
- Be ATS-friendly with relevant keywords

Return ONLY a JSON array of strings like: ["bullet 1", "bullet 2", ...]`;

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
                // Fallback to sample bullets
                setBulletPoints([
                    `Led cross-functional team initiatives to improve ${jobTitle} processes, resulting in 25% efficiency gains`,
                    `Developed and implemented strategic solutions that increased team productivity by 30%`,
                    `Collaborated with stakeholders to identify business requirements and deliver high-quality outcomes`,
                    `Mentored junior team members and conducted training sessions on best practices`,
                    `Analyzed data trends to provide actionable insights that drove key business decisions`,
                    `Spearheaded ${jobTitle} projects from conception to completion, meeting all deadlines and quality standards`
                ]);
                return;
            }

            const data = await response.json();

            try {
                const parsed = JSON.parse(data.response);
                if (Array.isArray(parsed)) {
                    setBulletPoints(parsed);
                } else {
                    throw new Error('Invalid format');
                }
            } catch {
                // Extract bullets from text response
                const responseText = typeof data.response === 'string' ? data.response : String(data.response || '');
                const lines = responseText.split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'));
                if (lines.length > 0) {
                    setBulletPoints(lines.map(l => (typeof l === 'string' ? l : String(l)).replace(/^[-•]\s*/, '').trim()));
                } else {
                    // Fallback
                    setBulletPoints([
                        `Led cross-functional team initiatives for ${jobTitle} role, achieving significant improvements`,
                        `Developed innovative solutions leveraging ${skills || 'technical expertise'}`,
                        `Collaborated with diverse teams to deliver high-impact results`,
                        `Implemented best practices that enhanced overall team performance`,
                        `Drove continuous improvement initiatives across projects`,
                        `Contributed to strategic planning and execution of key objectives`
                    ]);
                }
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const copyBullet = (bullet, index) => {
        navigator.clipboard.writeText(bullet);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const copyAll = () => {
        navigator.clipboard.writeText(bulletPoints.join('\n\n'));
        setCopiedIndex('all');
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    return (
        <SubscriptionWall>
            <div className="bullets-page">
                <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />
                <Header onMenuClick={() => setSideMenuOpen(true)} />

                <div className="bullets-container">
                    <div className="bullets-hero">
                        <div className="hero-badge">
                            <List className="w-5 h-5" />
                            <span>Bullet Points Generator</span>
                        </div>
                        <h1>Generate Powerful <span className="text-gradient">Resume Bullets</span></h1>
                        <p>Create tailored, ATS-friendly bullet points that highlight your achievements and skills.</p>
                    </div>

                    <div className="bullets-grid">
                        <Card className="input-card">
                            <h2><Sparkles className="w-5 h-5" /> Generate Bullet Points</h2>

                            <div className="form-group">
                                <label>Job Title *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Software Engineer, Product Manager"
                                    value={jobTitle}
                                    onChange={(e) => setJobTitle(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label>Key Skills (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Python, React, Leadership"
                                    value={skills}
                                    onChange={(e) => setSkills(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label>Experience Context (Optional)</label>
                                <textarea
                                    placeholder="Brief description of your role or achievements..."
                                    value={experience}
                                    onChange={(e) => setExperience(e.target.value)}
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
                                        Generate Bullets
                                    </>
                                )}
                            </Button>
                        </Card>

                        <Card className="output-card">
                            <div className="output-header">
                                <h2><List className="w-5 h-5" /> Your Bullet Points</h2>
                                {bulletPoints.length > 0 && (
                                    <Button variant="outline" size="sm" onClick={copyAll}>
                                        {copiedIndex === 'all' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        {copiedIndex === 'all' ? 'Copied!' : 'Copy All'}
                                    </Button>
                                )}
                            </div>

                            {bulletPoints.length === 0 ? (
                                <div className="empty-state">
                                    <List className="w-16 h-16 text-gray-300" />
                                    <p>Enter your job details and click Generate to create bullet points</p>
                                </div>
                            ) : (
                                <div className="bullets-list">
                                    {bulletPoints.map((bullet, index) => (
                                        <div key={index} className="bullet-item">
                                            <span className="bullet-marker">•</span>
                                            <p>{bullet}</p>
                                            <button
                                                className="copy-btn"
                                                onClick={() => copyBullet(bullet, index)}
                                            >
                                                {copiedIndex === index ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {bulletPoints.length > 0 && (
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
                        </Card>
                    </div>

                    {/* Tips Section */}
                    <div className="tips-section">
                        <h3>Pro Tips for Great Bullet Points</h3>
                        <div className="tips-grid">
                            <div className="tip">
                                <span className="tip-number">1</span>
                                <p><strong>Start with action verbs:</strong> Led, Developed, Implemented, Achieved</p>
                            </div>
                            <div className="tip">
                                <span className="tip-number">2</span>
                                <p><strong>Quantify achievements:</strong> Include numbers, percentages, revenue impact</p>
                            </div>
                            <div className="tip">
                                <span className="tip-number">3</span>
                                <p><strong>Be specific:</strong> Mention tools, technologies, and methodologies used</p>
                            </div>
                            <div className="tip">
                                <span className="tip-number">4</span>
                                <p><strong>Show impact:</strong> Focus on results and outcomes, not just duties</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SubscriptionWall>
    );
};

export default BulletPointsGenerator;
