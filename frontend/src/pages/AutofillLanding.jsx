import React from 'react';
import { useNavigate } from 'react-router-dom';
import Hero from '../components/Landing/Hero';
import FeatureCard from '../components/Landing/FeatureCard';
import StatsSection from '../components/Landing/StatsSection';
import { Send, MousePointer, ShieldCheck, Zap, History, FileCheck } from 'lucide-react';
import '../pages/InterviewPrepLanding.css';

const AutofillLanding = () => {
    const navigate = useNavigate();

    const handleTryForFree = () => {
        const token = localStorage.getItem('token');
        if (token) {
            navigate('/dashboard/tools/ai-apply');
        } else {
            navigate('/signup');
        }
    };

    const features = [
        {
            icon: <MousePointer />,
            title: '1-Click Apply',
            description: 'Apply to thousands of jobs across top ATS platforms with just a single click.'
        },
        {
            icon: <Zap />,
            title: 'Lightning Speed',
            description: 'Save 20+ hours per week by automating the tedious form-filling process.'
        },
        {
            icon: <FileCheck />,
            title: 'Dynamic Tailoring',
            description: 'AI automatically adjusts your info to match the specific job requirements for every application.'
        },
        {
            icon: <ShieldCheck />,
            title: 'Secure & Private',
            description: 'Your data is encrypted and handled with the highest security standards.'
        },
        {
            icon: <History />,
            title: 'Application Tracking',
            description: 'Keep a central record of every job you apply to, no matter where it was posted.'
        },
        {
            icon: <Send />,
            title: 'Multi-platform',
            description: 'Works with Workday, Greenhouse, Lever, and 50+ other major ATS systems.'
        }
    ];

    const stats = [
        { value: '1M+', label: 'Successful Applications' },
        { value: '25hrs', label: 'Saved Per Week' },
        { value: '98%', label: 'Accuracy Rate' }
    ];

    return (
        <div className="interview-prep-landing">
            <Hero
                title="1-Click to Autofill Millions of Job Applications"
                subtitle="Instantly fill job applications on thousands of ATS platforms with just 1-click. Stop re-typing the same info and start getting more interviews."
                ctaText="Start Autofilling for FREE"
                ctaAction={handleTryForFree}
                gradient="green"
                badge="⚡ Instant Application"
            />

            <section className="features-section">
                <div className="features-container">
                    <h2 className="section-title">The Fastest Way to Apply</h2>
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
                    <h2>Ready to Scale Your Job Search?</h2>
                    <p>Stop wasting time on manual applications and let JobNinjas handle the work</p>
                    <button className="cta-button" onClick={handleTryForFree}>
                        Get Started - It's Free
                    </button>
                </div>
            </section>
        </div>
    );
};

export default AutofillLanding;
