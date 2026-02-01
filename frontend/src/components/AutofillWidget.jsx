import React, { useState } from 'react';
import './AutofillWidget.css';
import {
    Zap,
    X,
    Plus,
    ChevronRight,
    Settings,
    MessageSquare,
    CheckCircle2,
    FileText,
    Sparkles
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';

import { useNavigate } from 'react-router-dom';

const AutofillWidget = ({ jobTitle, company, companyLogo = "https://logo.clearbit.com/meta.com", matchScore = 56 }) => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [isPillVisible, setIsPillVisible] = useState(true);

    const handleGenerateResume = () => {
        // Simulate taking user to the tool page with the job details
        navigate('/ai-apply', {
            state: {
                jobTitle: jobTitle || "AI/HPC System Performance Engineer",
                company: company || "Meta",
                description: "This is a simulated job description for the " + (jobTitle || "AI/HPC System Performance Engineer") + " role at " + (company || "Meta") + ".",
                sourceUrl: "https://www.linkedin.com/jobs/view/..."
            }
        });
    };

    return (
        <div className={`autofill-widget-wrapper ${isOpen ? 'is-open' : ''}`}>

            {/* Circular Floating Icon - Middle Right (Bird Button) */}
            <div className={`floating-circle-icon ${isOpen ? 'active' : ''}`} onClick={() => setIsOpen(!isOpen)}>
                <img src="/bird.png" alt="jobNinjas" />
                <div className="notification-dot"></div>
            </div>

            {/* Popup Dialog */}
            {isOpen && (
                <div className="widget-popup">
                    <Card className="widget-card shadow-2xl">
                        <div className="widget-header">
                            <div className="header-left">
                                <img src="/ninjasface.png" alt="jobNinjas" className="header-logo" />
                                <span className="header-title">jobNinjas</span>
                            </div>
                            <div className="header-actions">
                                <Button variant="ghost" size="sm" className="p-1 h-auto text-gray-400">
                                    <MessageSquare className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="p-1 h-auto text-gray-400">
                                    <Settings className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="p-1 h-auto" onClick={() => setIsOpen(false)}>
                                    <ChevronRight className="w-5 h-5 text-gray-500" />
                                </Button>
                            </div>
                        </div>

                        <div className="widget-body">
                            {/* Detected Job Section (Image 1 style) */}
                            {jobTitle && company && (
                                <div className="detected-job-preview">
                                    <div className="job-preview-header">
                                        <div className="company-info-small">
                                            <img src={companyLogo} alt={company} className="mini-company-logo" />
                                            <div className="company-text-meta">
                                                <span className="mini-company-name">{company}</span>
                                                <span className="mini-industry">Computer Software</span>
                                            </div>
                                        </div>
                                        <div className="score-badge-mini">
                                            <span className="score-text">{matchScore}%</span>
                                        </div>
                                    </div>
                                    <h4 className="mini-job-title">{jobTitle}</h4>
                                    <p className="mini-posted-time">2 weeks ago</p>

                                    <Button
                                        className="generate-custom-resume-btn"
                                        onClick={handleGenerateResume}
                                    >
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Generate Custom Resume
                                    </Button>

                                    <div className="add-new-job-link">
                                        <Plus className="w-4 h-4" /> Add A New Job
                                    </div>
                                </div>
                            )}

                            {!jobTitle && (
                                <div className="add-job-container">
                                    <div className="add-job-circle">
                                        <Plus className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <p>Add A New Job to Get Job Match Score & Tailor Your Resume</p>
                                </div>
                            )}

                            <Button className="autofill-action-btn">
                                Autofill
                            </Button>

                            <div className="credits-display">
                                <Zap className="w-3 h-3 fill-blue-500 text-blue-500" />
                                <span>2 Remaining Credits</span>
                            </div>

                            <div className="resume-section">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="section-label m-0">Resume</span>
                                    <button className="change-resume-link">Change</button>
                                </div>
                                <div className="resume-selector">
                                    <div className="resume-info">
                                        <FileText className="w-4 h-4 text-gray-500" />
                                        <span className="resume-name truncate max-w-[150px]">Sai_Ram_AI_Developer_Resume...</span>
                                    </div>
                                </div>
                            </div>

                            <div className="completion-section">
                                <div className="completion-labels">
                                    <span>Completion</span>
                                    <span className="completion-pct">0%</span>
                                </div>
                                <Progress value={0} className="completion-progress" />
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default AutofillWidget;
