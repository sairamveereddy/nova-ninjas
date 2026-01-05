import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Menu,
  Bot, 
  UserCheck, 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Globe, 
  Home, 
  Building2,
  ChevronRight,
  Search,
  Filter,
  FileText,
  ExternalLink,
  X,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { BRAND } from '../config/branding';
import { API_URL } from '../config/api';
import SideMenu from './SideMenu';
import './SideMenu.css';

const Jobs = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [showExternalJDModal, setShowExternalJDModal] = useState(false);
  
  // Jobs data state
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jobStats, setJobStats] = useState({ totalJobs: 0, visaJobs: 0, remoteJobs: 0, highPayJobs: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  
  // Filter states
  const [searchKeyword, setSearchKeyword] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sponsorshipFilter, setSponsorshipFilter] = useState('all');
  const [workTypeFilter, setWorkTypeFilter] = useState('all');

  // External JD form states
  const [externalJobTitle, setExternalJobTitle] = useState('');
  const [externalCompany, setExternalCompany] = useState('');
  const [externalJobDescription, setExternalJobDescription] = useState('');

  // Fetch jobs from API
  const fetchJobs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = `${API_URL}/api/jobs?page=1&limit=50`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.jobs && data.jobs.length > 0) {
        const mappedJobs = data.jobs.map(job => ({
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
        setPagination(data.pagination || { page: 1, limit: 50, total: mappedJobs.length, pages: 1 });
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

  // Fetch job stats
  const fetchJobStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/jobs/stats/summary`);
      const data = await response.json();
      if (data.success) {
        setJobStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching job stats:', error);
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    console.log('Jobs component mounted, fetching jobs...');
    fetchJobs();
    fetchJobStats();
  }, []);

  // Filter jobs locally for location (API doesn't support location filter yet)
  const filteredJobs = jobs.filter(job => {
    // Location filter (local)
    if (locationFilter && !job.location?.toLowerCase().includes(locationFilter.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getWorkTypeIcon = (type) => {
    switch (type) {
      case 'remote': return <Home className="w-3 h-3" />;
      case 'hybrid': return <Building2 className="w-3 h-3" />;
      case 'onsite': return <Briefcase className="w-3 h-3" />;
      default: return <Briefcase className="w-3 h-3" />;
    }
  };

  const handleExternalJDSubmit = () => {
    if (!externalJobTitle || !externalJobDescription) {
      alert('Please provide a job title and job description');
      return;
    }

    // Navigate to AI Apply with external job data
    navigate('/ai-ninja/apply/external', {
      state: {
        isExternal: true,
        jobTitle: externalJobTitle,
        company: externalCompany || 'External Company',
        description: externalJobDescription
      }
    });
  };

  const clearFilters = () => {
    setSearchKeyword('');
    setLocationFilter('');
    setSponsorshipFilter('all');
    setWorkTypeFilter('all');
  };

  const hasActiveFilters = searchKeyword || locationFilter || sponsorshipFilter !== 'all' || workTypeFilter !== 'all';

  return (
    <div className="jobs-page">
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
        <nav className="nav-links">
          <button onClick={() => navigate('/jobs')} className="nav-link nav-link-active">
            <Briefcase className="w-4 h-4" /> Jobs
          </button>
          <button onClick={() => navigate('/ai-ninja')} className="nav-link nav-link-highlight">
            <Bot className="w-4 h-4" /> AI Ninja
          </button>
          <button onClick={() => navigate('/human-ninja')} className="nav-link nav-link-highlight">
            <UserCheck className="w-4 h-4" /> Human Ninja
          </button>
          <button onClick={() => navigate('/pricing')} className="nav-link">Pricing</button>
        </nav>
        <div className="nav-actions">
          {isAuthenticated ? (
            <Button variant="secondary" className="btn-secondary" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
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
      <section className="jobs-hero">
        <div className="container">
          <h1 className="jobs-title">Find Your Next <span className="text-gradient">Opportunity</span></h1>
          <p className="jobs-subtitle">
            Browse visa-friendly, high-paying jobs and apply smarter with AI Ninja.
          </p>
          
          {/* External JD CTA */}
          <div className="external-jd-cta">
            <Button variant="outline" onClick={() => setShowExternalJDModal(true)}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Have a job from another site? Paste the job description
            </Button>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="jobs-filters-section">
        <div className="container">
          <Card className="filters-card">
            <div className="filters-grid">
              <div className="filter-group">
                <Label>Keywords</Label>
                <div className="search-input-wrapper">
                  <Search className="search-icon" />
                  <Input
                    placeholder="Job title, skills, or company..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>
              
              <div className="filter-group">
                <Label>Location</Label>
                <Input
                  placeholder="City, state, or remote..."
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                />
              </div>
              
              <div className="filter-group">
                <Label>Visa Sponsorship</Label>
                <Select value={sponsorshipFilter} onValueChange={setSponsorshipFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All jobs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Jobs</SelectItem>
                    <SelectItem value="visa-friendly">Visa-friendly / Sponsoring</SelectItem>
                    <SelectItem value="no-sponsorship">No Sponsorship Required</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="filter-group">
                <Label>Work Type</Label>
                <Select value={workTypeFilter} onValueChange={setWorkTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="filters-actions">
                <span className="filter-count-text">
                  {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} found
                </span>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" /> Clear filters
                </Button>
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* Job List Section */}
      <section className="job-list-section">
        <div className="container">
          <div className="job-list">
            {filteredJobs.map(job => (
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
                        <Globe className="w-3 h-3" /> {job.visaTags[0]}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="job-description">{job.description}</p>
                <div className="job-card-actions">
                  <Button 
                    className="btn-primary"
                    onClick={() => navigate(`/ai-ninja/jobs/${job.id}`)}
                  >
                    View Job <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {filteredJobs.length === 0 && (
            <div className="no-jobs-found">
              <Filter className="w-12 h-12" />
              <h3>No jobs found</h3>
              <p>Try adjusting your filters or search terms.</p>
              <Button variant="outline" onClick={clearFilters}>Clear all filters</Button>
            </div>
          )}
        </div>
      </section>

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
              <button onClick={() => navigate('/login')} className="footer-link">Login</button>
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

export default Jobs;

