import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
    Mail,
    Download,
    Eye,
    Star,
    Briefcase,
    GraduationCap,
    TrendingUp,
    Heart,
    Copy,
    Check
} from 'lucide-react';
import SideMenu from './SideMenu';
import Header from './Header';
import './CoverLetterTemplates.css';

const CoverLetterTemplates = () => {
    const navigate = useNavigate();
    const [sideMenuOpen, setSideMenuOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [previewTemplate, setPreviewTemplate] = useState(null);
    const [copied, setCopied] = useState(false);

    const categories = [
        { id: 'all', label: 'All', icon: Mail },
        { id: 'professional', label: 'Professional', icon: Briefcase },
        { id: 'entry', label: 'Entry Level', icon: GraduationCap },
        { id: 'career-change', label: 'Career Change', icon: TrendingUp }
    ];

    const templates = [
        {
            id: 1,
            name: 'Professional Cover Letter',
            category: 'professional',
            description: 'Traditional format for corporate and professional roles',
            rating: 4.9,
            downloads: '8.2K',
            content: `Dear [Hiring Manager],

I am writing to express my strong interest in the [Position] role at [Company]. With [X] years of experience in [Field], I am confident that my skills and achievements align well with your requirements.

In my current role at [Current Company], I have:
• [Achievement 1 with metrics]
• [Achievement 2 with metrics]
• [Achievement 3 with metrics]

What excites me about [Company] is [specific reason]. I am particularly drawn to [specific aspect of company/role].

I would welcome the opportunity to discuss how my background and skills would contribute to your team's success. Thank you for considering my application.

Sincerely,
[Your Name]`
        },
        {
            id: 2,
            name: 'Entry Level',
            category: 'entry',
            description: 'Perfect for recent graduates and first-time job seekers',
            rating: 4.8,
            downloads: '12.1K',
            content: `Dear [Hiring Manager],

I am excited to apply for the [Position] role at [Company]. As a recent graduate from [University] with a degree in [Field], I am eager to begin my career in [Industry].

During my time at university, I developed strong skills in:
• [Relevant skill or coursework]
• [Internship or project experience]
• [Extracurricular achievement]

Although I am early in my career, I bring enthusiasm, a strong work ethic, and a genuine passion for [field/industry]. I am a quick learner who thrives in collaborative environments.

I would love the opportunity to contribute to [Company] while continuing to grow professionally. Thank you for your time and consideration.

Best regards,
[Your Name]`
        },
        {
            id: 3,
            name: 'Career Change',
            category: 'career-change',
            description: 'Highlight transferable skills when switching industries',
            rating: 4.7,
            downloads: '5.4K',
            content: `Dear [Hiring Manager],

I am writing to express my interest in the [Position] at [Company]. While my background is in [Previous Field], I am excited to transition into [New Field] and believe my transferable skills make me a strong candidate.

In my [X] years in [Previous Field], I developed expertise in:
• [Transferable skill 1] - directly applicable to [new role aspect]
• [Transferable skill 2] - demonstrated by [achievement]
• [Transferable skill 3] - evidenced by [result]

My decision to pursue [New Field] stems from [genuine reason]. I have prepared for this transition by [relevant courses, projects, or self-study].

I am confident that my unique perspective and proven ability to adapt would be valuable to your team. I would welcome the opportunity to discuss how I can contribute to [Company].

Thank you for your consideration.

Sincerely,
[Your Name]`
        },
        {
            id: 4,
            name: 'Creative Professional',
            category: 'professional',
            description: 'Stand out while maintaining professionalism',
            rating: 4.6,
            downloads: '3.8K',
            content: `Dear [Hiring Manager],

When I saw the [Position] opening at [Company], I knew I had to reach out. Here's why:

[Company] is known for [impressive company trait], and that's exactly the kind of environment where I thrive. In my current role, I've:

→ [Eye-catching achievement with numbers]
→ [Another impressive result]
→ [Third compelling accomplishment]

But beyond the metrics, what I'm really passionate about is [genuine interest related to role]. That's why [Company]'s mission to [company mission/value] resonates so deeply with me.

I'd love to bring my [key skill] and [another skill] to help [specific company goal]. Can we schedule a conversation to explore how I might contribute?

Looking forward to connecting,
[Your Name]`
        }
    ];

    const filteredTemplates = selectedCategory === 'all'
        ? templates
        : templates.filter(t => t.category === selectedCategory);

    const copyContent = (content) => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="cl-templates-page">
            <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />
            <Header onMenuClick={() => setSideMenuOpen(true)} />

            <div className="cl-templates-container">
                <div className="cl-templates-hero">
                    <div className="hero-badge">
                        <Mail className="w-5 h-5" />
                        <span>Cover Letter Templates</span>
                    </div>
                    <h1>Free <span className="text-gradient">Cover Letter Templates</span></h1>
                    <p>Professional templates to help you land your dream job</p>
                </div>

                {/* Category Filter */}
                <div className="category-filter">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(cat.id)}
                        >
                            <cat.icon className="w-4 h-4" />
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Templates List */}
                <div className="cl-templates-grid">
                    {filteredTemplates.map(template => (
                        <Card key={template.id} className="cl-template-card">
                            <div className="cl-template-header">
                                <Mail className="w-8 h-8" />
                                <div>
                                    <h3>{template.name}</h3>
                                    <p>{template.description}</p>
                                </div>
                            </div>

                            <div className="cl-template-preview">
                                <pre>{template.content.substring(0, 200)}...</pre>
                            </div>

                            <div className="cl-template-meta">
                                <span className="rating">
                                    <Star className="w-4 h-4" fill="#fbbf24" stroke="#fbbf24" />
                                    {template.rating}
                                </span>
                                <span className="downloads">
                                    <Download className="w-4 h-4" />
                                    {template.downloads}
                                </span>
                            </div>

                            <div className="cl-template-actions">
                                <Button
                                    variant="outline"
                                    onClick={() => setPreviewTemplate(template)}
                                >
                                    <Eye className="w-4 h-4" />
                                    Preview
                                </Button>
                                <Button
                                    className="use-btn"
                                    onClick={() => copyContent(template.content)}
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {copied ? 'Copied!' : 'Copy Template'}
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Tips */}
                <div className="tips-section">
                    <h2>Cover Letter Tips</h2>
                    <div className="tips-grid">
                        <div className="tip-card">
                            <Heart className="w-6 h-6 text-pink-500" />
                            <h4>Personalize Every Letter</h4>
                            <p>Customize your cover letter for each application</p>
                        </div>
                        <div className="tip-card">
                            <TrendingUp className="w-6 h-6 text-green-500" />
                            <h4>Quantify Achievements</h4>
                            <p>Use numbers and metrics to demonstrate impact</p>
                        </div>
                        <div className="tip-card">
                            <Briefcase className="w-6 h-6 text-blue-500" />
                            <h4>Research the Company</h4>
                            <p>Show you understand their mission and values</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            {previewTemplate && (
                <div className="preview-modal" onClick={() => setPreviewTemplate(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{previewTemplate.name}</h2>
                            <button onClick={() => setPreviewTemplate(null)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <pre>{previewTemplate.content}</pre>
                        </div>
                        <div className="modal-actions">
                            <Button onClick={() => copyContent(previewTemplate.content)}>
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Copied!' : 'Copy to Clipboard'}
                            </Button>
                            <Button variant="outline" onClick={() => navigate('/chatgpt-cover-letter')}>
                                Customize with AI
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CoverLetterTemplates;
