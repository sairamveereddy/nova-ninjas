import React from 'react';
import { useNavigate } from 'react-router-dom';
import Hero from '../components/Landing/Hero';
import FeatureCard from '../components/Landing/FeatureCard';
import StatsSection from '../components/Landing/StatsSection';
import { Linkedin, Compass, Search, UserCheck, Zap, BarChart } from 'lucide-react';
import '../pages/InterviewPrepLanding.css';

const LinkedInLanding = () => {
    const navigate = useNavigate();

    const handleTryForFree = () => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            navigate('/dashboard/tools/linkedin');
        } else {
            navigate('/signup');
        }
    };

    const features = [
        {
            icon: <Linkedin />,
            title: 'Profile Optimization',
            description: 'AI-driven suggestions to make your profile stand out to recruiters and hiring managers.'
        },
        {
            icon: <Compass />,
            title: 'Headline Generator',
            description: 'Create impactful headlines that clearly communicate your value proposition.'
        },
        {
            icon: <UserCheck />,
            title: 'Recruiter View',
            description: 'Optimize your profile for the "Recruiter Search" algorithm to get more inbound leads.'
        },
        {
            icon: <Zap />,
            title: 'About Section',
            description: 'Generate compelling professional summaries that tell your unique story.'
        },
        {
            icon: <Search />,
            title: 'Keyword Strategy',
            description: 'Identify and integrate the high-intent keywords that recruiters actually search for.'
        },
        {
            icon: <BarChart />,
            title: 'Profile Scoring',
            description: 'Get an instant score for your current profile with a roadmap on how to improve it.'
        }
    ];

    const stats = [
        { value: '25,000+', label: 'Profiles Optimized' },
        { value: '4x', label: 'More Recruiter Views' },
        { value: '4.9/5', label: 'Satisfaction Score' }
    ];

    return (
        <div className="interview-prep-landing">
            <Hero
                title="Optimize Your LinkedIn Profile for 10x More Views"
                subtitle="Stop being invisible. Use AI to transform your LinkedIn into a recruiter magnet and land more interviews from inbound leads."
                ctaText="Optimize My Profile"
                ctaAction={handleTryForFree}
                gradient="blue"
                badge="💼 Recruiter Magnet"
            />

            <section className="features-section">
                <div className="features-container">
                    <h2 className="section-title">Stand Out in the LinkedIn Feed</h2>
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
                    <h2>Ready to Attract Your Next Big Opportunity?</h2>
                    <p>Join thousands of professionals who've unlocked LinkedIn with JobNinjas</p>
                    <button className="cta-button" onClick={handleTryForFree}>
                        Get Started - It's Free
                    </button>
                </div>
            </section>
        </div>
    );
};

export default LinkedInLanding;
