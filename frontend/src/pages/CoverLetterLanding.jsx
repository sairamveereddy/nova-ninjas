import React from 'react';
import { useNavigate } from 'react-router-dom';
import Hero from '../components/Landing/Hero';
import FeatureCard from '../components/Landing/FeatureCard';
import StatsSection from '../components/Landing/StatsSection';
import { Mail, Wand2, Clock, Target, FileCheck, Lightbulb } from 'lucide-react';
import '../pages/InterviewPrepLanding.css';

const CoverLetterLanding = () => {
    const navigate = useNavigate();

    const handleTryForFree = () => {
        const token = localStorage.getItem('token');
        if (token) {
            navigate('/dashboard/tools/cover-letter');
        } else {
            navigate('/signup');
        }
    };

    const features = [
        {
            icon: <Wand2 />,
            title: 'AI Generation',
            description: 'Generate personalized cover letters in seconds using advanced AI.'
        },
        {
            icon: <Target />,
            title: 'Job-Specific',
            description: 'Tailored to the exact job description and company culture.'
        },
        {
            icon: <Clock />,
            title: 'Save Time',
            description: 'Create professional cover letters in under 2 minutes.'
        },
        {
            icon: <FileCheck />,
            title: 'Multiple Formats',
            description: 'Download in PDF, DOCX, or copy to clipboard.'
        },
        {
            icon: <Lightbulb />,
            title: 'Smart Suggestions',
            description: 'Get AI-powered tips to make your letter stand out.'
        },
        {
            icon: <Mail />,
            title: 'Professional Tone',
            description: 'Perfectly balanced professional and personable writing.'
        }
    ];

    const stats = [
        { value: '100,000+', label: 'Cover Letters Generated' },
        { value: '3x', label: 'Higher Response Rate' },
        { value: '< 2 min', label: 'Average Creation Time' }
    ];

    return (
        <div className="interview-prep-landing">
            <Hero
                title="Generate Perfect Cover Letters in Seconds"
                subtitle="AI-powered cover letters tailored to any job description. Stand out from the crowd and land more interviews."
                ctaText="Generate Cover Letter"
                ctaAction={handleTryForFree}
                gradient="purple"
                badge="🚀 Instant Generation"
            />

            <section className="features-section">
                <div className="features-container">
                    <h2 className="section-title">Why Choose Our Cover Letter Generator</h2>
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
                    <h2>Ready to Write Your Winning Cover Letter?</h2>
                    <p>Join thousands who've impressed recruiters with JobNinjas</p>
                    <button className="cta-button" onClick={handleTryForFree}>
                        Create Cover Letter - Free
                    </button>
                </div>
            </section>
        </div>
    );
};

export default CoverLetterLanding;
