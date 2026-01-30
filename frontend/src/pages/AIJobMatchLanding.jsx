import React from 'react';
import { useNavigate } from 'react-router-dom';
import Hero from '../components/Landing/Hero';
import FeatureCard from '../components/Landing/FeatureCard';
import StatsSection from '../components/Landing/StatsSection';
import { Target, Search, Sparkles, Filter, Briefcase, TrendingUp } from 'lucide-react';
import '../pages/InterviewPrepLanding.css';

const AIJobMatchLanding = () => {
    const navigate = useNavigate();

    const handleTryForFree = () => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            navigate('/dashboard/jobs');
        } else {
            navigate('/signup');
        }
    };

    const features = [
        {
            icon: <Sparkles />,
            title: 'AI Copilot',
            description: 'Your personal career agent that finds and recommends jobs while you sleep.'
        },
        {
            icon: <Filter />,
            title: 'H1B / Visa Filter',
            description: 'The most comprehensive filters for visa-friendly roles in the industry.'
        },
        {
            icon: <Target />,
            title: 'Match Scores',
            description: 'Know exactly how well you fit a role before you even click apply.'
        },
        {
            icon: <Search />,
            title: 'Smart Search',
            description: 'Go beyond keywords with semantic search that understands your experience.'
        },
        {
            icon: <Briefcase />,
            title: 'Market Insights',
            description: 'Real-time data on salary ranges, competition levels, and hiring trends.'
        },
        {
            icon: <TrendingUp />,
            title: 'Daily Recommendations',
            description: 'Fresh, personalized job alerts delivered daily based on your preferences.'
        }
    ];

    const stats = [
        { value: '2M+', label: 'Available Jobs' },
        { value: '500+', label: 'Visa-Sponsoring Firms' },
        { value: '3x', label: 'More Interviews' }
    ];

    return (
        <div className="interview-prep-landing">
            <Hero
                title="Your AI Copilot to Find The Perfect Job"
                subtitle="Get matched with H1B-friendly jobs, high-paying roles, and perfect matches in less than 1 minute. No more solo job hunting."
                ctaText="Find My Matches"
                ctaAction={handleTryForFree}
                gradient="purple"
                badge="🤖 AI Job Search"
            />

            <section className="features-section">
                <div className="features-container">
                    <h2 className="section-title">Job Hunting, Upgraded</h2>
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
                    <h2>Stop Scrolling, Start Landing Interviews</h2>
                    <p>Let our AI find the needles in the haystack for you.</p>
                    <button className="cta-button" onClick={handleTryForFree}>
                        Find Jobs Now - It's Free
                    </button>
                </div>
            </section>
        </div>
    );
};

export default AIJobMatchLanding;
