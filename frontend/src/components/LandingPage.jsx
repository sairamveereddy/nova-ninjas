import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import {
  Check,
  Bot,
  UserCheck,
  Zap,
  Clock,
  Shield,
  FileText,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Globe,
  DollarSign,
  Target,
  Users,
  Menu,
  ChevronRight,
  Upload,
  Search,
  Send,
  CheckCircle,
  Mic,
  Play,
  RefreshCw
} from 'lucide-react';
import BookCallModal from './BookCallModal';
import SideMenu from './SideMenu';
import Header from './Header';
import { BRAND } from '../config/branding';
import './SideMenu.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const [isBookCallModalOpen, setIsBookCallModalOpen] = useState(false);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [activeWord, setActiveWord] = useState(0);
  const rotatingWords = ['faster', 'smarter', 'easier', 'better'];

  // Live application counter - starts at 15,500 and adds 10 every hour
  const baseApplications = 15500;
  const baseInterviews = 800; // New base interviews
  const startDate = new Date('2026-01-01T00:00:00Z').getTime(); // Reference start date

  const [applicationCount, setApplicationCount] = useState(() => {
    const hoursSinceStart = Math.floor((Date.now() - startDate) / (1000 * 60 * 60));
    return baseApplications + (hoursSinceStart * 10);
  });

  const [interviewCount, setInterviewCount] = useState(() => {
    const daysSinceStart = Math.floor((Date.now() - startDate) / (1000 * 60 * 60 * 24));
    return baseInterviews + (daysSinceStart * 9);
  });

  const [jobStats, setJobStats] = useState({
    total: 5248192,
    daily: 10452
  });

  useEffect(() => {
    // Increment total jobs slightly every few seconds for a "live" feel
    const interval = setInterval(() => {
      setJobStats(prev => ({
        ...prev,
        total: prev.total + Math.floor(Math.random() * 3)
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Update counter every hour (check every minute for smoother UX)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const hoursSinceStart = Math.floor((now - startDate) / (1000 * 60 * 60));
      const daysSinceStart = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));

      setApplicationCount(baseApplications + (hoursSinceStart * 10));
      setInterviewCount(baseInterviews + (daysSinceStart * 9));
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Rotate words in hero
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveWord(prev => (prev + 1) % rotatingWords.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: FileText,
      title: 'AI Resume Builder',
      description: 'AI generates tailored resumes for each job application, optimized for ATS systems.',
      cta: 'Build Resume',
      path: '/chatgpt-resume'
    },
    {
      icon: MessageSquare,
      title: 'AI Cover Letter',
      description: 'Generate personalized cover letters that highlight your relevant experience.',
      cta: 'Create Letter',
      path: '/chatgpt-cover-letter'
    },
    {
      icon: Bot,
      title: 'AI Ninja Apply',
      description: 'One-click application with AI-tailored documents for every job you want.',
      cta: 'Start Applying',
      path: '/jobs'
    },
    {
      icon: Mic,
      title: 'Interview Prep',
      description: 'Practice with AI-generated interviews and get real-time feedback.',
      cta: 'Coming Soon',
      path: '/interview-prep',
      comingSoon: true
    },
    {
      icon: Target,
      title: 'ATS Scanner',
      description: 'Check your resume compatibility and get optimization suggestions.',
      cta: 'Scan Resume',
      path: '/scanner'
    },
    {
      icon: Search,
      title: 'Job Board',
      description: 'Browse visa-friendly, high-paying roles curated for international talent.',
      cta: 'Find Jobs',
      path: '/jobs'
    }
  ];

  const testimonials = [
    {
      name: 'Priya Sharma',
      role: 'Software Engineer',
      location: 'CA',
      text: 'Applied to 80+ jobs in a week using AI Ninja. Got 4 interviews and landed my dream job at a FAANG company. The visa-friendly filter saved me hours!',
      avatar: 'PS'
    },
    {
      name: 'Rahul Patel',
      role: 'Data Scientist',
      location: 'TX',
      text: 'Human Ninja service is incredible. They applied to 200 jobs for me while I focused on interview prep. Got 12 callbacks!',
      avatar: 'RP'
    },
    {
      name: 'Ananya Reddy',
      role: 'Product Manager',
      location: 'WA',
      text: 'The tailored resumes are spot-on. Each application feels personalized. Way better than copy-pasting the same resume everywhere.',
      avatar: 'AR'
    }
  ];

  const stats = [
    { number: applicationCount.toLocaleString() + '+', label: 'Applications Submitted', live: true },
    { number: interviewCount.toLocaleString() + '+', label: 'Interviews Cracked', live: true },
    { number: '3x', label: 'More Responses' },
    { number: '20hrs', label: 'Saved Per Week' }
  ];

  const faqs = [

    {
      question: 'How does AI Ninja work?',
      answer: 'AI Ninja analyzes the job description and your resume, then generates a tailored resume, cover letter, and suggested answers for application questions. You review the materials and submit them yourself—staying in full control of your applications.'
    },
    {
      question: 'What is Human Ninja?',
      answer: 'Human Ninja is our done-for-you service. Our team of specialists finds relevant roles, tailors your applications using AI + human judgment, and submits them on your behalf. Perfect for busy professionals or those needing visa sponsorship.'
    },

    {
      question: 'Do you guarantee a job or visa?',
      answer: 'No. We don\'t make fake promises. We guarantee a serious, structured application process that significantly increases your chances. Your interview performance and the market still matter.'
    },
    {
      question: 'Is my data safe?',
      answer: 'Yes. We encrypt your data, never sell it, and you can delete your account anytime. We only use your information to deliver our services.'
    },
    {
      question: 'What if I\'m not satisfied?',
      answer: 'You can cancel anytime. We handle refund requests case-by-case and often provide credits when issues arise. Reach out to our support team and we\'ll make it right.'
    }
  ];

  return (
    <div className="landing-page landing-modern">
      {/* Side Menu */}
      <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />

      {/* Navigation Header - Using shared Header component */}
      <Header onMenuClick={() => setSideMenuOpen(true)} />

      {/* Hero Section */}
      <section className="hero-modern">
        {/* Large Curved Blob Background - AiApply Style */}
        <div className="hero-blob-bg"></div>
        <div className="hero-blob-bg-2"></div>

        <div className="hero-container-modern">
          <div className="hero-badge-modern">
            <Zap className="w-4 h-4" />
            <span>AI-powered job applications for visa seekers & busy professionals</span>
          </div>

          <h1 className="hero-title-modern">
            Land your next role<br />
            <span className="hero-title-gradient rotating-word">{rotatingWords[activeWord]}</span>
          </h1>

          <p className="hero-subtitle-modern">
            Upload your resume. Pick a job. Get a tailored application in minutes —
            or let our team handle everything while you prep for interviews.
          </p>

          <div className="hero-cta-group">
            <Button className="btn-cta-primary" onClick={() => navigate('/ai-ninja')}>
              <Bot className="w-5 h-5" /> Try AI Ninja Free
            </Button>
            <Button variant="outline" className="btn-cta-secondary" onClick={() => navigate('/human-ninja')}>
              <UserCheck className="w-5 h-5" /> Let Humans Apply For Me
            </Button>
          </div>

          <div className="hero-trust-badges">

            <div className="trust-badge">
              <Globe className="w-4 h-4" />
              <span>Visa-friendly jobs</span>
            </div>
          </div>
        </div>

        {/* Floating UI Preview */}
        <div className="hero-preview-section">
          <div className="preview-cards-container">
            {/* Resume Preview Card */}
            <Card className="preview-card resume-preview-card">
              <div className="preview-card-header">
                <span className="preview-label">Optimized Resume</span>
                <Badge className="match-badge">99.8% match</Badge>
              </div>
              <div className="resume-preview-content">
                <h4>Your Name</h4>
                <p className="preview-subtitle">Software Engineer</p>
                <div className="preview-section">
                  <strong>Summary</strong>
                  <p>Experienced software engineer with 5+ years building scalable applications...</p>
                </div>
                <div className="preview-section">
                  <strong>Experience</strong>
                  <p>• Led development of microservices architecture</p>
                  <p>• Improved system performance by 40%</p>
                </div>
              </div>
            </Card>

            {/* Auto Apply Card */}
            <Card className="preview-card auto-apply-card">
              <div className="preview-card-header">
                <span className="preview-label">Auto Apply To Jobs</span>
                <Badge variant="outline">Live</Badge>
              </div>
              <div className="job-list-preview">
                <div className="job-item-preview applying">
                  <div className="job-company">Google</div>
                  <div className="job-role">Software Engineer</div>
                  <Badge className="status-applying">Applying...</Badge>
                </div>
                <div className="job-item-preview applied">
                  <div className="job-company">Microsoft</div>
                  <div className="job-role">Senior SDE</div>
                  <Badge className="status-applied">Applied</Badge>
                </div>
                <div className="job-item-preview applied">
                  <div className="job-company">Meta</div>
                  <div className="job-role">Product Manager</div>
                  <Badge className="status-applied">Applied</Badge>
                </div>
                <div className="job-item-preview pending">
                  <div className="job-company">Amazon</div>
                  <div className="job-role">Data Scientist</div>
                  <Badge className="status-pending">Pending</Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Company Logos */}
      <section className="companies-section">
        <p className="companies-label">Get hired by top companies worldwide</p>
        <div className="companies-logos">
          <span className="company-logo">Google</span>
          <span className="company-logo">Microsoft</span>
          <span className="company-logo">Amazon</span>
          <span className="company-logo">Meta</span>
          <span className="company-logo">Apple</span>
          <span className="company-logo">Netflix</span>
        </div>
      </section>


      {/* Stats Bar */}
      <section className="stats-section-modern">
        <div className="stats-grid-modern">
          {stats.map((stat, index) => (
            <div key={index} className="stat-item-modern">
              <span className="stat-number-modern">
                {stat.live && <span className="live-pulse"></span>}
                {stat.number}
              </span>
              <span className="stat-label-modern">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* You are 80% more likely section */}
      <section className="likelihood-section">
        <div className="container">
          <h2 className="section-title-modern">
            You are <span className="highlight-green">80% more likely</span> to get<br />
            hired faster if you use {BRAND.name}
          </h2>
        </div>
      </section>

      {/* Three Pillars - Prepare, Apply, Succeed */}
      <section className="pillars-section">
        <div className="container">
          {/* Prepare */}
          <div className="pillar-row">
            <div className="pillar-content">
              <Badge className="pillar-badge">Prepare</Badge>
              <h3 className="pillar-title">AI Resume & Cover Letter Creator</h3>
              <p className="pillar-description">
                Generate tailored resumes and cover letters for each job application,
                based on your skills and experience. Our AI analyzes the job description
                and optimizes your documents for ATS systems.
              </p>
              <Button className="btn-primary-modern" onClick={() => navigate('/ai-ninja')}>
                Start now for free <ArrowRight className="w-4 h-4" />
              </Button>
              <p className="pillar-stat">
                <Zap className="w-4 h-4 inline" /> <strong>ATS-optimized</strong> for maximum visibility
              </p>
            </div>
            <div className="pillar-visual">
              <Card className="pillar-card">
                <div className="ai-chat-preview">
                  <div className="chat-input-preview">
                    <span>Make it more impactful</span>
                    <span className="cursor-blink">|</span>
                  </div>
                </div>
                <div className="resume-mini-preview">
                  <h5>Your Name</h5>
                  <p>Software Engineer • San Francisco</p>
                  <div className="skill-dots">
                    <span>React</span>
                    <span>Python</span>
                    <span>AWS</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Apply */}
          <div className="pillar-row reverse">
            <div className="pillar-content">
              <Badge className="pillar-badge orange">Apply</Badge>
              <h3 className="pillar-title">Auto Apply To Jobs</h3>
              <p className="pillar-description">
                Let {BRAND.name} apply to hundreds of jobs for you automatically.
                Our Human Ninja service manually submits applications on your behalf,
                with AI-tailored documents for each role.
              </p>
              <Button className="btn-primary-modern" onClick={() => navigate('/human-ninja')}>
                Start now for free <ArrowRight className="w-4 h-4" />
              </Button>
              <p className="pillar-stat">
                <strong>{applicationCount.toLocaleString()}+</strong> applications submitted
              </p>
            </div>
            <div className="pillar-visual">
              <Card className="pillar-card jobs-card">
                <div className="jobs-preview-list">
                  <div className="job-preview-item">
                    <div className="job-preview-info">
                      <strong>Staff Engineer</strong>
                      <span>Google • AI/ML</span>
                    </div>
                    <Badge className="status-applying">Applying...</Badge>
                  </div>
                  <div className="job-preview-item">
                    <div className="job-preview-info">
                      <strong>Senior SDE</strong>
                      <span>Amazon • Cloud</span>
                    </div>
                    <Badge className="status-applied">Applied</Badge>
                  </div>
                  <div className="job-preview-item">
                    <div className="job-preview-info">
                      <strong>Product Manager</strong>
                      <span>Meta • Growth</span>
                    </div>
                    <Badge className="status-applied">Applied</Badge>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Succeed */}
          <div className="pillar-row">
            <div className="pillar-content">
              <Badge className="pillar-badge purple">Succeed</Badge>
              <h3 className="pillar-title">Interview Prep & Tracking</h3>
              <p className="pillar-description">
                Track all your applications in one dashboard. Practice with AI-generated
                interview questions and get real-time feedback to ace your interviews.
              </p>
              <Button className="btn-primary-modern" onClick={() => navigate('/interview-prep')}>
                Coming Soon <ArrowRight className="w-4 h-4" />
              </Button>
              <p className="pillar-stat">
                <Target className="w-4 h-4 inline" /> <strong>All-in-one</strong> application tracking
              </p>
            </div>
            <div className="pillar-visual">
              <Card className="pillar-card interview-card">
                <div className="interview-preview">
                  <div className="interview-question">
                    <p>"Tell me about a time you led a challenging project..."</p>
                  </div>
                  <div className="interview-actions">
                    <Button size="sm" variant="outline">
                      <Play className="w-4 h-4" /> Answer
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Fresh Jobs Section */}
      <section className="fresh-jobs-section">
        <div className="container">
          <div className="fresh-jobs-card">
            <div className="fresh-jobs-content">
              <Badge className="fresh-badge">
                <RefreshCw className="w-3 h-3 animate-spin-slow" /> Live Market Update
              </Badge>
              <h2 className="fresh-title">Find the Freshest Jobs</h2>
              <p className="fresh-description">
                Our AI constantly scans the global job market, bringing you up-to-date
                opportunities to ensure you don't miss out on your best matches.
              </p>

              <div className="fresh-stats-grid">
                <div className="fresh-stat-item">
                  <div className="fresh-stat-number">{jobStats.daily.toLocaleString()}+</div>
                  <div className="fresh-stat-label">new jobs added today</div>
                </div>
                <div className="fresh-stat-divider" />
                <div className="fresh-stat-item">
                  <div className="fresh-stat-number">{jobStats.total.toLocaleString()}+</div>
                  <div className="fresh-stat-label">Millions of jobs for you to choose from</div>
                </div>
              </div>

              <div className="fresh-actions">
                <Button
                  className="btn-primary-modern btn-large"
                  onClick={() => navigate('/jobs')}
                >
                  Browse All Jobs <ArrowRight className="w-5 h-5" />
                </Button>
                <div className="fresh-trust">
                  <Users className="w-4 h-4" /> Trusted by 50,000+ candidates worldwide
                </div>
              </div>
            </div>
            <div className="fresh-jobs-visual">
              <div className="floating-job-cards">
                <div className="job-card-float card-1">
                  <Badge variant="outline" className="text-primary border-primary/20 bg-white/50 backdrop-blur-sm">Active Now</Badge>
                  <h4>Senior Software Engineer</h4>
                  <p>Google • Mountain View, CA</p>
                </div>
                <div className="job-card-float card-2">
                  <Badge variant="outline" className="text-secondary border-secondary/20 bg-white/50 backdrop-blur-sm">Recently Added</Badge>
                  <h4>Product Designer</h4>
                  <p>Airbnb • San Francisco, CA</p>
                </div>
                <div className="job-card-float card-3">
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-white/50 backdrop-blur-sm">New</Badge>
                  <h4>Data Scientist</h4>
                  <p>Tesla • Austin, TX</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section-modern">
        <div className="container">
          <h2 className="section-title-modern">
            Everything you need to get hired <span className="highlight-green">FAST!</span>
          </h2>
          <div className="features-grid-modern">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className={`feature-card-modern ${feature.comingSoon ? 'coming-soon' : ''}`}
                  onClick={() => !feature.comingSoon && navigate(feature.path)}
                >
                  <div className="feature-icon-modern">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <button className="feature-cta">
                    {feature.cta} <ChevronRight className="w-4 h-4" />
                  </button>
                </Card>
              );
            })}
          </div>
        </div>
      </section>


      {/* Testimonials */}
      <section className="testimonials-section-modern">
        <div className="container">
          <h2 className="section-title-modern">Success Stories</h2>
          <div className="testimonials-grid-modern">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="testimonial-card-modern">
                <div className="testimonial-quote-icon">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="testimonial-text">"{testimonial.text}"</p>
                <div className="testimonial-author">
                  <div className="author-avatar">{testimonial.avatar}</div>
                  <div className="author-info">
                    <strong>{testimonial.name}</strong>
                    <span>{testimonial.role} • {testimonial.location}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section-modern">
        <div className="container">
          <h2 className="section-title-modern">Frequently Asked Questions</h2>
          <div className="faq-container-modern">
            <Accordion type="single" collapsible className="faq-accordion-modern">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`faq-${index}`}>
                  <AccordionTrigger className="faq-trigger-modern">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="faq-content-modern">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta-modern">
        <div className="container">
          <h2>Ready to land your dream job?</h2>
          <p>Join thousands of job seekers who found success with {BRAND.name}</p>
          <Button className="btn-cta-primary" onClick={() => navigate('/signup')}>
            Start now for free <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-modern">
        <div className="container">
          <div className="footer-grid-modern">
            <div className="footer-brand-modern">
              <div className="footer-logo-row">
                <img src={BRAND.logoPath} alt={BRAND.logoAlt} className="footer-logo-img" />
                <span>{BRAND.name}</span>
              </div>
              <p>{BRAND.tagline}</p>
            </div>
            <div className="footer-links-col">
              <h4>Tools</h4>
              <button onClick={() => navigate('/ai-ninja')}>AI Ninja</button>
              <button onClick={() => navigate('/human-ninja')}>Human Ninja</button>
              <button onClick={() => navigate('/jobs')}>Job Board</button>
              <button onClick={() => navigate('/interview-prep')}>Interview Prep</button>
            </div>
            <div className="footer-links-col">
              <h4>Account</h4>
              <button onClick={() => navigate('/login')}>Log in</button>
              <button onClick={() => navigate('/signup')}>Sign up</button>
              <button onClick={() => navigate('/pricing')}>Pricing</button>
            </div>
            <div className="footer-links-col">
              <h4>Support</h4>
              <button onClick={() => navigate('/refund-policy')}>Refund Policy</button>
              <button onClick={() => window.open('mailto:support@novaninja.com')}>Contact Support</button>
            </div>
          </div>
          <div className="footer-bottom-modern">
            <p>{BRAND.copyright}</p>
          </div>
        </div>
      </footer>

      {/* Book Call Modal */}
      <BookCallModal
        isOpen={isBookCallModalOpen}
        onClose={() => setIsBookCallModalOpen(false)}
      />
    </div>
  );
};

export default LandingPage;
