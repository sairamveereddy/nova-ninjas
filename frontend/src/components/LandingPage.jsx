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
  FileText,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Target,
  Users,
  Menu,
  ChevronRight,
  Search,
  Mic,
  Play,
  RefreshCw,
  Linkedin,
  Instagram,
  Send
} from 'lucide-react';
import BookCallModal from './BookCallModal';
import SideMenu from './SideMenu';
import Header from './Header';
import { BRAND } from '../config/branding';
import BrandLogo from './BrandLogo';
import './SideMenu.css';
import '../LandingPage.css';
import { SocialTooltip } from './ui/SocialTooltip';

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const [isBookCallModalOpen, setIsBookCallModalOpen] = useState(false);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [activeWord, setActiveWord] = useState(0);
  const rotatingWords = ['faster', 'smarter', 'easier', 'better'];

  // Social Media Links
  const socialLinks = [
    {
      href: "https://www.linkedin.com/company/110213459/",
      ariaLabel: "LinkedIn",
      tooltip: "Follow on LinkedIn",
      color: "#0077b5",
      icon: Linkedin,
    },
    {
      href: "https://www.instagram.com/jobninjas_org",
      ariaLabel: "Instagram",
      tooltip: "Follow on Instagram",
      color: "#E1306C",
      icon: Instagram,
    },
    {
      href: "https://t.me/jobNinjas",
      ariaLabel: "Telegram",
      tooltip: "Join Telegram Channel",
      color: "#0088cc",
      icon: Send,
    },
    {
      href: "https://www.producthunt.com/products/jobninjas",
      ariaLabel: "Product Hunt",
      tooltip: "Support on Product Hunt",
      color: "#DA552F",
      icon: Target, // Analyzing icon as proxy for Product Hunt
    },
  ];

  // Live application counter - starts at 15,500 and adds 10 every hour
  const baseApplications = 5550;
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
    total: 1000000,
    daily: 1000
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

  const toolCards = [
    {
      title: "Interview Prep",
      description: "Practice with AI and get real-time feedback.",
      path: "/landing/interview-prep",
      buttonText: "Practice Now",
      color: "teal"
    },
    {
      title: "Resume AI",
      description: "ATS-optimized resumes in seconds.",
      path: "/landing/resume-ai",
      buttonText: "Build Resume",
      color: "green"
    },
    {
      title: "Cover Letter",
      description: "Write tailored cover letters for any job.",
      path: "/landing/cover-letter",
      buttonText: "Create Letter",
      color: "blue"
    },
    {
      title: "AI Job Match",
      description: "Find H1B-friendly jobs matched to your profile.",
      path: "/landing/ai-job-match",
      buttonText: "Find Matches",
      color: "purple"
    },
    {
      title: "LinkedIn Optimizer",
      description: "Transform your profile into a recruiter magnet.",
      path: "/landing/linkedin",
      buttonText: "Optimize Now",
      color: "indigo"
    },
    {
      title: "Job Autofill",
      description: "1-Click apply to thousands of jobs.",
      path: "/landing/autofill",
      buttonText: "Start Applying",
      color: "orange"
    }
  ];

  return (
    <div className="landing-page landing-modern">
      {/* Side Menu */}
      <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />

      {/* Navigation Header */}
      <Header onMenuClick={() => setSideMenuOpen(true)} />

      {/* Hero Section */}
      <section className="hero-modern min-h-[80vh] flex items-center">
        <div className="hero-blob-bg"></div>
        <div className="hero-blob-bg-2"></div>

        <div className="hero-container-modern px-4 lg:px-0">
          <div className="hero-content-wrapper max-w-4xl mx-auto text-center">
            <div className="hero-badge-modern mx-auto mb-6">
              <Zap className="w-4 h-4" />
              <span>AI Job Search Copilot for Visa Seekers</span>
            </div>

            <h1 className="hero-title-modern text-5xl lg:text-7xl mb-6">
              No More Solo<br />
              <span className="hero-title-gradient">Job Hunting.</span>
            </h1>

            <p className="hero-subtitle-modern text-xl lg:text-2xl mb-10 max-w-2xl mx-auto">
              Land your dream job with an AI copilot that finds jobs, builds resumes, and prepares you for interviews.
            </p>

            <div className="hero-cta-group justify-center gap-6">
              <Button className="btn-cta-primary px-10 py-6 text-lg" onClick={() => navigate('/signup')}>
                Get Started for Free
              </Button>
            </div>

            <p className="text-gray-500 mt-6 font-medium">
              No credit card required • Join 50,000+ candidates
            </p>
          </div>
        </div>
      </section>

      {/* Main Tool Grid Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">The Ultimate AI Job Search Toolkit</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {toolCards.map((tool, index) => (
              <Card key={index} className="p-8 hover:shadow-2xl transition-all duration-300 border-gray-100 group">
                <div className={`w-12 h-12 rounded-xl bg-${tool.color}-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <Zap className={`w-6 h-6 text-${tool.color}-600`} />
                </div>
                <h3 className="text-2xl font-bold mb-3">{tool.title}</h3>
                <p className="text-gray-600 mb-8 h-12">{tool.description}</p>
                <Button
                  variant="outline"
                  className="w-full py-4 text-base hover:bg-black hover:text-white transition-colors"
                  onClick={() => navigate(tool.path)}
                >
                  {tool.buttonText} <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Simpler Stats Section */}
      <section className="stats-section-modern py-20 bg-gray-50 border-y border-gray-100">
        <div className="stats-grid-modern container mx-auto px-4 flex justify-around">
          {stats.slice(0, 3).map((stat, index) => (
            <div key={index} className="stat-item-modern">
              <span className="stat-number-modern text-4xl font-bold">{stat.number}</span>
              <span className="stat-label-modern text-gray-500 mt-2">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>


      {/* Final CTA Section */}
      <section className="final-cta-modern py-24 bg-black text-white text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-5xl font-bold mb-8">Ready to land your dream job?</h2>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">Join thousands of job seekers who found success with {BRAND.name}'s AI toolkit.</p>
          <Button className="btn-cta-primary px-12 py-8 text-xl" onClick={() => navigate('/signup')}>
            Build My Career Copilot <ArrowRight className="ml-3 w-6 h-6" />
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
                <span className="footer-logo-text font-bold text-xl">{BRAND.name}</span>
              </div>
              <p>{BRAND.tagline}</p>

              {/* Social Media Buttons */}
              <div className="mt-6">
                <SocialTooltip items={socialLinks} className="justify-start" />
              </div>
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
              <button onClick={() => navigate('/contact')}>Contact Us</button>
              <button onClick={() => window.open('mailto:veereddy@jobninjas.org')}>Contact Support</button>
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
