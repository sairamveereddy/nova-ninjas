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
  Settings,
  Plus,
  CheckCircle2,
  ChevronDown,
  Info,
  SlidersHorizontal,
  Check,
  Search,
  X,
  Home,
  Building2,
  Briefcase,
  Loader2,
  RefreshCw,
  Filter
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
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
  const [userProfile, setUserProfile] = useState(null);
  const [recommendedTags, setRecommendedTags] = useState([]);
  const [sortBy, setSortBy] = useState('recommended');

  // Advanced Filter States
  const [selectedJobFunctions, setSelectedJobFunctions] = useState([]);
  const [jobFunctionInput, setJobFunctionInput] = useState('');
  const [selectedExperience, setSelectedExperience] = useState([]);
  const [allLocationsToggle, setAllLocationsToggle] = useState(false);
  const [selectedCities, setSelectedCities] = useState([]);
  const [cityInput, setCityInput] = useState('');
  const [salaryFilter, setSalaryFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [datePostedFilter, setDatePostedFilter] = useState('all');
  const [yearsExperienceFilter, setYearsExperienceFilter] = useState('all');

  // Fetch user profile to get default filters
  const fetchUserProfile = async () => {
    try {
      const storedToken = token || localStorage.getItem('auth_token');
      if (!storedToken) return;

      const response = await fetch(`${API_URL}/api/user/profile`, {
        headers: { 'token': storedToken }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.profile) {
          setUserProfile(data.profile);

          // Set defaults if currently empty
          const targetRole = data.profile.preferences?.target_role || data.profile.targetRole;
          const preferredLocation = data.profile.preferences?.preferred_locations || data.profile.address?.city || data.profile.city;
          const savedJobFunctions = data.profile.preferences?.job_functions || [];

          if (targetRole && !searchKeyword) {
            setSearchKeyword(targetRole);
          }
          if (preferredLocation && !locationFilter) {
            setLocationFilter(preferredLocation);
          }
          if (savedJobFunctions.length > 0 && selectedJobFunctions.length === 0) {
            setSelectedJobFunctions(savedJobFunctions);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching user profile for filters:', err);
    }
  };


  // Fetch jobs from API
  const fetchJobs = async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      let url = `${API_URL}/api/jobs?page=${page}&limit=20&sort=${sortBy}`;

      if (countryFilter && countryFilter !== 'all') {
        url += `&country=${countryFilter}`;
      }

      if (searchKeyword) {
        url += `&search=${encodeURIComponent(searchKeyword)}`;
      }

      if (locationFilter) {
        url += `&location=${encodeURIComponent(locationFilter)}`;
      }

      if (workTypeFilter && workTypeFilter !== 'all') {
        url += `&type=${workTypeFilter}`;
      }

      if (sponsorshipFilter === 'visa-friendly') {
        url += `&visa=true`;
      }

      // Add advanced filters to query
      if (selectedJobFunctions.length > 0) {
        url += `&job_functions=${encodeURIComponent(selectedJobFunctions.join(','))}`;
      }
      if (selectedExperience.length > 0) {
        url += `&experience=${encodeURIComponent(selectedExperience.join(','))}`;
      }
      if (selectedCities.length > 0) {
        url += `&cities=${encodeURIComponent(selectedCities.join(','))}`;
      }
      if (datePostedFilter !== 'all') {
        url += `&date_posted=${datePostedFilter}`;
      }
      if (salaryFilter !== 'all') {
        url += `&salary=${salaryFilter}`;
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
        setPagination(data.pagination || { page: 1, limit: 20, total: jobsArray.length, pages: 1 });
        setError('No jobs found matching your filters');
      }

      if (data.recommendedFilters) {
        setRecommendedTags(data.recommendedFilters);
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
  }, [currentPage, countryFilter, workTypeFilter, sponsorshipFilter, selectedJobFunctions, selectedExperience, selectedCities, datePostedFilter, salaryFilter, sortBy]);

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
  }, [searchKeyword, locationFilter]);

  // Initial fetch for stats and profile
  useEffect(() => {
    fetchJobStats();
    if (isAuthenticated) {
      fetchUserProfile();
    }
  }, [isAuthenticated]);

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
    setCountryFilter('us');
    setSponsorshipFilter('all');
    setWorkTypeFilter('all');
    setSelectedJobFunctions([]);
    setSelectedExperience([]);
    setAllLocationsToggle(false);
    setSelectedCities([]);
    setSalaryFilter('all');
    setIndustryFilter('all');
    setDatePostedFilter('all');
    setCurrentPage(1);
  };

  const saveJobPreferences = async (roles) => {
    try {
      const storedToken = token || localStorage.getItem('auth_token');
      if (!storedToken) return;

      const response = await fetch(`${API_URL}/api/user/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': storedToken
        },
        body: JSON.stringify({
          preferences: {
            ...userProfile?.preferences,
            job_functions: roles
          }
        })
      });

      if (response.ok) {
        console.log('Job preferences saved successfully');
        // Refresh profile state
        fetchUserProfile();
      }
    } catch (err) {
      console.error('Error saving job preferences:', err);
    }
  };

  const toggleJobFunction = (role) => {
    const updated = selectedJobFunctions.includes(role)
      ? selectedJobFunctions.filter(r => r !== role)
      : [...selectedJobFunctions, role];

    setSelectedJobFunctions(updated);
  };

  const handleConfirmJobFunctions = () => {
    saveJobPreferences(selectedJobFunctions);
    fetchJobs(1);
  };

  const hasActiveFilters = searchKeyword || locationFilter || countryFilter !== 'usa' || sponsorshipFilter !== 'all' || workTypeFilter !== 'all';

  const handleAskNova = (job) => {
    setActiveJob(job);
    setIsChatOpen(true);
  };

  return (
    <DashboardLayout activePage="jobs">
      <div className="jobs-page-content p-3 sm:p-4 md:p-6">
        <div className="flex flex-row justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Recommended Jobs</h1>
          <div className="text-sm text-gray-500 flex items-center gap-2">
            Based on your resume profile <span className="font-semibold text-gray-900 ml-1">{pagination.total.toLocaleString()} total</span>
          </div>
        </div>


        {/* Filters Section */}
        <section className="jobs-filters-section mb-6">
          <div className="space-y-3">
            {/* Top Row: Primary Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="rounded-full h-9 px-4 border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 shadow-sm flex items-center gap-2">
                    {countryFilter === 'us' ? 'United States' : 'Canada'}
                    <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="start">
                  {/* ... contents remain same ... */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-bold mb-3">Country</h4>
                      <RadioGroup value={countryFilter} onValueChange={setCountryFilter} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="us" id="us" className="text-primary border-gray-300" />
                          <Label htmlFor="us" className="text-sm font-medium">United States</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="ca" id="ca" className="text-primary border-gray-300" />
                          <Label htmlFor="ca" className="text-sm font-medium">Canada</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold">Location</h4>
                        <div className="flex items-center gap-2">
                          <Checkbox checked={allLocationsToggle} onCheckedChange={setAllLocationsToggle} className="rounded-full" />
                        </div>
                      </div>
                      {!allLocationsToggle && (
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <Input
                            placeholder="Enter City"
                            className="pl-9 h-10 text-sm border-gray-200"
                            value={cityInput}
                            onChange={(e) => setCityInput(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                    <Button size="sm" className="w-full text-xs bg-black text-white" onClick={() => fetchJobs(1)}>Confirm</Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <button className="rounded-full h-9 px-4 border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 shadow-sm flex items-center gap-2">
                    {selectedJobFunctions.length > 0
                      ? `${selectedJobFunctions.length} Roles`
                      : (searchKeyword || 'Job Function')}
                    <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="start">
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a role (e.g. AI Engineer)"
                        className="h-10 text-sm border-gray-200"
                        value={jobFunctionInput}
                        onChange={(e) => setJobFunctionInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && jobFunctionInput.trim()) {
                            toggleJobFunction(jobFunctionInput.trim());
                            setJobFunctionInput('');
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (jobFunctionInput.trim()) {
                            toggleJobFunction(jobFunctionInput.trim());
                            setJobFunctionInput('');
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>

                    {selectedJobFunctions.length > 0 && (
                      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                        {selectedJobFunctions.map(role => (
                          <Badge
                            key={role}
                            variant="secondary"
                            className="bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-1 py-1 px-2"
                          >
                            {role}
                            <X
                              className="w-3 h-3 cursor-pointer"
                              onClick={() => toggleJobFunction(role)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}

                    <Button size="sm" className="w-full text-xs bg-black text-white" onClick={handleConfirmJobFunctions}>
                      Confirm & Save
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <button className="rounded-full h-9 px-4 border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 shadow-sm flex items-center gap-2">
                    {selectedExperience.length > 0 ? selectedExperience[0] : 'Experience Level'}
                    <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4" align="start">
                  <div className="space-y-3">
                    {['Intern', 'Entry', 'Mid', 'Senior', 'Director'].map((level) => (
                      <div key={level} className="flex items-center space-x-3">
                        <Checkbox id={level} checked={selectedExperience.includes(level)} onCheckedChange={() => { }} />
                        <Label htmlFor={level}>{level}</Label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Select value={workTypeFilter} onValueChange={setWorkTypeFilter}>
                <SelectTrigger className="rounded-full h-9 px-4 border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 shadow-sm w-fit gap-2">
                  <SelectValue placeholder="Work Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Type</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sponsorshipFilter} onValueChange={setSponsorshipFilter}>
                <SelectTrigger className="rounded-full h-9 px-4 border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 shadow-sm w-fit gap-2">
                  <SelectValue placeholder="Any Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Status</SelectItem>
                  <SelectItem value="visa-friendly">Visa Friendly</SelectItem>
                </SelectContent>
              </Select>

              <span className="text-gray-300 cursor-pointer hover:text-gray-500 transition-colors">
                <Info className="w-4 h-4" />
              </span>

              <div className="ml-auto">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="rounded-full h-9 px-4 border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 shadow-sm w-fit gap-2">
                    <SelectValue placeholder="Recommended" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recommended">Recommended</SelectItem>
                    <SelectItem value="newest">Newest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bottom Row: Secondary Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={datePostedFilter} onValueChange={setDatePostedFilter}>
                <SelectTrigger className="rounded-full h-9 px-4 border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 shadow-sm w-fit gap-2">
                  <SelectValue placeholder="Any time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any time</SelectItem>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                </SelectContent>
              </Select>

              <Select value={salaryFilter} onValueChange={setSalaryFilter}>
                <SelectTrigger className="rounded-full h-9 px-4 border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 shadow-sm w-fit gap-2">
                  <SelectValue placeholder="Any salary" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any salary</SelectItem>
                  <SelectItem value="100k">$100k+</SelectItem>
                </SelectContent>
              </Select>

              <Select value={industryFilter} onValueChange={setIndustryFilter}>
                <SelectTrigger className="rounded-full h-9 px-4 border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 shadow-sm w-fit gap-2">
                  <SelectValue placeholder="All Industries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                </SelectContent>
              </Select>

              <Select value={yearsExperienceFilter} onValueChange={setYearsExperienceFilter}>
                <SelectTrigger className="rounded-full h-9 px-4 border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 shadow-sm w-fit gap-2">
                  <SelectValue placeholder="Any experience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any experience</SelectItem>
                </SelectContent>
              </Select>

              <Button className="h-9 px-4 rounded-full bg-[#18c991] hover:bg-[#12a678] text-white font-bold flex items-center gap-2 border-0 shadow-sm text-xs">
                <Filter className="w-3.5 h-3.5" /> All Filters
              </Button>

              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-400 hover:text-gray-600 h-9 px-3 text-xs font-medium gap-1">
                <X className="w-3.5 h-3.5" /> Reset Filters
              </Button>
            </div>

            {/* Jobs Found Badge */}
            <div className="mt-2 text-left">
              <span className="inline-block bg-[#8dc5cc] text-white px-4 py-1.5 rounded-full text-[11px] font-bold shadow-sm border border-[#7eb8bf]">
                {pagination.total.toLocaleString()} jobs found
              </span>
            </div>
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
                <div className="job-list space-y-1.5">
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

