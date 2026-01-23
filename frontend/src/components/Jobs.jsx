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
  RefreshCw,
  Zap
} from 'lucide-react';
import { BRAND } from '../config/branding';
import { API_URL } from '../config/api';
import SideMenu from './SideMenu';
import Header from './Header';
import './SideMenu.css';

const Jobs = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  // Jobs data state
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jobStats, setJobStats] = useState({ totalJobs: 0, visaJobs: 0, remoteJobs: 0, highPayJobs: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  // Filter states
  const [searchKeyword, setSearchKeyword] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('usa'); // Default to USA
  const [sponsorshipFilter, setSponsorshipFilter] = useState('all');
  const [workTypeFilter, setWorkTypeFilter] = useState('all');


  // Fetch jobs from API
  const fetchJobs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = `${API_URL}/api/jobs?page=1&limit=50`;
      console.log('Fetching jobs from:', url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

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
        const total = data.total || data.pagination?.total || mappedJobs.length;
        setPagination({ page: 1, limit: 50, total, pages: Math.ceil(total / 50) });
        console.log('Loaded', mappedJobs.length, 'jobs');
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
      // Handle both {success, stats} and direct stats response
      if (data.stats) {
        setJobStats(data.stats);
      } else if (data.totalJobs !== undefined) {
        setJobStats(data);
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

  // Filter jobs locally
  const filteredJobs = jobs.filter(job => {
    // Keyword search filter
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      const matchesKeyword =
        job.title?.toLowerCase().includes(keyword) ||
        job.company?.toLowerCase().includes(keyword) ||
        job.description?.toLowerCase().includes(keyword);
      if (!matchesKeyword) return false;
    }

    // Country filter (USA by default)
    if (countryFilter && countryFilter !== 'all') {
      const location = job.location?.toLowerCase() || '';
      if (countryFilter === 'usa') {
        // Filter for USA: check for US indicators
        const usKeywords = ['usa', 'united states', 'u.s.', 'remote', 'us', ', ca', ', ny', ', tx', ', fl', ', wa'];
        const hasUSIndicator = usKeywords.some(keyword => location.includes(keyword));
        // Also check if location contains any 2-letter state code pattern (e.g., "CA", "NY")
        const statePattern = /\b[a-z]{2}\b/i;
        const hasStateCode = statePattern.test(location);

        // If it doesn't have US keywords or state codes, it's likely not USA
        if (!hasUSIndicator && !hasStateCode) return false;

        // Explicitly exclude common international indicators
        const internationalKeywords = ['uk', 'canada', 'india', 'australia', 'europe', 'asia', 'london', 'toronto', 'berlin', 'paris'];
        const hasInternationalIndicator = internationalKeywords.some(keyword => location.includes(keyword));
        if (hasInternationalIndicator) return false;
      } else if (countryFilter === 'international') {
        // Filter for non-USA jobs
        const usKeywords = ['usa', 'united states', 'u.s.', 'remote us'];
        const hasUSKeyword = usKeywords.some(keyword => location.includes(keyword));
        const statePattern = /\b[a-z]{2}\b/i;
        const hasStateCode = statePattern.test(location);

        // If it has US indicators, exclude it
        if (hasUSKeyword || hasStateCode) {
          // But allow international if explicitly mentioned
          const internationalKeywords = ['uk', 'canada', 'india', 'australia', 'europe', 'asia'];
          const hasInternationalIndicator = internationalKeywords.some(keyword => location.includes(keyword));
          if (!hasInternationalIndicator) return false;
        }
      }
    }

    // Location filter (city/state within selected country)
    if (locationFilter && !job.location?.toLowerCase().includes(locationFilter.toLowerCase())) {
      return false;
    }

    // Visa sponsorship filter
    if (sponsorshipFilter === 'visa-friendly') {
      if (!job.visaTags || job.visaTags.length === 0) return false;
    }

    // Work type filter
    if (workTypeFilter && workTypeFilter !== 'all') {
      if (job.type !== workTypeFilter) return false;
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


  const clearFilters = () => {
    setSearchKeyword('');
    setLocationFilter('');
    setCountryFilter('usa'); // Keep USA as default
    setSponsorshipFilter('all');
    setWorkTypeFilter('all');
  };

  const hasActiveFilters = searchKeyword || locationFilter || countryFilter !== 'usa' || sponsorshipFilter !== 'all' || workTypeFilter !== 'all';

  return (
    <div className="jobs-page">
      {/* Side Menu */}
      <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />

      {/* Navigation Header */}
      <Header onMenuClick={() => setSideMenuOpen(true)} />

      {/* Hero Section */}
      <section className="jobs-hero">
        <div className="container">
          <h1 className="jobs-title">Find Your Next <span className="text-gradient">Opportunity</span></h1>
          <p className="jobs-subtitle">
            Search through 5 Million+ active jobs scanned daily. Apply smarter with AI Ninja.
          </p>
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
                <Label>Country/Region</Label>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="USA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    <SelectItem value="usa">🇺🇸 USA Only</SelectItem>
                    <SelectItem value="international">🌍 International</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="filter-group">
                <Label>City/State</Label>
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
          {/* Loading State */}
          {isLoading && (
            <div className="loading-state">
              <Loader2 className="w-12 h-12 animate-spin" />
              <p>Loading jobs...</p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <h3>Unable to load jobs</h3>
              <p>{error}</p>
              <Button onClick={fetchJobs} className="btn-primary">
                <RefreshCw className="w-4 h-4 mr-2" /> Try Again
              </Button>
            </div>
          )}

          {/* Job List */}
          {!isLoading && !error && (
            <>
              <div className="job-list">
                {filteredJobs.map(job => (
                  <Card key={job.id} className="job-card">
                    <div className="job-card-main">
                      <div className="job-info">
                        <div className="flex items-center gap-2">
                          <h3 className="job-title">{job.title}</h3>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100 text-[10px] py-0 px-1.5 h-4">
                            <RefreshCw className="w-2.5 h-2.5 mr-1" /> Freshly Scanned
                          </Badge>
                        </div>
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
                <div className="no-jobs-found">
                  <Filter className="w-12 h-12" />
                  <h3>No jobs found</h3>
                  <p>Try adjusting your filters or search terms.</p>
                  <Button variant="outline" onClick={clearFilters}>Clear all filters</Button>
                </div>
              )}
            </>
          )}
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
              <button onClick={() => navigate('/refund-policy')} className="footer-link">Refund Policy</button>
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

