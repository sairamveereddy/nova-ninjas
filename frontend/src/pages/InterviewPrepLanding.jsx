import React from 'react';
import { useNavigate } from 'react-router-dom';
import Hero from '../components/Landing/Hero';
import FeatureCard from '../components/Landing/FeatureCard';
import StatsSection from '../components/Landing/StatsSection';
import { Mic, MessageSquare, BarChart3, Award, Clock, Target } from 'lucide-react';
import './InterviewPrepLanding.css';

const InterviewPrepLanding = () => {
    const navigate = useNavigate();

    const handleTryForFree = () => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            navigate('/dashboard/tools/interview-prep');
        } else {
            navigate('/signup');
        }
    };

    const features = [
        {
            icon: <Mic />,
            title: 'Voice-Based Practice',
            description: 'Speak your answers naturally with our voice recording feature and get instant transcription.'
        },
        {
            icon: <MessageSquare />,
            title: 'AI-Powered Questions',
            description: 'Get personalized interview questions based on your resume and the job description.'
        },
        {
            icon: <BarChart3 />,
            title: 'Detailed Feedback',
            description: 'Receive comprehensive evaluation reports with scores and actionable improvements.'
        },
        {
            icon: <Award />,
            title: 'STAR Framework',
            description: 'Learn to structure your answers using the proven STAR methodology.'
        },
        {
            icon: <Clock />,
            title: 'Quick Sessions',
            description: 'Complete a full mock interview in under 15 minutes with 5 targeted questions.'
        },
        {
            icon: <Target />,
            title: 'Role-Specific',
            description: 'Questions tailored to your target role and industry for maximum relevance.'
        }
    ];

    const stats = [
        { value: '10,000+', label: 'Mock Interviews Completed' },
        { value: '92%', label: 'Success Rate' },
        { value: '4.8/5', label: 'Average Rating' }
    ];

    return (
        <div className="interview-prep-landing">
            <Hero
                title="Ace Your Interview with AI Mock Interviews"
                subtitle="Practice with voice-based AI interviews, get instant feedback, and land your dream job with confidence."
                ctaText="Start Mock Interview"
                ctaAction={handleTryForFree}
                gradient="green"
                badge="🎤 Voice-Powered Practice"
            />

            <section className="features-section">
                <div className="features-container">
                    <h2 className="section-title">Everything You Need to Succeed</h2>
                    <div className="features-grid">
                        {features.map((feature, index) => (
                            <FeatureCard key={index} {...feature} />
                        ))}
                    </div>
                </div>
            </section>

            <section className="how-it-works">
                <div className="how-it-works-container">
                    <h2 className="section-title">How It Works</h2>
                    <div className="steps-grid">
                        <div className="step-item">
                            <div className="step-number">1</div>
                            <h3>Upload Resume & Job Description</h3>
                            <p>Provide your resume and the job description you're applying for.</p>
                        </div>
                        <div className="step-item">
                            <div className="step-number">2</div>
                            <h3>Answer Voice Questions</h3>
                            <p>Speak your answers naturally - our AI transcribes and analyzes them.</p>
                        </div>
                        <div className="step-item">
                            <div className="step-number">3</div>
                            <h3>Get Instant Feedback</h3>
                            <p>Receive detailed evaluation with scores and improvement suggestions.</p>
                        </div>
                    </div>
                </div>
            </section>

            <StatsSection stats={stats} />

            <section className="cta-section">
                <div className="cta-container">
                    <h2>Ready to Ace Your Next Interview?</h2>
                    <p>Join thousands of job seekers who've improved their interview skills with JobNinjas</p>
                    <button className="cta-button" onClick={handleTryForFree}>
                        Start Mock Interview - It's Free
                    </button>
                </div>
            </section>
        </div>
    );
};

export default InterviewPrepLanding;
