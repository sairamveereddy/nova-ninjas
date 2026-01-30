import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
    MapPin,
    DollarSign,
    Globe,
    Briefcase,
    Search,
    X,
    Loader2,
    RefreshCw,
    Zap,
    ChevronRight,
    Filter,
    Building2,
    Home
} from 'lucide-react';
import { API_URL } from '../../config/api';

const JobsPage = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    // Jobs data state
    const [jobs, setJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

    // Filter states
    const [searchKeyword, setSearchKeyword] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [countryFilter, setCountryFilter] = useState('usa');
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

            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            const jobsArray = data.jobs || [];

            if (jobsArray.length > 0) {
                setJobs(jobsArray.map(job => ({
                    id: job.id || job._id || job.externalId,
                    title: job.title,
                    company: job.company,
                    location: job.location,
                    salaryRange: job.salaryRange || job.salary || 'Competitive',
                    description: job.description,
                    type: job.type || 'onsite',
                    visaTags: job.visaTags || [],
                    highPay: job.highPay || false,
                    sourceUrl: job.sourceUrl || job.url
                })));

                if (data.pagination) {
                    setPagination(data.pagination);
                } else {
                    const total = data.total || jobsArray.length;
                    setPagination({ page, limit: 20, total, pages: Math.ceil(total / 20) });
                }
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

    useEffect(() => {
        fetchJobs(currentPage);
    }, [currentPage, countryFilter, workTypeFilter, sponsorshipFilter]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchKeyword]);

    const clearFilters = () => {
        setSearchKeyword('');
        setLocationFilter('');
        setCountryFilter('usa');
        setSponsorshipFilter('all');
        setWorkTypeFilter('all');
        setCurrentPage(1);
    };

    const getWorkTypeIcon = (type) => {
        switch (type) {
            case 'remote': return <Home className="w-3 h-3" />;
            case 'hybrid': return <Building2 className="w-3 h-3" />;
            default: return <Briefcase className="w-3 h-3" />;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Recommended Jobs</h1>
                <p className="text-gray-500 mt-2">Find and apply to the best roles matched to your profile.</p>
            </div>

            {/* Filters */}
            <Card className="p-6 mb-8 border-none shadow-sm bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase text-gray-500">Keywords</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <Input
                                className="pl-10"
                                placeholder="Job title, skills..."
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase text-gray-500">Country</Label>
                        <Select value={countryFilter} onValueChange={setCountryFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="USA" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Countries</SelectItem>
                                <SelectItem value="usa">🇺🇸 USA</SelectItem>
                                <SelectItem value="gb">🇬🇧 UK</SelectItem>
                                <SelectItem value="ca">🇨🇦 Canada</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase text-gray-500">Sponsorship</Label>
                        <Select value={sponsorshipFilter} onValueChange={setSponsorshipFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="All" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="visa-friendly">Visa Sponsoring</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase text-gray-500">Work Type</Label>
                        <Select value={workTypeFilter} onValueChange={setWorkTypeFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="All" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="remote">Remote</SelectItem>
                                <SelectItem value="hybrid">Hybrid</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-end">
                        <Button variant="ghost" className="w-full text-gray-500" onClick={clearFilters}>
                            Clear All
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Results */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-green-600 mb-4" />
                    <p className="text-gray-500">Scaning the market for you...</p>
                </div>
            ) : error ? (
                <div className="text-center py-20 bg-white rounded-xl">
                    <p className="text-red-500 mb-4">{error}</p>
                    <Button onClick={() => fetchJobs(1)}>Try Again</Button>
                </div>
            ) : (
                <div className="space-y-4">
                    {jobs.map(job => (
                        <Card key={job.id} className="p-6 hover:border-green-200 transition-colors border-gray-100 shadow-sm">
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-bold text-gray-900">{job.title}</h3>
                                        <Badge variant="outline" className="text-green-600 border-green-100 bg-green-50">98% Match</Badge>
                                    </div>
                                    <p className="text-gray-700 font-medium mb-4">{job.company}</p>

                                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-6">
                                        <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {job.location}</span>
                                        <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4" /> {job.salaryRange}</span>
                                        <span className="flex items-center gap-1.5">{getWorkTypeIcon(job.type)} {job.type}</span>
                                        {job.visaTags.length > 0 && (
                                            <span className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                                                <Globe className="w-4 h-4" /> {job.visaTags[0]}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 min-w-[180px]">
                                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => navigate('/dashboard/tools/ai-apply', { state: job })}>
                                        <Zap className="w-4 h-4 mr-2" /> One-Click Apply
                                    </Button>
                                    <Button variant="outline" className="w-full" onClick={() => navigate(`/ai-ninja/jobs/${job.id}`)}>
                                        View Details
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="flex items-center justify-center gap-6 mt-12">
                            <Button variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                                Previous
                            </Button>
                            <span className="text-sm font-medium">Page {currentPage} of {pagination.pages}</span>
                            <Button variant="outline" disabled={currentPage === pagination.pages} onClick={() => setCurrentPage(p => p + 1)}>
                                Next
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default JobsPage;
