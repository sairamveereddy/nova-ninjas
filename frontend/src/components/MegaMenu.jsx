import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronDown,
    Sparkles,
    FileSearch,
    Wand2,
    ListChecks,
    FileType,
    Mail,
    Download,
    TrendingUp,
    GraduationCap,
    Linkedin,
    Briefcase,
    Users,
    Scan,
    Zap
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
                        { icon: "/tool-icons/resume-scanner.png", label: 'Resume Scanner', desc: 'ATS score & insights', path: '/scanner', color: '#3b82f6' },
                        { icon: "/tool-icons/one-click-optimize.png", label: 'One-Click Optimize', desc: 'Instant optimization', path: '/one-click-optimize', color: '#8b5cf6' },
                        { icon: "/tool-icons/bullet-points.png", label: 'Bullet Points Generator', desc: 'Impact-driven bullets', path: '/bullet-points', color: '#ec4899' },
                        { icon: "/tool-icons/summary-generator.png", label: 'Summary Generator', desc: 'Professional summaries', path: '/summary-generator', color: '#f59e0b' }
                    ]
                },
                {
                    title: 'Cover Letter',
                    items: [
                        { icon: "/tool-icons/chatgpt-cover-letter.png", label: 'ChatGPT Cover Letter', desc: 'AI-powered letters', path: '/chatgpt-cover-letter', color: '#10b981' },
                        { icon: "/tool-icons/cover-letter-templates.png", label: 'Cover Letter Templates', desc: 'Ready-to-use templates', path: '/cover-letter-templates', color: '#06b6d4' }
                    ]
                },
                {
                    title: 'Career Tools',
                    items: [
                        { icon: "/tool-icons/career-change.png", label: 'Career Change Tool', desc: 'Find your path', path: '/career-change', color: '#6366f1' },
                        { icon: "/tool-icons/interview-prep.png", label: 'Interview Prep', desc: 'AI mock interviews', path: '/interview-prep', color: '#14b8a6' }
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
                        { icon: "/tool-icons/one-click-optimize.png", label: 'One-Click Optimize', desc: 'Instant ATS boost', path: '/one-click-optimize', color: '#8b5cf6' },
                        { icon: "/tool-icons/resume-scanner.png", label: 'Resume Scanner', desc: 'Score your resume', path: '/scanner', color: '#3b82f6' },
                        { icon: "/tool-icons/chatgpt-resume.png", label: 'ChatGPT Resume', desc: 'AI resume writer', path: '/chatgpt-resume', color: '#10b981' }
                    ]
                },
                {
                    title: 'Templates & Examples',
                    items: [
                        { icon: "/tool-icons/resume-templates.png", label: 'Resume Templates', desc: 'ATS-friendly designs', path: '/resume-templates', color: '#f59e0b' },
                        { icon: "/tool-icons/resume-examples.png", label: 'Resume Examples', desc: 'Industry-specific', path: '/resume-examples', color: '#ec4899' }
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
                        { icon: "/tool-icons/linkedin-optimizer.png", label: 'LinkedIn Optimizer', desc: 'Profile optimization', path: '/linkedin-optimizer', color: '#0077b5' }
                    ]
                },
                {
                    title: 'Examples & Guides',
                    items: [
                        { icon: "/tool-icons/linkedin-examples.png", label: 'LinkedIn Examples', desc: 'Headlines & summaries', path: '/linkedin-examples', color: '#06b6d4' }
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
