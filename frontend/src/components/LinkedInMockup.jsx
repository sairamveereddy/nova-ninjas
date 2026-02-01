import React, { useState } from 'react';
import './LinkedInMockup.css';
import AutofillWidget from './AutofillWidget';
import {
    Search,
    Home,
    Users,
    Briefcase,
    MessageCircle,
    Bell,
    User,
    Grid,
    MoreHorizontal,
    Share2,
    Bookmark,
    ExternalLink,
    MapPin,
    Clock,
    DollarSign,
    Zap,
    Info,
    ChevronDown,
    Building2,
    CheckCircle2
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

const LinkedInMockup = () => {
    return (
        <div className="linkedin-mockup-page">
            {/* LinkedIn Header Simulation */}
            <header className="li-header">
                <div className="li-header-content">
                    <div className="li-header-left">
                        <div className="li-logo">
                            <svg data-test-id="nav-logo" width="34" height="34" viewBox="0 0 34 34" fill="#0a66c2"><g><path d="M34,2.5v29A1.5,1.5,0,0,1,32.5,33H1.5A1.5,1.5,0,0,1,0,31.5V2.5A1.5,1.5,0,0,1,1.5,1H32.5A1.5,1.5,0,0,1,34,2.5ZM10,13H5V29h5ZM7.5,11.1a3,3,0,1,0-3-3A3,3,0,0,0,7.5,11.1ZM29,19a9,9,0,0,0-6-3,7,7,0,0,0-5,2V13H13V29h5V20a3.3,3.3,0,0,1,3-3.3,3.1,3.1,0,0,1,3,3.3V29h5Z"></path></g></svg>
                        </div>
                        <div className="li-search">
                            <Search className="w-5 h-5 text-gray-500" />
                            <input type="text" placeholder="Search" />
                        </div>
                    </div>
                    <nav className="li-nav">
                        <div className="li-nav-item"><Home className="w-6 h-6" /><span>Home</span></div>
                        <div className="li-nav-item"><Users className="w-6 h-6" /><span>My Network</span></div>
                        <div className="li-nav-item active"><Briefcase className="w-6 h-6" /><span>Jobs</span></div>
                        <div className="li-nav-item"><MessageCircle className="w-6 h-6" /><span>Messaging</span></div>
                        <div className="li-nav-item"><Bell className="w-6 h-6" /><span>Notifications</span></div>
                        <div className="li-nav-item user-me">
                            <div className="li-user-avatar"><User className="w-4 h-4" /></div>
                            <span>Me <ChevronDown className="w-3 h-3" /></span>
                        </div>
                        <div className="li-nav-divider"></div>
                        <div className="li-nav-item"><Grid className="w-6 h-6" /><span>For Business <ChevronDown className="w-3 h-3" /></span></div>
                        <div className="li-premium-link">Try Premium Free</div>
                    </nav>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="li-main">
                <div className="li-container">
                    <div className="li-job-card shadow-sm">
                        <div className="li-job-header">
                            <div className="li-company-logo">
                                <img src="https://logo.clearbit.com/meta.com" alt="Meta" />
                            </div>
                            <div className="li-job-title-actions">
                                <div className="li-actions-top">
                                    <div className="company-text">Meta</div>
                                    <div className="actions-btns">
                                        <Share2 className="w-5 h-5 text-gray-500" />
                                        <MoreHorizontal className="w-5 h-5 text-gray-500" />
                                    </div>
                                </div>
                                <h1 className="li-job-title">
                                    AI/HPC System Performance Engineer <CheckCircle2 className="w-5 h-5 text-gray-400 inline" />
                                </h1>
                                <div className="li-job-meta">
                                    <span>Austin, TX</span>
                                    <span className="dot">•</span>
                                    <span>Reposted 2 weeks ago</span>
                                    <span className="dot">•</span>
                                    <span className="text-gray-500">38 people clicked apply</span>
                                </div>
                                <div className="li-promoted">Promoted by hirer • Responses managed off LinkedIn</div>

                                <div className="li-tags">
                                    <Badge variant="outline" className="li-tag"><DollarSign className="w-4 h-4 mr-1" /> $219K/yr - $301K/yr</Badge>
                                    <Badge variant="outline" className="li-tag"><Briefcase className="w-4 h-4 mr-1" /> Full-time</Badge>
                                </div>

                                <div className="li-buttons">
                                    <Button className="li-apply-btn">Apply <ExternalLink className="w-4 h-4 ml-1" /></Button>
                                    <Button variant="outline" className="li-save-btn">Save</Button>
                                </div>
                            </div>
                        </div>

                        {/* ============================================ */}
                        {/* jobNinjas MATCH SCORE WIDGET (Image 3 Mock) */}
                        {/* ============================================ */}
                        <div className="jobninjas-match-widget">
                            <div className="match-widget-content">
                                <div className="match-left">
                                    <h3 className="match-title">Perfect Match Found</h3>
                                    <p className="match-detail">
                                        <span className="bold">11 out of 11</span> keywords are present in your resume!
                                    </p>
                                    <Button className="match-action-btn-blue">
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Tailor Resume Now
                                    </Button>
                                </div>
                                <div className="match-right">
                                    <div className="match-gauge blue-gauge">
                                        <div className="gauge-background"></div>
                                        <div className="gauge-fill" style={{ transform: 'rotate(180deg)', borderColor: '#0066ff' }}></div>
                                        <div className="gauge-center">
                                            <span className="gauge-score">9.8</span>
                                            <span className="gauge-label blue-label">Great <Info className="w-3 h-3 inline" /></span>
                                        </div>
                                        <div className="gauge-pin" style={{ transform: 'rotate(180deg)' }}></div>
                                    </div>
                                </div>
                            </div>
                            <div className="match-footer">
                                <div className="footer-brand">
                                    <img src="/ninjasface.png" alt="Ninja" className="ninja-logo-small" />
                                    <span className="brand-name">jobNinjas</span>
                                </div>
                                <div className="footer-action">
                                    <Zap className="w-4 h-4 text-blue-500 fill-blue-500" />
                                </div>
                            </div>
                        </div>

                        <div className="li-job-section">
                            <h2 className="li-section-title">Job Description</h2>
                            <div className="li-job-description-mock">
                                <p>Meta is a technology company that builds platforms to connect people and foster community growth. They are seeking an AI/HPC System Performance Engineer to lead teams in developing solutions for large scale training systems, ensuring system performance and collaborating across functions to enhance AI network architecture.</p>
                                <Button variant="ghost" className="text-blue-600 p-0 h-auto font-bold mt-2">See more</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Global Autofill Widget - Simulating Automatic Detection */}
            <AutofillWidget
                jobTitle="AI/HPC System Performance Engineer"
                company="Meta"
                companyLogo="https://logo.clearbit.com/meta.com"
                matchScore={98}
            />
        </div>
    );
};

export default LinkedInMockup;
