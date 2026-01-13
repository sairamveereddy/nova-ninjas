import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronDown,
    Zap,
    List,
    Target,
    Linkedin,
    TrendingUp,
    MessageSquare,
    Mail,
    FileText,
    BookOpen,
    Layout,
    Download,
    Briefcase,
    Users
} from 'lucide-react';
import './MegaMenu.css';

const MegaMenu = () => {
    const navigate = useNavigate();
    const [activeMenu, setActiveMenu] = useState(null);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setActiveMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const menuItems = {
        products: {
            label: 'Products',
            sections: [
                {
                    title: 'Resume Tools',
                    items: [
                        { icon: Zap, label: 'One-Click Optimize', desc: 'Auto-optimize your resume', path: '/one-click-optimize' },
                        { icon: List, label: 'Bullet Points Generator', desc: 'Generate powerful bullet points', path: '/bullet-points' },
                        { icon: Target, label: 'Summary Generator', desc: 'Create professional summaries', path: '/summary-generator' },
                        { icon: FileText, label: 'Resume Scanner', desc: 'Analyze your resume', path: '/scanner' }
                    ]
                },
                {
                    title: 'Cover Letter',
                    items: [
                        { icon: Mail, label: 'ChatGPT Cover Letter', desc: 'AI-powered cover letters', path: '/chatgpt-cover-letter' },
                        { icon: Download, label: 'Cover Letter Templates', desc: 'Free templates to start', path: '/cover-letter-templates' }
                    ]
                },
                {
                    title: 'Career Tools',
                    items: [
                        { icon: TrendingUp, label: 'Career Change Tool', desc: 'Discover your next step', path: '/career-change' },
                        { icon: BookOpen, label: 'Interview Prep', desc: 'Practice with AI', path: '/interview-prep' }
                    ]
                }
            ]
        },
        atsResume: {
            label: 'ATS Resume',
            sections: [
                {
                    title: 'Build & Optimize',
                    items: [
                        { icon: Zap, label: 'One-Click Optimize', desc: 'Instant ATS optimization', path: '/one-click-optimize' },
                        { icon: FileText, label: 'Resume Scanner', desc: 'Score your resume', path: '/scanner' },
                        { icon: MessageSquare, label: 'ChatGPT Resume', desc: 'Write with AI assistance', path: '/chatgpt-resume' }
                    ]
                },
                {
                    title: 'Templates & Examples',
                    items: [
                        { icon: Layout, label: 'Resume Templates', desc: 'ATS-friendly templates', path: '/resume-templates' },
                        { icon: BookOpen, label: 'Resume Examples', desc: 'Browse by industry', path: '/resume-examples' }
                    ]
                }
            ]
        },
        linkedin: {
            label: 'LinkedIn',
            sections: [
                {
                    title: 'Optimization',
                    items: [
                        { icon: Linkedin, label: 'LinkedIn Optimizer', desc: 'Optimize your profile', path: '/linkedin-optimizer' }
                    ]
                },
                {
                    title: 'Examples & Guides',
                    items: [
                        { icon: BookOpen, label: 'LinkedIn Examples', desc: 'Headlines, summaries, about', path: '/linkedin-examples' }
                    ]
                }
            ]
        }
    };

    const handleItemClick = (path) => {
        setActiveMenu(null);
        navigate(path);
    };

    return (
        <nav className="mega-menu" ref={menuRef}>
            {Object.entries(menuItems).map(([key, menu]) => (
                <div key={key} className="menu-item-wrapper">
                    <button
                        className={`menu-trigger ${activeMenu === key ? 'active' : ''}`}
                        onClick={() => setActiveMenu(activeMenu === key ? null : key)}
                    >
                        {menu.label}
                        <ChevronDown className={`w-4 h-4 chevron ${activeMenu === key ? 'rotated' : ''}`} />
                    </button>

                    {activeMenu === key && (
                        <div className="mega-dropdown">
                            <div className="dropdown-content">
                                {menu.sections.map((section, sIndex) => (
                                    <div key={sIndex} className="dropdown-section">
                                        <h4>{section.title}</h4>
                                        <div className="section-items">
                                            {section.items.map((item, iIndex) => (
                                                <button
                                                    key={iIndex}
                                                    className="dropdown-item"
                                                    onClick={() => handleItemClick(item.path)}
                                                >
                                                    <div className="item-icon">
                                                        <item.icon className="w-5 h-5" />
                                                    </div>
                                                    <div className="item-content">
                                                        <span className="item-label">{item.label}</span>
                                                        <span className="item-desc">{item.desc}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ))}

            {/* Direct Navigation Buttons */}
            <button
                className="menu-trigger nav-button"
                onClick={() => navigate('/jobs')}
            >
                <Briefcase className="w-4 h-4" />
                Job Board
            </button>
            <button
                className="menu-trigger nav-button"
                onClick={() => navigate('/human-ninja')}
            >
                <Users className="w-4 h-4" />
                Human Ninjas
            </button>
        </nav>
    );
};

export default MegaMenu;
