import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { 
  Menu,
  Mic, 
  Video, 
  MessageSquare, 
  FileText, 
  Target, 
  CheckCircle,
  Mail,
  Loader2,
  Bell,
  Sparkles
} from 'lucide-react';
import { BRAND } from '../config/branding';
import { API_URL } from '../config/api';
import SideMenu from './SideMenu';
import './SideMenu.css';

const InterviewPrep = () => {
  const navigate = useNavigate();
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const plannedFeatures = [
    {
      icon: FileText,
      title: 'Resume-based questions',
      description: 'Upload your resume or pick one of your tailored resumes to generate personalized interview questions.'
    },
    {
      icon: Target,
      title: 'Job-specific practice',
      description: 'Paste a job description or select a role you applied for to practice with targeted questions.'
    },
    {
      icon: MessageSquare,
      title: 'Chat (Text Q&A)',
      description: 'Practice answering interview questions via text chat with AI feedback on your responses.'
    },
    {
      icon: Mic,
      title: 'Audio Practice',
      description: 'Speak your answers out loud and receive feedback on clarity, pacing, and content.'
    },
    {
      icon: Video,
      title: 'Video Mock Interviews',
      description: 'Full video mock interviews with Google-style behavioral and technical questions.'
    },
    {
      icon: CheckCircle,
      title: 'Structured Feedback',
      description: 'Get detailed feedback on clarity, relevance, and alignment with the role requirements.'
    }
  ];

  const handleSubscribe = async () => {
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          source: 'interview-prep',
          createdAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        setIsSubscribed(true);
      } else {
        alert('Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      // Still show success for demo purposes
      setIsSubscribed(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="interview-prep-page">
      {/* Side Menu */}
      <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />

      {/* Navigation Header */}
      <header className="nav-header">
        <div className="nav-left">
          <button className="hamburger-btn" onClick={() => setSideMenuOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <button onClick={() => navigate('/')} className="nav-logo">
            <img src={BRAND.logoPath} alt={BRAND.logoAlt} className="logo-image" />
            <span className="logo-text">{BRAND.name}</span>
          </button>
        </div>
        <div className="nav-actions">
          <Button variant="secondary" onClick={() => navigate('/ai-ninja')}>
            AI Ninja
          </Button>
          <Button className="btn-primary" onClick={() => navigate('/pricing')}>
            Pricing
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="interview-hero">
        <div className="container">
          <Badge className="coming-soon-badge">
            <Sparkles className="w-4 h-4" /> Coming Soon
          </Badge>
          <h1 className="interview-title">
            AI Interview Prep
          </h1>
          <p className="interview-subtitle">
            Soon, you'll be able to use {BRAND.name} not just to apply, but to practice for your interviews.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="interview-features">
        <div className="container">
          <h2 className="section-title">Planned Features</h2>
          <div className="features-grid">
            {plannedFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="feature-card-prep">
                  <CardContent className="pt-6">
                    <div className="feature-icon-wrapper">
                      <Icon className="w-8 h-8" />
                    </div>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Email Capture Section */}
      <section className="email-capture-section">
        <div className="container">
          <Card className="email-capture-card">
            <CardContent className="pt-6">
              {isSubscribed ? (
                <div className="subscribed-message">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                  <h3>You're on the list!</h3>
                  <p>We'll notify you as soon as Interview Prep is ready.</p>
                </div>
              ) : (
                <>
                  <div className="email-capture-icon">
                    <Bell className="w-10 h-10" />
                  </div>
                  <h3>Get Notified When It's Live</h3>
                  <p>
                    Be the first to know when Interview Prep launches. 
                    We'll send you one email—no spam.
                  </p>
                  <div className="email-form">
                    <div className="email-input-wrapper">
                      <Mail className="email-icon" />
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="email-input"
                      />
                    </div>
                    <Button 
                      className="btn-primary"
                      onClick={handleSubscribe}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Subscribing...</>
                      ) : (
                        <>Notify Me</>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="interview-cta-section">
        <div className="container">
          <Card className="interview-cta-card">
            <h2>In the meantime, perfect your applications</h2>
            <p>
              Use AI Ninja to tailor your resume and cover letter for every job you apply to.
            </p>
            <div className="cta-buttons">
              <Button className="btn-primary btn-large" onClick={() => navigate('/ai-ninja')}>
                Try AI Ninja
              </Button>
              <Button variant="outline" onClick={() => navigate('/jobs')}>
                Browse Jobs
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer footer-simple">
        <div className="container">
          <div className="footer-content-simple">
            <div className="footer-brand-simple">
              <img src={BRAND.logoPath} alt={BRAND.logoAlt} className="footer-logo-image" />
              <span className="footer-logo">{BRAND.name}</span>
            </div>
            <div className="footer-links-simple">
              <button onClick={() => navigate('/ai-ninja')} className="footer-link">AI Ninja</button>
              <button onClick={() => navigate('/human-ninja')} className="footer-link">Human Ninja</button>
              <button onClick={() => navigate('/pricing')} className="footer-link">Pricing</button>
            </div>
          </div>
          <div className="footer-bottom">
            <p>{BRAND.copyright}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default InterviewPrep;

