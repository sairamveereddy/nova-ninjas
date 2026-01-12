import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
    FileText,
    Download,
    Eye,
    Star,
    Briefcase,
    Code,
    Users,
    TrendingUp,
    GraduationCap,
    Heart
} from 'lucide-react';
import SideMenu from './SideMenu';
import Header from './Header';
import './ResumeTemplates.css';

const ResumeTemplates = () => {
    const navigate = useNavigate();
    const [sideMenuOpen, setSideMenuOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [previewTemplate, setPreviewTemplate] = useState(null);

    const categories = [
        { id: 'all', label: 'All Templates', icon: FileText },
        { id: 'professional', label: 'Professional', icon: Briefcase },
        { id: 'tech', label: 'Tech & IT', icon: Code },
        { id: 'creative', label: 'Creative', icon: Star },
        { id: 'entry', label: 'Entry Level', icon: GraduationCap },
        { id: 'executive', label: 'Executive', icon: TrendingUp }
    ];

    const templates = [
        {
            id: 1,
            name: 'Professional Classic',
            category: 'professional',
            description: 'Clean, traditional format perfect for corporate roles',
            rating: 4.9,
            downloads: '12.5K',
            atsScore: 98,
            color: '#1e40af'
        },
        {
            id: 2,
            name: 'Tech Modern',
            category: 'tech',
            description: 'Perfect for software engineers and developers',
            rating: 4.8,
            downloads: '8.3K',
            atsScore: 96,
            color: '#059669'
        },
        {
            id: 3,
            name: 'Executive Edge',
            category: 'executive',
            description: 'Designed for senior positions and leadership roles',
            rating: 4.9,
            downloads: '5.2K',
            atsScore: 99,
            color: '#7c3aed'
        },
        {
            id: 4,
            name: 'Fresh Start',
            category: 'entry',
            description: 'Great for new graduates and career starters',
            rating: 4.7,
            downloads: '15.1K',
            atsScore: 95,
            color: '#0891b2'
        },
        {
            id: 5,
            name: 'Creative Pro',
            category: 'creative',
            description: 'Stand out while staying ATS-friendly',
            rating: 4.6,
            downloads: '6.8K',
            atsScore: 90,
            color: '#db2777'
        },
        {
            id: 6,
            name: 'Minimalist',
            category: 'professional',
            description: 'Simple, elegant design that lets content shine',
            rating: 4.8,
            downloads: '9.1K',
            atsScore: 99,
            color: '#374151'
        },
        {
            id: 7,
            name: 'Data Scientist',
            category: 'tech',
            description: 'Highlight technical skills and projects',
            rating: 4.7,
            downloads: '4.5K',
            atsScore: 94,
            color: '#0d9488'
        },
        {
            id: 8,
            name: 'Career Changer',
            category: 'entry',
            description: 'Emphasize transferable skills and achievements',
            rating: 4.8,
            downloads: '7.2K',
            atsScore: 96,
            color: '#ea580c'
        }
    ];

    const filteredTemplates = selectedCategory === 'all'
        ? templates
        : templates.filter(t => t.category === selectedCategory);

    const handleDownload = (template) => {
        // Navigate to scanner with pre-selected template
        navigate('/scanner');
    };

    return (
        <div className="templates-page">
            <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />
            <Header onMenuClick={() => setSideMenuOpen(true)} />

            <div className="templates-container">
                <div className="templates-hero">
                    <div className="hero-badge">
                        <FileText className="w-5 h-5" />
                        <span>Resume Templates</span>
                    </div>
                    <h1>ATS-Friendly <span className="text-gradient">Resume Templates</span></h1>
                    <p>Choose from our collection of professionally designed, ATS-optimized templates</p>
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

                {/* Templates Grid */}
                <div className="templates-grid">
                    {filteredTemplates.map(template => (
                        <Card key={template.id} className="template-card">
                            <div
                                className="template-preview"
                                style={{ borderTopColor: template.color }}
                            >
                                <div className="preview-content">
                                    <div className="preview-header" style={{ backgroundColor: template.color }}></div>
                                    <div className="preview-lines">
                                        <div className="line full"></div>
                                        <div className="line short"></div>
                                        <div className="line medium"></div>
                                        <div className="line full"></div>
                                        <div className="line short"></div>
                                    </div>
                                </div>
                                <div className="ats-badge">
                                    <span>{template.atsScore}%</span>
                                    <small>ATS Score</small>
                                </div>
                            </div>

                            <div className="template-info">
                                <h3>{template.name}</h3>
                                <p>{template.description}</p>

                                <div className="template-meta">
                                    <span className="rating">
                                        <Star className="w-4 h-4" fill="#fbbf24" stroke="#fbbf24" />
                                        {template.rating}
                                    </span>
                                    <span className="downloads">
                                        <Download className="w-4 h-4" />
                                        {template.downloads}
                                    </span>
                                </div>

                                <div className="template-actions">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPreviewTemplate(template)}
                                    >
                                        <Eye className="w-4 h-4" />
                                        Preview
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="use-btn"
                                        onClick={() => handleDownload(template)}
                                    >
                                        <Download className="w-4 h-4" />
                                        Use Template
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Why Our Templates Section */}
                <div className="why-section">
                    <h2>Why Use Our Templates?</h2>
                    <div className="why-grid">
                        <div className="why-card">
                            <div className="why-icon" style={{ background: '#dcfce7' }}>
                                <TrendingUp className="w-6 h-6" style={{ color: '#16a34a' }} />
                            </div>
                            <h3>ATS Optimized</h3>
                            <p>All templates are tested with real ATS systems to ensure maximum compatibility</p>
                        </div>
                        <div className="why-card">
                            <div className="why-icon" style={{ background: '#dbeafe' }}>
                                <Users className="w-6 h-6" style={{ color: '#2563eb' }} />
                            </div>
                            <h3>Recruiter Approved</h3>
                            <p>Designed with input from recruiters at top companies</p>
                        </div>
                        <div className="why-card">
                            <div className="why-icon" style={{ background: '#fef3c7' }}>
                                <Heart className="w-6 h-6" style={{ color: '#d97706' }} />
                            </div>
                            <h3>Easy to Customize</h3>
                            <p>Simple to edit and personalize for your specific needs</p>
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
                        <div className="modal-preview" style={{ borderColor: previewTemplate.color }}>
                            <div className="full-preview">
                                <div className="fp-header" style={{ backgroundColor: previewTemplate.color }}>
                                    <span>JOHN DOE</span>
                                </div>
                                <div className="fp-content">
                                    <div className="fp-section">
                                        <h4>Professional Summary</h4>
                                        <div className="fp-line"></div>
                                        <div className="fp-line short"></div>
                                    </div>
                                    <div className="fp-section">
                                        <h4>Experience</h4>
                                        <div className="fp-line"></div>
                                        <div className="fp-line"></div>
                                        <div className="fp-line short"></div>
                                    </div>
                                    <div className="fp-section">
                                        <h4>Skills</h4>
                                        <div className="fp-skills">
                                            <span>Skill 1</span>
                                            <span>Skill 2</span>
                                            <span>Skill 3</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <Button onClick={() => { setPreviewTemplate(null); navigate('/scanner'); }}>
                                <Download className="w-4 h-4" />
                                Use This Template
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResumeTemplates;
