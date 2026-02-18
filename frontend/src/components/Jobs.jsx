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
import JobCardOrion from './JobCardOrion';
import DashboardLayout from './DashboardLayout';
import './SideMenu.css';

const Jobs = () => {
  const navigate = useNavigate();
  const { isAuthenticated, token } = useAuth();
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  // Nova Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeJob, setActiveJob] = useState(null);

  // Jobs data state
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jobStats, setJobStats] = useState({ totalJobs: 0, visaJobs: 0, remoteJobs: 0, highPayJobs: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  // Filter states
  const [searchKeyword, setSearchKeyword] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('us');
  const [sponsorshipFilter, setSponsorshipFilter] = useState('all');
  const [workTypeFilter, setWorkTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);


  // Fetch jobs from API
  const fetchJobs = async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      let url = `${API_URL}/api/jobs?page=${page}&limit=20`;

      if (countryFilter && countryFilter !== 'all') {
        url += `&country=${countryFilter}`;
      }

      if (searchKeyword) {
        url += `&search=${encodeURIComponent(searchKeyword)}`;
      }

      if (workTypeFilter && workTypeFilter !== 'all') {
        url += `&type=${workTypeFilter}`;
      }

      if (sponsorshipFilter === 'visa-friendly') {
        url += `&visa=true`;
      }

      console.log('Fetching jobs from:', url);

      const headers = {};
      // Add token for personalized match scores
      if (token) {
        headers['token'] = token;
      } else {
        const storedToken = localStorage.getItem('auth_token');
        if (storedToken) headers['token'] = storedToken;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

      const jobsArray = data.jobs || [];

      if (jobsArray.length > 0) {
        const mappedJobs = jobsArray.map(job => ({
          id: job.id || job._id || job.externalId,
          title: job.title,
          company: job.company,
          location: job.location,
          salaryRange: job.salaryRange || job.salary || 'Competitive',
          description: job.description,
          type: job.type || 'onsite',
          visaTags: job.visaTags || [],
          categoryTags: job.categoryTags || [],
          highPay: job.highPay || false,
          matchScore: job.matchScore || 0,
          sourceUrl: job.sourceUrl || job.url
        }));
        setJobs(mappedJobs);

        if (data.pagination) {
          setPagination(data.pagination);
        } else {
          const total = data.total || mappedJobs.length;
          setPagination({
            page: page,
            limit: 20,
            total,
            pages: Math.ceil(total / 20)
          });
        }
        console.log('Loaded', mappedJobs.length, 'jobs');
      } else {
        setJobs([]);
        setPagination({ page: 1, limit: 20, total: 0, pages: 0 });
        setError('No jobs found matching your filters');
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
  // Fetch jobs when filters or page change
  useEffect(() => {
    fetchJobs(currentPage);
  }, [currentPage, countryFilter, workTypeFilter, sponsorshipFilter]);

  // Debounced keyword search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchJobs(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // Initial fetch for stats only
  useEffect(() => {
    fetchJobStats();
  }, []);

  // Filter jobs locally
  // Jobs are now filtered on the server
  const displayJobs = jobs;

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
    setCountryFilter('usa');
    setSponsorshipFilter('all');
    setWorkTypeFilter('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchKeyword || locationFilter || countryFilter !== 'usa' || sponsorshipFilter !== 'all' || workTypeFilter !== 'all';

  const handleAskNova = (job) => {
    setActiveJob(job);
    setIsChatOpen(true);
  };

  return (
    <DashboardLayout activePage="jobs">
      <div className="jobs-page-content p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Recommended Jobs</h1>
          <div className="text-sm text-gray-500">
            Based on your resume profile
          </div>
        </div>

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
                  <Select value="us" disabled>
                    <SelectTrigger>
                      <SelectValue placeholder="🇺🇸 USA Only" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us">🇺🇸 USA Only</SelectItem>
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
                    {pagination.total.toLocaleString()} job{pagination.total !== 1 ? 's' : ''} found
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
                <div className="job-list space-y-4">
                  {displayJobs.map(job => (
                    <JobCardOrion key={job.id} job={job} onAskNova={handleAskNova} />
                  ))}
                </div>

                {displayJobs.length === 0 && (
                  <div className="no-jobs-found">
                    <Filter className="w-12 h-12" />
                    <h3>No jobs found</h3>
                    <p>Try adjusting your filters or search terms.</p>
                    <Button variant="outline" onClick={clearFilters}>Clear all filters</Button>
                  </div>
                )}

                {pagination.pages > 1 && (
                  <div className="pagination-controls flex items-center justify-center gap-4 mt-12 pb-12">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentPage(prev => Math.max(1, prev - 1));
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm font-medium">
                      Page {currentPage} of {pagination.pages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentPage(prev => Math.min(pagination.pages, prev + 1));
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      disabled={currentPage === pagination.pages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

      </div>
    </DashboardLayout>
  );
};

export default Jobs;

