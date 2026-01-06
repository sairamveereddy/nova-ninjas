import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { 
  Bot, 
  UserCheck, 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Globe, 
  Home, 
  Building2,
  ChevronRight,
  Sparkles,
  FileText,
  MessageSquare,
  Check,
  Menu,
  ExternalLink,
  X,
  Loader2,
  Search,
  Zap
} from 'lucide-react';
import { BRAND, PRODUCTS } from '../config/branding';
import { aiNinjaFAQ } from '../mock';
import { API_URL } from '../config/api';
import SideMenu from './SideMenu';
import Header from './Header';
import './SideMenu.css';

const AINinja = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [activeFilter, setActiveFilter] = useState('all');
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [showExternalJDModal, setShowExternalJDModal] = useState(false);
  const [externalJobTitle, setExternalJobTitle] = useState('');
  const [externalCompany, setExternalCompany] = useState('');
  const [externalJobDescription, setExternalJobDescription] = useState('');
  
  // Jobs state
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch jobs from API
  useEffect(() => {
    const fetchJobs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const url = `${API_URL}/api/jobs?limit=50`;
        console.log('AI Ninja - Fetching jobs from:', url);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('AI Ninja - API Response:', data);
        
        // Handle both response formats: {success, jobs, pagination} OR {jobs, total}
        const jobsArray = data.jobs || [];
        
        if (jobsArray.length > 0) {
          const mappedJobs = jobsArray.map(job => ({
            id: job.id || job._id || job.externalId,
            title: job.title,
            company: job.company,
            location: job.location,
            salaryRange: job.salaryRange || 'Competitive',
            description: job.description,
            type: job.type || 'onsite',
            visaTags: job.visaTags || [],
            categoryTags: job.categoryTags || [],
            highPay: job.highPay || false,
            sourceUrl: job.sourceUrl
          }));
          setJobs(mappedJobs);
          console.log('AI Ninja - Loaded', mappedJobs.length, 'jobs');
        } else {
          setError('No jobs available at the moment');
        }
      } catch (error) {
        console.error('Error fetching jobs:', error);
        setError(`Failed to load jobs: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const handleExternalJDSubmit = () => {
    if (!externalJobTitle || !externalJobDescription) {
      alert('Please provide a job title and job description');
      return;
    }
    navigate('/ai-ninja/apply/external', {
      state: {
        isExternal: true,
        jobTitle: externalJobTitle,
        company: externalCompany || 'External Company',
        description: externalJobDescription
      }
    });
  };

  // Filter jobs based on active filter
  const filteredJobs = jobs.filter(job => {
    switch (activeFilter) {
      case 'high-paying':
        return job.highPay;
      case 'visa-friendly':
        return job.visaTags && job.visaTags.length > 0;
      case 'remote':
        return job.type === 'remote';
      default:
        return true;
    }
  });

  const filters = [
    { id: 'all', label: 'All Jobs', count: jobs.length },
    { id: 'high-paying', label: 'High-paying', count: jobs.filter(j => j.highPay).length },
    { id: 'visa-friendly', label: 'Visa-friendly', count: jobs.filter(j => j.visaTags?.length > 0).length },
    { id: 'remote', label: 'Remote', count: jobs.filter(j => j.type === 'remote').length },
  ];

  const getWorkTypeIcon = (type) => {
    switch (type) {
      case 'remote':
        return <Home className="w-3 h-3" />;
      case 'hybrid':
        return <Building2 className="w-3 h-3" />;
      case 'onsite':
        return <Briefcase className="w-3 h-3" />;
      default:
        return <Briefcase className="w-3 h-3" />;
    }
  };

  return (
    <div className="ai-ninja-page">
      {/* Side Menu */}
      <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />

      {/* Navigation Header */}
      <Header onMenuClick={() => setSideMenuOpen(true)} />

      {/* Hero Section */}
      <section className="ai-ninja-hero">
        <div className="container">
          <div className="hero-badge-premium">
            <Bot className="w-5 h-5" />
            <span>AI Ninja – Self-Serve</span>
          </div>
          <h1 className="ai-ninja-title">
            Apply smarter, <span className="text-gradient">not slower.</span>
          </h1>
          <p className="ai-ninja-subtitle">
            Browse visa-friendly, high-paying roles and use AI Ninja to tailor your resume and cover letter for each job in minutes.
          </p>
          <p className="ai-ninja-description">
            {BRAND.name} AI Ninja helps you skip the copy–paste chaos. Open a job, click "Apply with AI Ninja", 
            upload your base resume, and get a tailored resume, cover letter, and suggested answers for common 
            application questions. You stay in control of final submission – we just give you everything you need, fast.
          </p>

          {/* Resume Scanner CTA - Primary Action */}
          <div className="ai-ninja-cta-buttons" style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button className="btn-primary btn-large" onClick={() => navigate('/scanner')}>
              <Search className="w-5 h-5 mr-2" />
              Resume Scanner – Check Your Match Score
            </Button>
          </div>

          {/* What you get */}
          <div className="ai-ninja-features">
            <div className="feature-item">
              <FileText className="w-5 h-5 text-primary" />
              <span>Tailored Resume</span>
            </div>
            <div className="feature-item">
              <MessageSquare className="w-5 h-5 text-primary" />
              <span>Custom Cover Letter</span>
            </div>
            <div className="feature-item">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>Suggested Q&A Answers</span>
            </div>
          </div>

          {/* External JD CTA */}
          <div className="external-jd-cta" style={{ marginTop: '2rem' }}>
            <Button variant="outline" onClick={() => setShowExternalJDModal(true)}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Have a job from another site? Paste the job description
            </Button>
          </div>
        </div>
      </section>

      {/* Job Board Section */}
      <section className="job-board-section">
        <div className="container">
          <h2 className="section-title">Browse Open Positions</h2>
          
          {/* Filters */}
          <div className="job-filters">
            {filters.map(filter => (
              <button
                key={filter.id}
                className={`filter-btn ${activeFilter === filter.id ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.label}
                <span className="filter-count">{filter.count}</span>
              </button>
            ))}
          </div>

          {/* Job List */}
          <div className="job-list">
            {isLoading && (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-600 mb-4" />
                <p className="text-gray-600">Loading jobs...</p>
              </div>
            )}
            
            {error && !isLoading && (
              <div className="text-center py-12">
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
              </div>
            )}
            
            {!isLoading && !error && filteredJobs.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600">No jobs found matching your filters.</p>
              </div>
            )}
            
            {!isLoading && !error && filteredJobs.map(job => (
              <Card key={job.id} className="job-card">
                <div className="job-card-main">
                  <div className="job-info">
                    <h3 className="job-title">{job.title}</h3>
                    <p className="job-company">{job.company}</p>
                    <div className="job-meta">
                      <span className="job-location">
                        <MapPin className="w-4 h-4" />
                        {job.location}
                      </span>
                      <span className="job-salary">
                        <DollarSign className="w-4 h-4" />
                        {job.salaryRange}
                      </span>
                    </div>
                  </div>
                  <div className="job-tags">
                    <Badge variant="outline" className="work-type-badge">
                      {getWorkTypeIcon(job.type)}
                      {job.type.charAt(0).toUpperCase() + job.type.slice(1)}
                    </Badge>
                    {job.highPay && (
                      <Badge className="tag-high-pay">
                        <DollarSign className="w-3 h-3" /> High-paying
                      </Badge>
                    )}
                    {job.visaTags && job.visaTags.length > 0 && (
                      <Badge className="tag-visa">
                        <Globe className="w-3 h-3" /> Visa-friendly
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="job-description">{job.description}</p>
                <div className="job-card-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/ai-ninja/jobs/${job.id}`)}
                  >
                    View Details <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button 
                    className="btn-primary"
                    onClick={() => navigate('/ai-apply', { 
                      state: { 
                        jobId: job.id,
                        jobTitle: job.title,
                        company: job.company,
                        location: job.location,
                        description: job.description,
                        sourceUrl: job.sourceUrl,
                        salaryRange: job.salaryRange
                      }
                    })}
                  >
                    <Zap className="w-4 h-4 mr-1" /> Apply with AI Ninja
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {filteredJobs.length === 0 && (
            <div className="no-jobs">
              <p>No jobs match your current filters. Try adjusting your selection.</p>
            </div>
          )}
        </div>
      </section>

      {/* Comparison Block */}
      <section className="comparison-section">
        <div className="container">
          <h2 className="section-title">AI Ninja vs Human Ninja</h2>
          <div className="comparison-grid">
            <Card className="comparison-card ai-card">
              <div className="comparison-header">
                <Bot className="w-8 h-8" />
                <h3>AI Ninja (SaaS)</h3>
              </div>
              <ul className="comparison-list">
                <li><Check className="w-4 h-4" /> You browse jobs on {BRAND.name}</li>
                <li><Check className="w-4 h-4" /> AI tailors your resume, cover letter and Q&A</li>
                <li><Check className="w-4 h-4" /> You submit the applications yourself</li>
                <li><Check className="w-4 h-4" /> Best for people who want speed and control</li>
              </ul>
              <Button className="btn-primary w-full" onClick={() => navigate('/pricing')}>
                Start with AI Ninja
              </Button>
            </Card>

            <Card className="comparison-card human-card">
              <div className="comparison-header">
                <UserCheck className="w-8 h-8" />
                <h3>Human Ninja (Service)</h3>
              </div>
              <ul className="comparison-list">
                <li><Check className="w-4 h-4" /> Our team finds and prioritizes roles</li>
                <li><Check className="w-4 h-4" /> Uses AI + human judgment for your applications</li>
                <li><Check className="w-4 h-4" /> We apply for you and keep everything tracked</li>
                <li><Check className="w-4 h-4" /> Best for people with no time or high visa/family pressure</li>
              </ul>
              <Button variant="secondary" className="btn-secondary w-full" onClick={() => navigate('/human-ninja')}>
                Learn About Human Ninja
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <div className="container">
          <h2 className="section-title">AI Ninja FAQ</h2>
          <Accordion type="single" collapsible className="faq-accordion">
            {aiNinjaFAQ.map(faq => (
              <AccordionItem key={faq.id} value={`item-${faq.id}`}>
                <AccordionTrigger className="faq-question">{faq.question}</AccordionTrigger>
                <AccordionContent className="faq-answer">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <button onClick={() => navigate('/')} className="footer-logo-container">
                <img src={BRAND.logoPath} alt={BRAND.logoAlt} className="footer-logo-image" />
                <h3 className="footer-logo">{BRAND.name}</h3>
              </button>
              <p className="footer-tagline">{BRAND.tagline}</p>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4 className="footer-heading">Products</h4>
                <button onClick={() => navigate('/ai-ninja')} className="footer-link">AI Ninja</button>
                <button onClick={() => navigate('/human-ninja')} className="footer-link">Human Ninja</button>
                <button onClick={() => navigate('/pricing')} className="footer-link">Pricing</button>
              </div>
              <div className="footer-column">
                <h4 className="footer-heading">Account</h4>
                <button onClick={() => navigate('/login')} className="footer-link">Login</button>
                <button onClick={() => navigate('/signup')} className="footer-link">Sign Up</button>
                <button onClick={() => navigate('/dashboard')} className="footer-link">Dashboard</button>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>{BRAND.copyright}</p>
          </div>
        </div>
      </footer>

      {/* External JD Modal */}
      {showExternalJDModal && (
        <div className="modal-overlay" onClick={() => setShowExternalJDModal(false)}>
          <Card className="external-jd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FileText className="w-5 h-5" /> Apply with External Job Description</h2>
              <button className="modal-close" onClick={() => setShowExternalJDModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-content">
              <p className="modal-description">
                Found a job on LinkedIn, Indeed, or another site? Paste the job description here 
                and use AI Ninja to generate tailored application materials.
              </p>
              
              <div className="form-group">
                <Label>Job Title *</Label>
                <Input
                  placeholder="e.g., Senior Software Engineer"
                  value={externalJobTitle}
                  onChange={(e) => setExternalJobTitle(e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <Label>Company Name (optional)</Label>
                <Input
                  placeholder="e.g., Google"
                  value={externalCompany}
                  onChange={(e) => setExternalCompany(e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <Label>Job Description *</Label>
                <Textarea
                  placeholder="Paste the full job description here..."
                  value={externalJobDescription}
                  onChange={(e) => setExternalJobDescription(e.target.value)}
                  rows={10}
                />
              </div>
            </div>
            <div className="modal-footer">
              <Button variant="outline" onClick={() => setShowExternalJDModal(false)}>
                Cancel
              </Button>
              <Button 
                className="btn-primary"
                onClick={handleExternalJDSubmit}
                disabled={!externalJobTitle || !externalJobDescription}
              >
                <Bot className="w-4 h-4 mr-2" /> Continue with AI Ninja
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AINinja;


