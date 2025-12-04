import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Check, X, TrendingUp, Users, Clock, Target, Search, FileText, Send, ChevronRight } from 'lucide-react';
import BookCallModal from './BookCallModal';
import {
  heroStats,
  targetUsers,
  howItWorksSteps,
  comparisonData,
  pricingPlans,
  faqData,
  aboutContent,
  whyDifferent,
  servicesOffered,
  whyChooseUs,
  testimonials
} from '../mock';

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [animatedStats, setAnimatedStats] = useState({
    jobsThisWeek: 0,
    totalJobsApplied: 0,
    hoursSaved: 0
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    currentRole: '',
    targetRole: '',
    urgency: ''
  });

  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isBookCallModalOpen, setIsBookCallModalOpen] = useState(false);

  // Animate numbers on load
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;

      setAnimatedStats({
        jobsThisWeek: Math.floor(heroStats.jobsThisWeek * progress),
        totalJobsApplied: Math.floor(heroStats.totalJobsApplied * progress),
        hoursSaved: Math.floor(heroStats.hoursSaved * progress)
      });

      if (currentStep >= steps) {
        clearInterval(timer);
        setAnimatedStats(heroStats);
      }
    }, interval);

    return () => clearInterval(timer);
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleUrgencyChange = (value) => {
    setFormData({
      ...formData,
      urgency: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          current_role: formData.currentRole,
          target_role: formData.targetRole,
          urgency: formData.urgency
        }),
      });

      if (response.ok) {
        setFormSubmitted(true);
        setFormData({ name: '', email: '', phone: '', currentRole: '', targetRole: '', urgency: '' });
        setTimeout(() => setFormSubmitted(false), 5000);
      } else {
        console.error('Failed to submit:', await response.text());
        alert('Failed to join waitlist. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to join waitlist. Please try again.');
    }
  };

  // Handle plan selection - redirect to signup/dashboard
  const handlePlanSelect = (planId) => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/signup');
    }
  };

  return (
    <div className="landing-page">
      {/* Navigation Header */}
      <header className="nav-header">
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="nav-logo">
          <img src="/logo.png" alt="Nova Ninjas" className="logo-image" />
          <span className="logo-text">Nova Ninjas</span>
        </button>
        <nav className="nav-links">
          <a href="#how-it-works" className="nav-link">How It Works</a>
          <a href="#pricing" className="nav-link">Pricing</a>
          <a href="#faq" className="nav-link">FAQ</a>
          <a href="#contact" className="nav-link">Contact</a>
        </nav>
        <div className="nav-actions">
          {isAuthenticated ? (
            <>
              <Button variant="secondary" className="btn-secondary" onClick={() => navigate('/dashboard')}>
                Dashboard
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" className="btn-secondary" onClick={() => navigate('/login')}>
                Login
              </Button>
              <Button className="btn-primary" onClick={() => navigate('/signup')}>
                Get Started
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">🥷 Trusted by 500+ Job Seekers</div>
            <h1 className="hero-title">
              Your Personal <span className="hero-highlight">Job Ninja</span> — Fast, Accurate, Human.
            </h1>
            <p className="hero-subtitle">
              Get your own dedicated Ninja — a real human specialist who applies to jobs for you with speed and precision. We use AI to tailor applications, but your Ninja makes every decision and submits every application.
            </p>
            <p className="hero-tagline">Your Ninja. Your Job Search. Your Success.</p>
            <div className="hero-cta">
              <Button className="btn-primary btn-large" onClick={() => navigate(isAuthenticated ? '/dashboard' : '/signup')}>
                {isAuthenticated ? 'Go to Dashboard' : 'Get Started Now'}
              </Button>
              <Button variant="secondary" className="btn-secondary btn-large" onClick={() => setIsBookCallModalOpen(true)}>
                Book Free Consultation
              </Button>
            </div>
          </div>
          <div className="hero-dashboard">
            <Card className="dashboard-card">
              <div className="dashboard-header">
                <h3>Live Dashboard</h3>
                <span className="dashboard-badge">Live</span>
              </div>
              <div className="dashboard-stats">
                <div className="stat-item">
                  <TrendingUp className="stat-icon" />
                  <div className="stat-content">
                    <p className="stat-label">Applied this week</p>
                    <p className="stat-value">{animatedStats.jobsThisWeek}</p>
                  </div>
                </div>
                <div className="stat-item">
                  <Target className="stat-icon" />
                  <div className="stat-content">
                    <p className="stat-label">Total applications</p>
                    <p className="stat-value">{animatedStats.totalJobsApplied.toLocaleString()}</p>
                  </div>
                </div>
                <div className="stat-item">
                  <Clock className="stat-icon" />
                  <div className="stat-content">
                    <p className="stat-label">Hours saved</p>
                    <p className="stat-value">{animatedStats.hoursSaved}h</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Different Section */}
      <section className="section why-different">
        <div className="container">
          <h2 className="section-title">Why <span className="highlight">Ninjas</span> Are Different</h2>
          <p className="section-subtitle">Real humans with AI superpowers — not bots pretending to be human</p>
          <div className="why-different-grid">
            {whyDifferent.map(item => (
              <Card key={item.id} className="why-card">
                <h3 className="why-card-title">{item.title}</h3>
                <p className="why-card-description">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="section services-section">
        <div className="container">
          <div className="services-content">
            <div className="services-text">
              <h2 className="section-title">Your <span className="highlight">Ninja</span> Handles Everything</h2>
              <p className="services-description">
                Your dedicated Job Ninja handles the entire application process — using AI for speed and precision, but making every decision personally. You focus on interviews, your Ninja handles the grind.
              </p>
              <ul className="services-list">
                {servicesOffered.map((service, index) => (
                  <li key={index} className="service-item">
                    <Check className="service-check" />
                    <span>{service}</span>
                  </li>
                ))}
              </ul>
              <Button className="btn-primary" onClick={() => navigate('/signup')}>
                Start Your Journey
              </Button>
            </div>
            <div className="services-image">
              <div className="services-card">
                <div className="services-card-header">What You Get</div>
                <div className="services-card-stat">
                  <span className="stat-big">400-600</span>
                  <span className="stat-desc">Applications per month</span>
                </div>
                <div className="services-card-stat">
                  <span className="stat-big">Daily</span>
                  <span className="stat-desc">Progress updates</span>
                </div>
                <div className="services-card-stat">
                  <span className="stat-big">24/7</span>
                  <span className="stat-desc">Dashboard access</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="section testimonials-section">
        <div className="container">
          <h2 className="section-title">What People Are Saying <span className="highlight">About Us</span></h2>
          <div className="testimonials-grid">
            {testimonials.map(testimonial => (
              <Card key={testimonial.id} className="testimonial-card">
                <div className="testimonial-before-after">
                  <div className="before">
                    <span className="label">Before:</span>
                    <span className="value">{testimonial.before}</span>
                  </div>
                  <div className="after">
                    <span className="label">After:</span>
                    <span className="value">{testimonial.after}</span>
                  </div>
                </div>
                <p className="testimonial-quote">"{testimonial.quote}"</p>
                <div className="testimonial-author">
                  <div className="author-info">
                    <span className="author-name">{testimonial.name}</span>
                    <span className="author-role">{testimonial.role}</span>
                  </div>
                  <div className="rating">
                    {'★'.repeat(testimonial.rating)}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Who We Help Section */}
      <section className="section who-we-help">
        <div className="container">
          <h2 className="section-title">Who we help</h2>
          <div className="user-cards">
            {targetUsers.map(user => (
              <Card key={user.id} className="user-card">
                <Users className="card-icon" />
                <h3 className="card-title">{user.title}</h3>
                <p className="card-description">{user.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="section how-it-works">
        <div className="container">
          <h2 className="section-title">How it works</h2>
          <div className="steps-container">
            {howItWorksSteps.map((step, index) => (
              <div key={step.id} className="step-item">
                <div className="step-number">{step.id}</div>
                <div className="step-content">
                  <h3 className="step-title">{step.title}</h3>
                  <p className="step-description">{step.description}</p>
                </div>
                {index < howItWorksSteps.length - 1 && (
                  <ChevronRight className="step-arrow" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table Section */}
      <section className="section comparison">
        <div className="container">
          <h2 className="section-title">Why we're different</h2>
          <p className="section-subtitle">Human Application Crew vs. Generic AI Bots</p>
          <div className="comparison-table">
            <div className="table-header">
              <div className="header-cell feature-header"></div>
              <div className="header-cell">Nova Ninjas</div>
              <div className="header-cell">AI Bots</div>
            </div>
            {comparisonData.map((row, index) => (
              <div key={index} className="table-row">
                <div className="table-cell feature-cell">{row.feature}</div>
                <div className="table-cell check-cell">
                  {row.novaJobCrew ? <Check className="check-icon" /> : <X className="x-icon" />}
                </div>
                <div className="table-cell check-cell">
                  {row.aiBots ? <Check className="check-icon" /> : <X className="x-icon" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="section pricing">
        <div className="container">
          <div className="pricing-sale-header">
            <span className="sale-tag">🔥 STARTER OFFER - 60% OFF</span>
            <h2 className="section-title">Choose Your Plan</h2>
            <p className="section-subtitle">Limited time offer for new members. Lock in these prices today!</p>
          </div>
          <div className="pricing-grid">
            {pricingPlans.map(plan => (
              <Card key={plan.id} className={`pricing-card ${plan.featured ? 'featured' : ''}`}>
                {/* Badge */}
                <div className={`plan-badge ${plan.featured ? 'featured' : ''}`}>
                  {plan.badge}
                </div>
                
                {/* Discount Badge */}
                <div className="discount-badge">{plan.discount}</div>
                
                <div className="plan-header">
                  <h3 className="plan-name">{plan.name}</h3>
                  
                  {/* Applications - Highlighted */}
                  <div className="plan-applications-highlight">
                    <span className="applications-number-big">{plan.applications}</span>
                    <span className="applications-period-text">{plan.period}</span>
                  </div>
                  
                  {/* Price with strikethrough */}
                  <div className="plan-price-sale">
                    <span className="original-price">{plan.originalPrice}</span>
                    <div className="sale-price-row">
                      <span className="sale-price">{plan.price}</span>
                      <span className="price-subtext">{plan.priceSubtext}</span>
                    </div>
                    <div className="savings-amount">{plan.savings}</div>
                  </div>
                  
                  {/* Urgency */}
                  <div className="spots-urgency">
                    <span className="spots-dot"></span>
                    <span>Only {plan.spotsLeft} spots left!</span>
                  </div>
                  
                  <p className="plan-best-for">{plan.bestFor}</p>
                </div>
                <ul className="plan-features">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="feature-item">
                      <Check className="feature-check" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className={plan.featured ? 'btn-primary w-full pulse-btn' : 'btn-secondary w-full'}
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  Get Started Now
                </Button>
              </Card>
            ))}
          </div>
          <p className="pricing-disclaimer">
            We don't guarantee a job offer, but we eliminate the repetitive grind so you can focus on interviews and skill-building.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="section faq">
        <div className="container">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="faq-accordion">
            {faqData.map(faq => (
              <AccordionItem key={faq.id} value={`item-${faq.id}`}>
                <AccordionTrigger className="faq-question">{faq.question}</AccordionTrigger>
                <AccordionContent className="faq-answer">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* About & Contact Section */}
      <section id="contact" className="section about-contact">
        <div className="container">
          <div className="about-content">
            <h2 className="section-title">{aboutContent.title}</h2>
            <p className="about-story">{aboutContent.story}</p>
          </div>
          <Card className="contact-card">
            <h3 className="contact-title">Join the Waitlist</h3>
            <p className="contact-subtitle">Get early access and priority onboarding</p>
            {formSubmitted ? (
              <div className="form-success">
                <Check className="success-icon" />
                <p>Thank you! We'll be in touch soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="contact-form">
                <div className="form-group">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="form-group">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="john@example.com"
                    required
                  />
                </div>
                <div className="form-group">
                  <Label htmlFor="phone">Mobile Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="form-group">
                  <Label htmlFor="currentRole">Current or Previous Role</Label>
                  <Input
                    id="currentRole"
                    name="currentRole"
                    value={formData.currentRole}
                    onChange={handleInputChange}
                    placeholder="e.g., Software Engineer"
                  />
                </div>
                <div className="form-group">
                  <Label htmlFor="targetRole">Target Role</Label>
                  <Input
                    id="targetRole"
                    name="targetRole"
                    value={formData.targetRole}
                    onChange={handleInputChange}
                    placeholder="e.g., Senior Software Engineer"
                  />
                </div>
                <div className="form-group">
                  <Label htmlFor="urgency">Urgency Level</Label>
                  <Select onValueChange={handleUrgencyChange} value={formData.urgency}>
                    <SelectTrigger id="urgency">
                      <SelectValue placeholder="Select urgency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Exploring options</SelectItem>
                      <SelectItem value="medium">Medium - Actively searching</SelectItem>
                      <SelectItem value="high">High - Need job ASAP</SelectItem>
                      <SelectItem value="urgent">Urgent - Visa/timeline pressure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="btn-primary w-full">
                  <Send className="button-icon" />
                  Join Waitlist
                </Button>
              </form>
            )}
          </Card>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="stats-bar">
        <div className="container">
          <div className="stats-bar-content">
            <div className="stat-box">
              <span className="stat-number">92%</span>
              <span className="stat-text">Success Rate</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">2,850+</span>
              <span className="stat-text">Jobs Applied</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">485+</span>
              <span className="stat-text">Hours Saved</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">500+</span>
              <span className="stat-text">Happy Clients</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <button onClick={() => navigate('/')} className="footer-logo-container">
                <img src="/logo.png" alt="Nova Ninjas" className="footer-logo-image" />
                <h3 className="footer-logo">Nova Ninjas</h3>
              </button>
              <p className="footer-tagline">Human-powered job applications for serious job seekers</p>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4 className="footer-heading">Product</h4>
                <a href="#how-it-works" className="footer-link">How It Works</a>
                <a href="#pricing" className="footer-link">Pricing</a>
                <a href="#faq" className="footer-link">FAQ</a>
              </div>
              <div className="footer-column">
                <h4 className="footer-heading">Company</h4>
                <a href="#contact" className="footer-link">About Us</a>
                <a href="#contact" className="footer-link">Contact</a>
                <a href="#" className="footer-link">Privacy Policy</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 Nova Ninjas. All rights reserved.</p>
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
