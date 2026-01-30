import React from 'react';
import { useNavigate } from 'react-router-dom';
import Hero from '../components/Landing/Hero';
import FeatureCard from '../components/Landing/FeatureCard';
import StatsSection from '../components/Landing/StatsSection';
import { FileText, Sparkles, Download, CheckCircle, Zap, Shield } from 'lucide-react';
import '../pages/InterviewPrepLanding.css';

const ResumeAILanding = () => {
    const navigate = useNavigate();

    const handleTryForFree = () => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            navigate('/dashboard/tools/resume-scanner');
        } else {
            navigate('/signup');
        }
    };

    const features = [
        {
            icon: <Sparkles />,
            title: 'AI-Powered Optimization',
            description: 'Our AI analyzes your resume and suggests improvements to beat ATS systems.'
        },
        {
            icon: <FileText />,
            title: 'Professional Templates',
            description: 'Choose from dozens of ATS-friendly templates designed by experts.'
        },
        {
            icon: <CheckCircle />,
            title: 'ATS Score',
            description: 'Get an instant ATS compatibility score and fix issues before applying.'
        },
        {
            icon: <Zap />,
            title: 'One-Click Tailoring',
            description: 'Automatically tailor your resume to match any job description.'
        },
        {
            icon: <Download />,
            title: 'Multiple Formats',
            description: 'Download in PDF, DOCX, or plain text format for any application.'
        },
        {
            icon: <Shield />,
            title: 'Privacy First',
            description: 'Your data is encrypted and never shared with third parties.'
        }
    ];

    const stats = [
        { value: '50,000+', label: 'Resumes Created' },
        { value: '85%', label: 'Interview Rate' },
        { value: '4.9/5', label: 'User Rating' }
    ];

    return (
        <div className="interview-prep-landing">
            <Hero
                title="Build ATS-Optimized Resumes in Minutes"
                subtitle="Create professional, AI-powered resumes that get past applicant tracking systems and land you interviews."
                ctaText="Build Resume Free"
                ctaAction={handleTryForFree}
                gradient="blue"
                badge="✨ AI-Powered"
            />

            <section className="features-section">
                <div className="features-container">
                    <h2 className="section-title">Everything You Need for the Perfect Resume</h2>
                    <div className="features-grid">
                        {features.map((feature, index) => (
                            <FeatureCard key={index} {...feature} />
                        ))}
                    </div>
                </div>
            </section>

            <StatsSection stats={stats} />

            <section className="cta-section">
                <div className="cta-container">
                    <h2>Ready to Build Your Perfect Resume?</h2>
                    <p>Join thousands who've landed their dream jobs with JobNinjas</p>
                    <button className="cta-button" onClick={handleTryForFree}>
                        Start Building - It's Free
                    </button>
                </div>
            </section>
        </div>
    );
};

export default ResumeAILanding;
