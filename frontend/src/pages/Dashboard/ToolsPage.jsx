import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Mic, FileText, Mail, Linkedin, Sparkles, Target,
    Briefcase, MessageSquare, ArrowRight
} from 'lucide-react';
import './ToolsPage.css';

const ToolsPage = () => {
    const navigate = useNavigate();

    const tools = [
        {
            icon: <Mic />,
            title: 'Interview Prep',
            description: 'Practice with AI mock interviews and get instant feedback',
            path: '/dashboard/tools/interview-prep',
            color: '#10b981'
        },
        {
            icon: <FileText />,
            title: 'Resume Scanner',
            description: 'Analyze and optimize your resume for ATS systems',
            path: '/dashboard/tools/resume-scanner',
            color: '#3b82f6'
        },
        {
            icon: <Mail />,
            title: 'Cover Letter',
            description: 'Generate personalized cover letters in seconds',
            path: '/dashboard/tools/cover-letter',
            color: '#8b5cf6'
        },
        {
            icon: <Linkedin />,
            title: 'LinkedIn Optimizer',
            description: 'Optimize your LinkedIn profile for recruiters',
            path: '/dashboard/tools/linkedin',
            color: '#0077b5'
        },
        {
            icon: <Sparkles />,
            title: 'AI Resume Builder',
            description: 'Build professional resumes with AI assistance',
            path: '/dashboard/tools/resume-builder',
            color: '#f59e0b'
        },
        {
            icon: <Target />,
            title: 'Job Match',
            description: 'Find jobs that match your skills and experience',
            path: '/dashboard/jobs',
            color: '#ef4444'
        },
        {
            icon: <Briefcase />,
            title: 'AI Apply',
            description: 'Auto-apply to jobs with tailored applications',
            path: '/dashboard/tools/ai-apply',
            color: '#06b6d4'
        },
        {
            icon: <MessageSquare />,
            title: 'Career Coach',
            description: 'Get personalized career advice from AI',
            path: '/dashboard/tools/career-coach',
            color: '#ec4899'
        }
    ];

    return (
        <div className="tools-page">
            <div className="tools-header">
                <h1>AI Tools</h1>
                <p>Powerful AI tools to accelerate your job search</p>
            </div>

            <div className="tools-grid">
                {tools.map((tool, index) => (
                    <div
                        key={index}
                        className="tool-card"
                        onClick={() => navigate(tool.path)}
                    >
                        <div className="tool-icon" style={{ background: tool.color }}>
                            {tool.icon}
                        </div>
                        <div className="tool-content">
                            <h3>{tool.title}</h3>
                            <p>{tool.description}</p>
                        </div>
                        <div className="tool-arrow">
                            <ArrowRight size={20} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ToolsPage;
