import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { API_URL, apiCall } from '../config/api';
import { BRAND, APPLICATION_STATUS_LABELS } from '../config/branding';
import SideMenu from './SideMenu';
import './SideMenu.css';
import VerificationBanner from './VerificationBanner';
import {
  User, Upload, Briefcase, Linkedin, Mail, Shield, Trash2, Save, CheckCircle,
  AlertCircle, Eye, EyeOff, FileText, ExternalLink, Download, Bot, UserCheck,
  ClipboardList, Menu, Share2, Gift, Settings, LogOut, TrendingUp, Target,
  Users, Clock, CreditCard, Loader2, Key, MapPin, Plus, GraduationCap, Code, MessageSquare
} from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('tracker');
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  // BYOK state
  const [byokProvider, setByokProvider] = useState('openai');
  const [byokApiKey, setByokApiKey] = useState('');
  const [showByokKey, setShowByokKey] = useState(false);
  const [byokTesting, setByokTesting] = useState(false);
  const [byokSaving, setByokSaving] = useState(false);
  const [byokRemoving, setByokRemoving] = useState(false);
  const [byokTestResult, setByokTestResult] = useState(null);
  const [byokSaveResult, setByokSaveResult] = useState(null);
  const [currentByokConfig, setCurrentByokConfig] = useState(null);
  const [byokLoading, setByokLoading] = useState(true);

  const [kpis, setKpis] = useState({
    applicationsThisWeek: 0,
    totalJobsApplied: 0,
    interviews: 0,
    hoursSaved: 0
  });

  // Profile state
  const [profile, setProfile] = useState({
    // Identity & Contact (Person)
    person: {
      fullName: user?.name || '',
      email: user?.email || '',
      phone: '',
      linkedinUrl: '',
      githubUrl: '',
      portfolioUrl: '',
      preferredName: '',
      middleName: '',
    },

    // Address
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      zip: '',
      country: ''
    },

    // Work Authorization
    work_authorization: {
      authorized_to_work: 'yes',
      requires_sponsorship_now: 'no',
      requires_sponsorship_future: 'no',
      visa_type: '',
      relocation_ok: 'no',
    },

    // Role Preferences
    preferences: {
      desired_titles: '',
      work_mode: 'remote',
      preferred_locations: '',
      start_date: '',
      expected_salary: '',
      notice_period: '',
      preferred_job_types: 'fulltime',
    },

    // Professional History (Arrays)
    employment_history: [],
    education: [],
    certifications: [],
    certifications_text: '',
    projects: [],
    references: [],

    // Skills & Background
    skills: {
      primary: '',
      languages: '',
    },

    // Screening Answer Bank
    screening_questions: {
      why_this_company: '',
      project_example: '',
    },

    // Sensitive / EEO
    sensitive: {
      gender: '',
      race: '',
      veteran: '',
      disability: ''
    },

    // Resume & Documents
    resumeFile: null,
    resumeFileName: '',
    additionalNotes: ''
  });

  // Fetch applications from Google Sheets via backend
  useEffect(() => {
    // Set active tab from URL if present
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['tracker', 'pipeline', 'profile', 'queue', 'billing', 'referrals', 'settings'].includes(tab)) {
      setActiveTab(tab);
    }

    const fetchApplications = async () => {
      if (!user?.email) return;

      try {
        setIsLoading(true);

        const response = await fetch(`${API_URL}/api/applications/${encodeURIComponent(user.email)}`);

        if (response.ok) {
          const data = await response.json();

          // Transform applications to match component format
          const formattedApps = (data.applications || []).map((app, index) => ({
            id: app.id || index + 1,
            company: app.company || app.company_name || 'Unknown',
            role: app.jobTitle || app.job_title || 'Unknown',
            status: app.status || 'materials_ready',
            applicationLink: app.sourceUrl || app.application_link || '',
            date: app.createdAt ? new Date(app.createdAt).toLocaleDateString() : (app.submitted_date || '-'),
            location: app.location || '',
            matchScore: app.matchScore || 0,
            notes: app.notes || '',
            resumeId: app.resumeId || null,
            resumeText: app.resumeText || '',
            coverLetterText: app.coverLetterText || ''
          }));

          setApplications(formattedApps);

          // Use stats from new API format
          const stats = data.stats || {};
          setKpis({
            applicationsThisWeek: stats.this_week || formattedApps.filter(a => {
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return new Date(a.date) >= weekAgo;
            }).length || 0,
            totalJobsApplied: stats.total || formattedApps.length || 0,
            interviews: stats.interviews || stats.interviewing || 0,
            hoursSaved: Math.round(stats.hours_saved || formattedApps.length * 0.5 || 0)
          });
        }
      } catch (error) {
        console.error('Error fetching applications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();

    // Refresh data every 2 minutes
    const interval = setInterval(fetchApplications, 120000);
    return () => clearInterval(interval);
  }, [user?.email, location.search]);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.email) return;

      try {
        const response = await fetch(`${API_URL}/api/profile/${encodeURIComponent(user.email)}`);

        if (response.ok) {
          const data = await response.json();
          if (data.profile) {
            // Map structured data if available, otherwise handle legacy flat data
            setProfile(prev => {
              const newProfile = { ...prev };

              // If it's the new nested structure, merge it
              if (data.profile.person || data.profile.address) {
                return { ...prev, ...data.profile };
              }

              // Legacy flat profile mapping
              if (data.profile.fullName) newProfile.person.fullName = data.profile.fullName;
              if (data.profile.phone) newProfile.person.phone = data.profile.phone;
              if (data.profile.linkedinUrl) newProfile.person.linkedinUrl = data.profile.linkedinUrl;

              if (data.profile.address) newProfile.address.line1 = data.profile.address;
              if (data.profile.city) newProfile.address.city = data.profile.city;
              if (data.profile.state) newProfile.address.state = data.profile.state;
              if (data.profile.zip) newProfile.address.zip = data.profile.zip;
              if (data.profile.country) newProfile.address.country = data.profile.country;

              if (data.profile.yearsOfExperience) newProfile.preferences.notice_period = data.profile.yearsOfExperience;
              if (data.profile.targetRole) newProfile.preferences.desired_titles = data.profile.targetRole;
              if (data.profile.expectedSalary) newProfile.preferences.expected_salary = data.profile.expectedSalary;

              return newProfile;
            });
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, [user?.email]);

  // Fetch BYOK Status
  const fetchBYOKStatus = async () => {
    try {
      const data = await apiCall('/byok/status');
      setCurrentByokConfig(data);
      if (data.configured) {
        setByokProvider(data.provider);
      }
    } catch (error) {
      console.error('Error fetching BYOK status:', error);
    } finally {
      setByokLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'settings') {
      fetchBYOKStatus();
    }
  }, [activeTab]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleProfileChange = (section, field, value) => {
    if (section) {
      setProfile(prev => ({
        ...prev,
        [section]: { ...prev[section], [field]: value }
      }));
    } else {
      setProfile(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleArrayChange = (section, index, field, value) => {
    setProfile(prev => {
      const newArray = [...prev[section]];
      newArray[index] = { ...newArray[index], [field]: value };
      return { ...prev, [section]: newArray };
    });
  };

  const addArrayItem = (section, defaultItem) => {
    setProfile(prev => ({
      ...prev,
      [section]: [...prev[section], defaultItem]
    }));
  };

  const removeArrayItem = (section, index) => {
    setProfile(prev => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index)
    }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfile(prev => ({
        ...prev,
        resumeFile: file,
        resumeFileName: file.name
      }));
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      // Create form data for file upload
      const formData = new FormData();

      // Add all profile fields
      Object.keys(profile).forEach(key => {
        if (key === 'resumeFile' && profile.resumeFile) {
          formData.append('resume', profile.resumeFile);
        } else if (key !== 'resumeFile') {
          const value = profile[key];
          if (typeof value === 'object' && value !== null) {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value || '');
          }
        }
      });
      formData.append('email', user?.email);

      const response = await fetch(`${API_URL}/api/profile`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        setSaveMessage('Profile saved successfully!');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('Failed to save profile. Please try again.');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveMessage('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestKey = async () => {
    if (!byokApiKey.trim()) {
      setByokTestResult({ success: false, message: 'Please enter an API key' });
      return;
    }

    setByokTesting(true);
    setByokTestResult(null);

    try {
      const data = await apiCall('/byok/test', {
        method: 'POST',
        body: JSON.stringify({ provider: byokProvider, apiKey: byokApiKey })
      });

      setByokTestResult({ success: true, message: data.message });
    } catch (error) {
      console.error('BYOK Test Error:', error);
      setByokTestResult({
        success: false,
        message: error.message && !error.message.includes('API Error')
          ? `Network error: ${error.message}`
          : error.message || 'Network error. Please try again.'
      });
    } finally {
      setByokTesting(false);
    }
  };

  const handleSaveKey = async () => {
    if (!byokApiKey.trim()) {
      setByokSaveResult({ success: false, message: 'Please enter an API key' });
      return;
    }

    setByokSaving(true);
    setByokSaveResult(null);

    try {
      const data = await apiCall('/byok/save', {
        method: 'POST',
        body: JSON.stringify({ provider: byokProvider, apiKey: byokApiKey })
      });

      setByokSaveResult({ success: true, message: data.message });
      setByokApiKey(''); // Clear the key from state
      await fetchBYOKStatus(); // Refresh status
    } catch (error) {
      console.error('BYOK Save Error:', error);
      setByokSaveResult({
        success: false,
        message: error.message || 'Network error. Please try again.'
      });
    } finally {
      setByokSaving(false);
    }
  };

  const handleRemoveKey = async () => {
    if (!window.confirm('Are you sure you want to remove your API key? This will disable BYOK mode.')) {
      return;
    }

    setByokRemoving(true);

    try {
      const data = await apiCall('/byok/remove', { method: 'DELETE' });

      setByokSaveResult({ success: true, message: data.message });
      setByokApiKey('');
      await fetchBYOKStatus();
    } catch (error) {
      console.error('BYOK Remove Error:', error);
      setByokSaveResult({
        success: false,
        message: error.message || 'Network error. Please try again.'
      });
    } finally {
      setByokRemoving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      if (window.confirm('This will permanently delete all your data. Type "DELETE" to confirm.')) {
        try {
          const response = await fetch(`${API_URL}/api/user/${encodeURIComponent(user?.email)}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            logout();
            navigate('/');
          }
        } catch (error) {
          console.error('Error deleting account:', error);
          alert('Failed to delete account. Please contact support.');
        }
      }
    }
  };

  const handleDownloadResume = async (app) => {
    if (!app.resumeText) return;

    try {
      const endpoint = `${API_URL}/api/generate/resume`;
      const payload = {
        userId: user.id,
        resume_text: app.resumeText,
        company: app.company,
        job_description: app.jobDescription || '',
        analysis: {},
        is_already_tailored: true
      };

      const safeCompany = (app.company || 'Company').trim().replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
      const fileName = `Tailored_Resume_${safeCompany}.docx`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`Failed to generate resume`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error(`Download failed:`, error);
      alert('Failed to download resume. Please try again.');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      found: 'default',
      prepared: 'secondary',
      submitted: 'success',
      interview: 'warning',
      offer: 'success',
      rejected: 'destructive'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <VerificationBanner />
      {location.state?.message && (
        <div className="bg-primary/10 text-primary px-4 py-3 flex items-center justify-center gap-2 border-b border-primary/20 animate-in fade-in slide-in-from-top duration-500">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">{location.state.message}</span>
        </div>
      )}
      {/* Side Menu */}
      <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />

      {/* Top Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              {/* Hamburger Menu */}
              <button
                onClick={() => setSideMenuOpen(true)}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              <button onClick={() => { navigate('/'); window.scrollTo(0, 0); }} className="flex items-center gap-2">
                <img src={BRAND.logoPath} alt={BRAND.logoAlt} className="h-8" />
                <span className="text-xl font-bold text-primary">{BRAND.name}</span>
              </button>
              <div className="hidden md:flex items-center gap-4">
                <button onClick={() => navigate('/ai-ninja')} className="text-sm text-gray-600 hover:text-primary flex items-center gap-1">
                  <Bot className="w-4 h-4" /> AI Ninja
                </button>
                <button onClick={() => navigate('/human-ninja')} className="text-sm text-gray-600 hover:text-primary flex items-center gap-1">
                  <UserCheck className="w-4 h-4" /> Human Ninja
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
              <Badge className={user?.plan?.toLowerCase() === 'pro' ? 'bg-blue-600 hover:bg-blue-700 text-white border-0 font-bold px-3 py-1' : ''}>
                {user?.plan?.toLowerCase() || 'free'}
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('profile')}>
                <User className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('settings')}>
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Our Applications This Week</p>
                  <p className="text-3xl font-bold mt-1">{kpis.applicationsThisWeek.toLocaleString()}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Jobs Applied</p>
                  <p className="text-3xl font-bold mt-1">{kpis.totalJobsApplied.toLocaleString()}</p>
                </div>
                <Target className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Interviews</p>
                  <p className="text-3xl font-bold mt-1">{kpis.interviews}</p>
                </div>
                <Users className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Hours Saved</p>
                  <p className="text-3xl font-bold mt-1">{kpis.hoursSaved}h</p>
                </div>
                <Clock className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-1">
                  <button
                    onClick={() => setActiveTab('tracker')}
                    style={activeTab === 'tracker' ? {
                      backgroundColor: '#15803d',
                      color: '#ffffff'
                    } : {
                      color: '#111827'
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'tracker' ? '' : 'hover:bg-gray-100'}`}
                  >
                    <ClipboardList className="w-4 h-4" />
                    Application Tracker
                  </button>
                  <button
                    onClick={() => setActiveTab('pipeline')}
                    style={activeTab === 'pipeline' ? {
                      backgroundColor: '#15803d',
                      color: '#ffffff'
                    } : {
                      color: '#111827'
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'pipeline' ? '' : 'hover:bg-gray-100'}`}
                  >
                    <Target className="w-4 h-4" />
                    Human Ninja Pipeline
                  </button>
                  <button
                    onClick={() => setActiveTab('profile')}
                    style={activeTab === 'profile' ? {
                      backgroundColor: '#15803d',
                      color: '#ffffff'
                    } : {
                      color: '#111827'
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'profile' ? '' : 'hover:bg-gray-100'}`}
                  >
                    <User className="w-4 h-4" />
                    My Profile
                  </button>
                  <button
                    onClick={() => setActiveTab('queue')}
                    style={activeTab === 'queue' ? {
                      backgroundColor: '#15803d',
                      color: '#ffffff'
                    } : {
                      color: '#111827'
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'queue' ? '' : 'hover:bg-gray-100'}`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve Queue
                  </button>
                  <button
                    onClick={() => setActiveTab('billing')}
                    style={activeTab === 'billing' ? {
                      backgroundColor: '#15803d',
                      color: '#ffffff'
                    } : {
                      color: '#111827'
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'billing' ? '' : 'hover:bg-gray-100'}`}
                  >
                    <CreditCard className="w-4 h-4" />
                    Billing
                  </button>
                  <button
                    onClick={() => setActiveTab('referrals')}
                    style={activeTab === 'referrals' ? {
                      backgroundColor: '#15803d',
                      color: '#ffffff'
                    } : {
                      color: '#111827'
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'referrals' ? '' : 'hover:bg-gray-100'}`}
                  >
                    <Gift className="w-4 h-4" />
                    Invite & Earn
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    style={activeTab === 'settings' ? {
                      backgroundColor: '#15803d',
                      color: '#ffffff'
                    } : {
                      color: '#111827'
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'settings' ? '' : 'hover:bg-gray-100'}`}
                  >
                    <Settings className="w-4 h-4" />
                    Account & AI Settings
                  </button>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Application Tracker Tab */}
            {activeTab === 'tracker' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardList className="w-5 h-5" />
                      Application Tracker
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Every time you use AI Ninja or Human Ninja to prepare an application, we log it here so you can see your entire job search in one place.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Date</th>
                            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Company</th>
                            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Role</th>
                            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Location</th>
                            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Match</th>
                            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Resume</th>
                            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Job Link</th>
                            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {isLoading ? (
                            <tr>
                              <td colSpan="8" className="py-8 text-center">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                                <p className="text-sm text-gray-500 mt-2">Loading applications...</p>
                              </td>
                            </tr>
                          ) : applications.length === 0 ? (
                            <tr>
                              <td colSpan="8" className="py-8 text-center">
                                <ClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                <p className="text-gray-500 font-medium">No applications yet</p>
                                <p className="text-sm text-gray-400 mt-1">
                                  Your applications will appear here once you start applying.
                                </p>
                              </td>
                            </tr>
                          ) : (
                            applications.map((app) => (
                              <tr key={app.id} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-4 text-sm text-gray-600">{app.date || '-'}</td>
                                <td className="py-3 px-4 font-medium">{app.company}</td>
                                <td className="py-3 px-4">{app.role}</td>
                                <td className="py-3 px-4 text-sm">{app.location || '-'}</td>
                                <td className="py-3 px-4">
                                  {app.matchScore ? (
                                    <Badge variant={app.matchScore >= 70 ? 'success' : app.matchScore >= 50 ? 'warning' : 'secondary'}>
                                      {app.matchScore}%
                                    </Badge>
                                  ) : '-'}
                                </td>
                                <td className="py-3 px-4">
                                  {app.resumeText ? (
                                    <button
                                      onClick={() => handleDownloadResume(app)}
                                      className="text-primary hover:underline flex items-center gap-1"
                                    >
                                      <Download className="w-4 h-4" /> Download
                                    </button>
                                  ) : app.resumeId ? (
                                    <button
                                      onClick={() => navigate('/resumes')}
                                      className="text-primary hover:underline flex items-center gap-1"
                                    >
                                      <FileText className="w-4 h-4" /> View
                                    </button>
                                  ) : (
                                    <span className="text-gray-400 text-xs italic">No resume</span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  {app.applicationLink ? (
                                    <a
                                      href={app.applicationLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline flex items-center gap-1"
                                    >
                                      <ExternalLink className="w-4 h-4" /> View
                                    </a>
                                  ) : '-'}
                                </td>
                                <td className="py-3 px-4">
                                  <Select
                                    value={app.status}
                                    onValueChange={async (value) => {
                                      try {
                                        await fetch(`${API_URL}/api/applications/${app.id}?status=${value}`, {
                                          method: 'PUT'
                                        });
                                        // Update local state
                                        setApplications(prev => prev.map(a =>
                                          a.id === app.id ? { ...a, status: value } : a
                                        ));
                                      } catch (e) {
                                        console.error('Failed to update status:', e);
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="w-32 h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="materials_ready">📝 Ready</SelectItem>
                                      <SelectItem value="applied">✅ Applied</SelectItem>
                                      <SelectItem value="interviewing">📞 Interview</SelectItem>
                                      <SelectItem value="offered">🎉 Offered</SelectItem>
                                      <SelectItem value="rejected">❌ Rejected</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'pipeline' && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Applications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Company</th>
                          <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Role</th>
                          <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Date</th>
                          <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Link</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoading ? (
                          <tr>
                            <td colSpan="5" className="py-8 text-center">
                              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                              <p className="text-sm text-gray-500 mt-2">Loading applications...</p>
                            </td>
                          </tr>
                        ) : applications.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="py-8 text-center">
                              <p className="text-gray-500">No applications yet.</p>
                              <p className="text-sm text-gray-400 mt-1">Our team is working on finding jobs for you!</p>
                            </td>
                          </tr>
                        ) : (
                          applications.map((app) => (
                            <tr key={app.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium">{app.company}</td>
                              <td className="py-3 px-4">{app.role}</td>
                              <td className="py-3 px-4">{getStatusBadge(app.status)}</td>
                              <td className="py-3 px-4 text-sm text-gray-600">{app.date}</td>
                              <td className="py-3 px-4">
                                <a
                                  href={app.applicationLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline text-sm"
                                >
                                  View
                                </a>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* Save Message */}
                {saveMessage && (
                  <div className={`p-4 rounded-md flex items-center gap-2 ${saveMessage.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                    {saveMessage.includes('success') ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {saveMessage}
                  </div>
                )}

                {/* Personal Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Full Name</Label>
                      <Input
                        value={profile.person.fullName}
                        onChange={(e) => handleProfileChange('person', 'fullName', e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <Label>Preferred Name</Label>
                      <Input
                        value={profile.person.preferredName}
                        onChange={(e) => handleProfileChange('person', 'preferredName', e.target.value)}
                        placeholder="Johnny"
                      />
                    </div>
                    <div>
                      <Label>Middle Name</Label>
                      <Input
                        value={profile.person.middleName}
                        onChange={(e) => handleProfileChange('person', 'middleName', e.target.value)}
                        placeholder="Quincy"
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        value={profile.person.email}
                        disabled
                        className="bg-gray-100"
                      />
                    </div>
                    <div>
                      <Label>Phone Number</Label>
                      <Input
                        value={profile.person.phone}
                        onChange={(e) => handleProfileChange('person', 'phone', e.target.value)}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div>
                      <Label>LinkedIn URL</Label>
                      <Input
                        value={profile.person.linkedinUrl}
                        onChange={(e) => handleProfileChange('person', 'linkedinUrl', e.target.value)}
                        placeholder="https://linkedin.com/in/username"
                      />
                    </div>
                    <div>
                      <Label>GitHub URL</Label>
                      <Input
                        value={profile.person.githubUrl}
                        onChange={(e) => handleProfileChange('person', 'githubUrl', e.target.value)}
                        placeholder="https://github.com/username"
                      />
                    </div>
                    <div>
                      <Label>Portfolio URL</Label>
                      <Input
                        value={profile.person.portfolioUrl}
                        onChange={(e) => handleProfileChange('person', 'portfolioUrl', e.target.value)}
                        placeholder="https://portfolio.com"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Address Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Address Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label>Street Address</Label>
                      <Input
                        value={profile.address.line1}
                        onChange={(e) => handleProfileChange('address', 'line1', e.target.value)}
                        placeholder="123 Main St"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Apt, Suite, etc. (Optional)</Label>
                      <Input
                        value={profile.address.line2}
                        onChange={(e) => handleProfileChange('address', 'line2', e.target.value)}
                        placeholder="Apt 4B"
                      />
                    </div>
                    <div>
                      <Label>City</Label>
                      <Input
                        value={profile.address.city}
                        onChange={(e) => handleProfileChange('address', 'city', e.target.value)}
                        placeholder="New York"
                      />
                    </div>
                    <div>
                      <Label>State / Province</Label>
                      <Input
                        value={profile.address.state}
                        onChange={(e) => handleProfileChange('address', 'state', e.target.value)}
                        placeholder="NY"
                      />
                    </div>
                    <div>
                      <Label>Zip / Postal Code</Label>
                      <Input
                        value={profile.address.zip}
                        onChange={(e) => handleProfileChange('address', 'zip', e.target.value)}
                        placeholder="10001"
                      />
                    </div>
                    <div>
                      <Label>Country</Label>
                      <Input
                        value={profile.address.country}
                        onChange={(e) => handleProfileChange('address', 'country', e.target.value)}
                        placeholder="United States"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Role Preferences */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Role Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Desired Job Titles</Label>
                      <Input
                        value={profile.preferences.desired_titles}
                        onChange={(e) => handleProfileChange('preferences', 'desired_titles', e.target.value)}
                        placeholder="e.g., Software Engineer, Tech Lead"
                      />
                    </div>
                    <div>
                      <Label>Work Mode</Label>
                      <Select value={profile.preferences.work_mode} onValueChange={(v) => handleProfileChange('preferences', 'work_mode', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="remote">Remote Only</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                          <SelectItem value="onsite">On-site</SelectItem>
                          <SelectItem value="flexible">Flexible</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Expected Salary / Compensation</Label>
                      <Input
                        value={profile.preferences.expected_salary}
                        onChange={(e) => handleProfileChange('preferences', 'expected_salary', e.target.value)}
                        placeholder="e.g., $150k - $200k"
                      />
                    </div>
                    <div>
                      <Label>Preferred Locations</Label>
                      <Input
                        value={profile.preferences.preferred_locations}
                        onChange={(e) => handleProfileChange('preferences', 'preferred_locations', e.target.value)}
                        placeholder="New York, San Francisco, Remote"
                      />
                    </div>
                    <div>
                      <Label>Start Date / Notice Period</Label>
                      <Input
                        value={profile.preferences.notice_period}
                        onChange={(e) => handleProfileChange('preferences', 'notice_period', e.target.value)}
                        placeholder="e.g., 2 weeks"
                      />
                    </div>
                    <div>
                      <Label>Employment Type</Label>
                      <Select value={profile.preferences.preferred_job_types} onValueChange={(v) => handleProfileChange('preferences', 'preferred_job_types', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fulltime">Full-time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="parttime">Part-time</SelectItem>
                          <SelectItem value="internship">Internship</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Visa & Work Authorization */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Visa & Work Authorization
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Authorized to work in target country?</Label>
                      <Select value={profile.work_authorization.authorized_to_work} onValueChange={(v) => handleProfileChange('work_authorization', 'authorized_to_work', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Requires Sponsorship Now?</Label>
                      <Select value={profile.work_authorization.requires_sponsorship_now} onValueChange={(v) => handleProfileChange('work_authorization', 'requires_sponsorship_now', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Requires Sponsorship Future?</Label>
                      <Select value={profile.work_authorization.requires_sponsorship_future} onValueChange={(v) => handleProfileChange('work_authorization', 'requires_sponsorship_future', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Visa Type (If applicable)</Label>
                      <Input
                        value={profile.work_authorization.visa_type}
                        onChange={(e) => handleProfileChange('work_authorization', 'visa_type', e.target.value)}
                        placeholder="H1B, F1-OPT, etc."
                      />
                    </div>
                  </CardContent>
                </Card>



                {/* Employment History */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5" />
                      Employment History
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={() => addArrayItem('employment_history', { company: '', title: '', location: '', start_date: '', end_date: '', is_current: false, summary: '' })}>
                      <Plus className="w-4 h-4 mr-1" /> Add Job
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {profile.employment_history.map((job, index) => (
                      <div key={index} className="p-4 border rounded-lg relative space-y-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                          onClick={() => removeArrayItem('employment_history', index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Company Name</Label>
                            <Input
                              value={job.company}
                              onChange={(e) => handleArrayChange('employment_history', index, 'company', e.target.value)}
                              placeholder="Google"
                            />
                          </div>
                          <div>
                            <Label>Job Title</Label>
                            <Input
                              value={job.title}
                              onChange={(e) => handleArrayChange('employment_history', index, 'title', e.target.value)}
                              placeholder="Software Engineer"
                            />
                          </div>
                          <div>
                            <Label>Location</Label>
                            <Input
                              value={job.location}
                              onChange={(e) => handleArrayChange('employment_history', index, 'location', e.target.value)}
                              placeholder="Mountain View, CA"
                            />
                          </div>
                          <div className="flex gap-4">
                            <div className="flex-1">
                              <Label>Start Date</Label>
                              <Input
                                value={job.start_date}
                                onChange={(e) => handleArrayChange('employment_history', index, 'start_date', e.target.value)}
                                placeholder="MM/YYYY"
                              />
                            </div>
                            <div className="flex-1">
                              <Label>End Date</Label>
                              <Input
                                value={job.end_date}
                                onChange={(e) => handleArrayChange('employment_history', index, 'end_date', e.target.value)}
                                placeholder="Present"
                                disabled={job.is_current}
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <Label>Responsibilities Summary</Label>
                          <Textarea
                            value={job.summary}
                            onChange={(e) => handleArrayChange('employment_history', index, 'summary', e.target.value)}
                            placeholder="Describe your key achievements and responsibilities..."
                            rows={3}
                          />
                        </div>
                      </div>
                    ))}
                    {profile.employment_history.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No work experience added yet.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Education */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5" />
                      Education
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={() => addArrayItem('education', { school: '', degree: '', major: '', location: '', end_date: '', gpa: '' })}>
                      <Plus className="w-4 h-4 mr-1" /> Add Education
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {profile.education.map((edu, index) => (
                      <div key={index} className="p-4 border rounded-lg relative space-y-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                          onClick={() => removeArrayItem('education', index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <Label>School Name</Label>
                            <Input
                              value={edu.school}
                              onChange={(e) => handleArrayChange('education', index, 'school', e.target.value)}
                              placeholder="Stanford University"
                            />
                          </div>
                          <div>
                            <Label>Degree Type</Label>
                            <Input
                              value={edu.degree}
                              onChange={(e) => handleArrayChange('education', index, 'degree', e.target.value)}
                              placeholder="Master of Science"
                            />
                          </div>
                          <div>
                            <Label>Major / Field of Study</Label>
                            <Input
                              value={edu.major}
                              onChange={(e) => handleArrayChange('education', index, 'major', e.target.value)}
                              placeholder="Computer Science"
                            />
                          </div>
                          <div>
                            <Label>Graduation Date (or expected)</Label>
                            <Input
                              value={edu.end_date}
                              onChange={(e) => handleArrayChange('education', index, 'end_date', e.target.value)}
                              placeholder="06/2023"
                            />
                          </div>
                          <div>
                            <Label>GPA (Optional)</Label>
                            <Input
                              value={edu.gpa}
                              onChange={(e) => handleArrayChange('education', index, 'gpa', e.target.value)}
                              placeholder="3.9/4.0"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {profile.education.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No education history added yet.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Skills & Background */}
                <Card>
                  <CardHeader>
                    <CardTitle>Skills & Background</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Key Skills (Comma separated)</Label>
                      <Textarea
                        value={profile.skills.primary}
                        onChange={(e) => handleProfileChange('skills', 'primary', e.target.value)}
                        placeholder="e.g., JavaScript, React, Node.js, Python, AWS, etc."
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>Languages & Proficiency</Label>
                      <Textarea
                        value={profile.skills.languages}
                        onChange={(e) => handleProfileChange('skills', 'languages', e.target.value)}
                        placeholder="e.g., English (Native), Spanish (Conversational)"
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label>Certifications</Label>
                      <Textarea
                        value={profile.certifications_text} // Combined for now
                        onChange={(e) => handleProfileChange(null, 'certifications_text', e.target.value)}
                        placeholder="e.g., AWS Solutions Architect, Google Cloud Professional"
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Projects */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Code className="w-5 h-5 text-indigo-500" />
                      Projects
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={() => addArrayItem('projects', { name: '', description: '', tech_stack: '', links: '' })}>
                      <Plus className="w-4 h-4 mr-1" /> Add Project
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {profile.projects.map((proj, index) => (
                      <div key={index} className="p-4 border rounded-lg relative space-y-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                          onClick={() => removeArrayItem('projects', index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Project Name</Label>
                            <Input
                              value={proj.name}
                              onChange={(e) => handleArrayChange('projects', index, 'name', e.target.value)}
                              placeholder="AI Job Assistant"
                            />
                          </div>
                          <div>
                            <Label>Tech Stack</Label>
                            <Input
                              value={proj.tech_stack}
                              onChange={(e) => handleArrayChange('projects', index, 'tech_stack', e.target.value)}
                              placeholder="React, Node.js, OpenAI"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label>Links (GitHub / Demo)</Label>
                            <Input
                              value={proj.links}
                              onChange={(e) => handleArrayChange('projects', index, 'links', e.target.value)}
                              placeholder="https://github.com/user/project"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label>Description & Impact</Label>
                            <Textarea
                              value={proj.description}
                              onChange={(e) => handleArrayChange('projects', index, 'description', e.target.value)}
                              placeholder="Describe what you built and the impact it had..."
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {profile.projects.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No projects added yet.</p>
                    )}
                  </CardContent>
                </Card>

                {/* References */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-green-500" />
                      Professional References
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={() => addArrayItem('references', { name: '', company: '', title: '', email: '', phone: '', relationship: '' })}>
                      <Plus className="w-4 h-4 mr-1" /> Add Reference
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {profile.references.map((ref, index) => (
                      <div key={index} className="p-4 border rounded-lg relative space-y-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                          onClick={() => removeArrayItem('references', index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Reference Name</Label>
                            <Input
                              value={ref.name}
                              onChange={(e) => handleArrayChange('references', index, 'name', e.target.value)}
                              placeholder="Jane Smith"
                            />
                          </div>
                          <div>
                            <Label>Relationship</Label>
                            <Input
                              value={ref.relationship}
                              onChange={(e) => handleArrayChange('references', index, 'relationship', e.target.value)}
                              placeholder="Former Manager"
                            />
                          </div>
                          <div>
                            <Label>Company & Title</Label>
                            <Input
                              value={ref.title}
                              onChange={(e) => handleArrayChange('references', index, 'title', e.target.value)}
                              placeholder="Technical Lead at Google"
                            />
                          </div>
                          <div>
                            <Label>Email</Label>
                            <Input
                              value={ref.email}
                              onChange={(e) => handleArrayChange('references', index, 'email', e.target.value)}
                              placeholder="jane@example.com"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {profile.references.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No references added yet.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Screening Answer Bank */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-blue-500" />
                      Screening Answer Bank
                    </CardTitle>
                    <p className="text-xs text-gray-500">Save common answers to speed up applications.</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Why are you interested in this company? (General)</Label>
                      <Textarea
                        value={profile.screening_questions.why_this_company}
                        onChange={(e) => handleProfileChange('screening_questions', 'why_this_company', e.target.value)}
                        placeholder="Your general 'Why us' pitch..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>Describe a challenging project you've worked on.</Label>
                      <Textarea
                        value={profile.screening_questions.project_example}
                        onChange={(e) => handleProfileChange('screening_questions', 'project_example', e.target.value)}
                        placeholder="S.T.A.R. method answer..."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Resume & Documents */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="w-5 h-5" />
                      Resume & Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600 mb-2">
                        {profile.resumeFileName ? `Selected: ${profile.resumeFileName}` : 'Upload your resume'}
                      </p>
                      <p className="text-sm text-gray-400 mb-4">PDF, DOC, or DOCX (Max 5MB)</p>
                      <input
                        type="file"
                        id="resume-upload"
                        className="hidden"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileUpload}
                      />
                      <Button variant="outline" onClick={() => document.getElementById('resume-upload').click()}>
                        {profile.resumeFileName ? 'Change File' : 'Select File'}
                      </Button>
                    </div>
                    {profile.additionalNotes && (
                      <div className="mt-6">
                        <Label>Additional Notes for Your Ninja</Label>
                        <Textarea
                          value={profile.additionalNotes}
                          onChange={(e) => handleProfileChange(null, 'additionalNotes', e.target.value)}
                          placeholder="Any specific preferences..."
                          rows={3}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Save Button */}
                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full md:w-auto">
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Profile
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'queue' && (
              <Card>
                <CardHeader>
                  <CardTitle>Approve & Submit Queue</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Review prepared applications before submission.</p>
                  <div className="mt-4 p-4 bg-gray-50 rounded-md text-sm text-gray-600">
                    This section will show applications that are ready for your approval.
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'billing' && (
              <Card>
                <CardHeader>
                  <CardTitle>Billing & Subscription</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">Current Plan</p>
                      <p className="text-2xl font-bold">{user?.plan || 'No Plan Selected'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Next Renewal</p>
                      <p className="text-lg">February 24, 2025</p>
                    </div>
                    <div className="pt-4">
                      <Button onClick={() => navigate('/pricing')}>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Change Plan
                      </Button>
                      <Button variant="outline" className="ml-2">
                        Manage Subscription
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Referrals Tab */}
            {activeTab === 'referrals' && (
              <div className="space-y-6">
                <Card className="border-blue-100 bg-blue-50/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-700">
                      <Gift className="w-6 h-6" />
                      Invite Friends & Get Bonus AI Applications
                    </CardTitle>
                    <p className="text-sm text-blue-600 mt-1">
                      Share the jobNinjas magic! For every friend who signs up and subscribes, you'll earn 5 extra AI-tailored applications.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-gray-600">Your Unique Referral Code</Label>
                          <div className="flex gap-2">
                            <div className="bg-white border-2 border-dashed border-blue-200 rounded-lg px-4 py-3 flex-1 flex justify-center items-center font-mono text-xl font-bold text-blue-800">
                              {user?.referral_code || 'INV-XXXXXX'}
                            </div>
                            <Button
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(user?.referral_code || '');
                                alert('Code copied to clipboard!');
                              }}
                            >
                              Copy
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-gray-600">Referral Link</Label>
                          <div className="flex gap-2">
                            <Input
                              readOnly
                              value={`${window.location.origin}/signup?ref=${user?.referral_code}`}
                              className="bg-white"
                            />
                            <Button
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/signup?ref=${user?.referral_code}`);
                                alert('Link copied to clipboard!');
                              }}
                            >
                              Copy Link
                            </Button>
                          </div>
                        </div>

                        <div className="pt-4 flex gap-4">
                          <div className="bg-white p-4 rounded-xl border border-blue-100 flex-1 text-center">
                            <p className="text-xs text-gray-500 uppercase font-semibold">Bonus AI Applications</p>
                            <p className="text-3xl font-bold text-blue-600 mt-1">{user?.ai_applications_bonus || 0}</p>
                          </div>
                          <div className="bg-white p-4 rounded-xl border border-blue-100 flex-1 text-center">
                            <p className="text-xs text-gray-500 uppercase font-semibold">Total Referrals</p>
                            <p className="text-3xl font-bold text-gray-700 mt-1">0</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm space-y-4">
                        <h3 className="font-bold text-gray-800">How it works:</h3>
                        <div className="space-y-4">
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-bold">1</div>
                            <p className="text-sm text-gray-600 pt-1">Share your link or code with friends who are looking for jobs.</p>
                          </div>
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-bold">2</div>
                            <p className="text-sm text-gray-600 pt-1">They sign up and start a subscription (Starter, Pro, or Urgent).</p>
                          </div>
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 font-bold">3</div>
                            <p className="text-sm text-gray-600 pt-1">You automatically get 5 bonus AI applications added to your account!</p>
                          </div>
                        </div>
                        <div className="pt-4 border-t">
                          <Button className="w-full bg-blue-600 hover:bg-blue-700 flex gap-2">
                            <Share2 className="w-4 h-4" /> Share on Social Media
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* AI Integration (BYOK) - Placed at the top for immediate accessibility */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="w-5 h-5 text-blue-600" />
                      AI Integration (BYOK)
                    </CardTitle>
                    <p className="text-sm text-gray-500">
                      Use your own API key for unlimited AI applications. Keys are stored encrypted.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Current BYOK Status */}
                    {currentByokConfig?.configured && (
                      <div className="p-4 bg-green-50 border border-green-100 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-medium text-green-800 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> BYOK Mode Active
                          </p>
                          <p className="text-xs text-green-700 capitalize">Provider: {currentByokConfig.provider}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={handleRemoveKey}
                          disabled={byokRemoving}
                        >
                          {byokRemoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                          Remove
                        </Button>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <Label>AI Provider</Label>
                        <Select
                          value={byokProvider}
                          onValueChange={setByokProvider}
                          disabled={currentByokConfig?.configured}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Provider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="openai">OpenAI (GPT-4o Mini)</SelectItem>
                            <SelectItem value="google">Google Gemini 1.5 Flash</SelectItem>
                            <SelectItem value="anthropic">Anthropic Claude 3 Haiku</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>API Key</Label>
                        <div className="relative">
                          <Input
                            type={showByokKey ? 'text' : 'password'}
                            value={byokApiKey}
                            onChange={(e) => setByokApiKey(e.target.value)}
                            placeholder={`Enter your ${byokProvider} API key`}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowByokKey(!showByokKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                          >
                            {showByokKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {byokTestResult && (
                        <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${byokTestResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {byokTestResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          {byokTestResult.message}
                        </div>
                      )}

                      {byokSaveResult && (
                        <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${byokSaveResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {byokSaveResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          {byokSaveResult.message}
                        </div>
                      )}

                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={handleTestKey}
                          disabled={byokTesting || !byokApiKey.trim()}
                        >
                          {byokTesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
                          Test Key
                        </Button>
                        <Button
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={handleSaveKey}
                          disabled={byokSaving || !byokApiKey.trim()}
                        >
                          {byokSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                          Save Key
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Account Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Email Notifications</h4>
                        <p className="text-sm text-gray-500">Receive updates about your applications</p>
                      </div>
                      <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary" />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Weekly Summary</h4>
                        <p className="text-sm text-gray-500">Get a weekly report of your job search progress</p>
                      </div>
                      <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary" />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Interview Reminders</h4>
                        <p className="text-sm text-gray-500">Get reminded before scheduled interviews</p>
                      </div>
                      <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Password & Security</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Current Password</Label>
                      <Input type="password" placeholder="••••••••" />
                    </div>
                    <div>
                      <Label>New Password</Label>
                      <Input type="password" placeholder="••••••••" />
                    </div>
                    <div>
                      <Label>Confirm New Password</Label>
                      <Input type="password" placeholder="••••••••" />
                    </div>
                    <Button variant="outline">Update Password</Button>
                  </CardContent>
                </Card>

                <Card className="border-red-200">
                  <CardHeader>
                    <CardTitle className="text-red-600 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Danger Zone
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <h4 className="font-medium text-red-800">Delete Account</h4>
                      <p className="text-sm text-red-600 mt-1 mb-4">
                        Once you delete your account, all your data will be permanently removed. This action cannot be undone.
                      </p>
                      <Button variant="destructive" onClick={handleDeleteAccount}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete My Account
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div >
  );
};

export default Dashboard;
