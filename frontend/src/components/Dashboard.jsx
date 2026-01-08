import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { API_URL } from '../config/api';
import { BRAND, APPLICATION_STATUS_LABELS } from '../config/branding';
import SideMenu from './SideMenu';
import './SideMenu.css';
import {
  TrendingUp, Target, Users, Clock, LogOut, Settings, CreditCard, Loader2,
  User, Upload, Briefcase, Linkedin, Mail, Shield, Trash2, Save, CheckCircle,
  AlertCircle, Eye, EyeOff, FileText, ExternalLink, Download, Bot, UserCheck,
  ClipboardList, Menu
} from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tracker');
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [kpis, setKpis] = useState({
    applicationsThisWeek: 0,
    totalJobsApplied: 0,
    interviews: 0,
    hoursSaved: 0
  });

  // Profile state
  const [profile, setProfile] = useState({
    // Personal Info
    fullName: user?.name || '',
    email: user?.email || '',
    phone: '',

    // Professional Info
    yearsOfExperience: '',
    currentRole: '',
    targetRole: '',
    expectedSalary: '',
    preferredLocations: '',
    remotePreference: '',

    // Visa & Work Authorization
    visaStatus: '',
    workAuthorization: '',
    requiresSponsorship: '',

    // Job Portal Credentials
    linkedinUrl: '',
    linkedinEmail: '',
    linkedinPassword: '',

    // Additional portals
    indeedEmail: '',
    indeedPassword: '',

    // Gmail for applications
    gmailEmail: '',
    gmailPassword: '',

    // Resume & Documents
    resumeFile: null,
    resumeFileName: '',

    // Skills & Background
    skills: '',
    education: '',
    certifications: '',

    // Additional Info
    willingToRelocate: '',
    noticePeriod: '',
    availableStartDate: '',
    preferredJobTypes: '',

    // Notes
    additionalNotes: ''
  });

  // Fetch applications from Google Sheets via backend
  useEffect(() => {
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
            resumeId: app.resumeId || null
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
  }, [user?.email]);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.email) return;

      try {
        const response = await fetch(`${API_URL}/api/profile/${encodeURIComponent(user.email)}`);

        if (response.ok) {
          const data = await response.json();
          if (data.profile) {
            setProfile(prev => ({ ...prev, ...data.profile }));
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, [user?.email]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleProfileChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
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
          formData.append(key, profile[key] || '');
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
              <button onClick={() => navigate('/')} className="flex items-center gap-2">
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
              <Badge>{user?.plan || 'Free'}</Badge>
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
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'tracker'
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <ClipboardList className="w-4 h-4" />
                    Application Tracker
                  </button>
                  <button
                    onClick={() => setActiveTab('pipeline')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'pipeline'
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <Target className="w-4 h-4" />
                    Human Ninja Pipeline
                  </button>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'profile'
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <User className="w-4 h-4" />
                    My Profile
                  </button>
                  <button
                    onClick={() => setActiveTab('queue')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'queue'
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve Queue
                  </button>
                  <button
                    onClick={() => setActiveTab('billing')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'billing'
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    Billing
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'settings'
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <Settings className="w-4 h-4" />
                    Settings
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
                                  {app.resumeId ? (
                                    <button
                                      onClick={() => navigate('/resumes')}
                                      className="text-primary hover:underline flex items-center gap-1"
                                    >
                                      <FileText className="w-4 h-4" /> Resume
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
                        value={profile.fullName}
                        onChange={(e) => handleProfileChange('fullName', e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        value={profile.email}
                        disabled
                        className="bg-gray-100"
                      />
                    </div>
                    <div>
                      <Label>Phone Number</Label>
                      <Input
                        value={profile.phone}
                        onChange={(e) => handleProfileChange('phone', e.target.value)}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Professional Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5" />
                      Professional Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Years of Experience</Label>
                      <Select value={profile.yearsOfExperience} onValueChange={(v) => handleProfileChange('yearsOfExperience', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select experience" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0-1">0-1 years</SelectItem>
                          <SelectItem value="1-3">1-3 years</SelectItem>
                          <SelectItem value="3-5">3-5 years</SelectItem>
                          <SelectItem value="5-10">5-10 years</SelectItem>
                          <SelectItem value="10+">10+ years</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Current Role</Label>
                      <Input
                        value={profile.currentRole}
                        onChange={(e) => handleProfileChange('currentRole', e.target.value)}
                        placeholder="e.g., Software Engineer"
                      />
                    </div>
                    <div>
                      <Label>Target Role</Label>
                      <Input
                        value={profile.targetRole}
                        onChange={(e) => handleProfileChange('targetRole', e.target.value)}
                        placeholder="e.g., Senior Software Engineer"
                      />
                    </div>
                    <div>
                      <Label>Expected Salary</Label>
                      <Input
                        value={profile.expectedSalary}
                        onChange={(e) => handleProfileChange('expectedSalary', e.target.value)}
                        placeholder="e.g., $120,000 - $150,000"
                      />
                    </div>
                    <div>
                      <Label>Preferred Locations</Label>
                      <Input
                        value={profile.preferredLocations}
                        onChange={(e) => handleProfileChange('preferredLocations', e.target.value)}
                        placeholder="e.g., San Francisco, New York, Remote"
                      />
                    </div>
                    <div>
                      <Label>Remote Preference</Label>
                      <Select value={profile.remotePreference} onValueChange={(v) => handleProfileChange('remotePreference', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select preference" />
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
                      <Label>Preferred Job Types</Label>
                      <Select value={profile.preferredJobTypes} onValueChange={(v) => handleProfileChange('preferredJobTypes', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select job type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fulltime">Full-time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="parttime">Part-time</SelectItem>
                          <SelectItem value="any">Any</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Notice Period</Label>
                      <Select value={profile.noticePeriod} onValueChange={(v) => handleProfileChange('noticePeriod', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select notice period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate</SelectItem>
                          <SelectItem value="1week">1 Week</SelectItem>
                          <SelectItem value="2weeks">2 Weeks</SelectItem>
                          <SelectItem value="1month">1 Month</SelectItem>
                          <SelectItem value="2months">2 Months</SelectItem>
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
                      <Label>Visa Status</Label>
                      <Select value={profile.visaStatus} onValueChange={(v) => handleProfileChange('visaStatus', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select visa status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="f1">F1 (Student Visa)</SelectItem>
                          <SelectItem value="opt">OPT</SelectItem>
                          <SelectItem value="stem-opt">STEM-OPT</SelectItem>
                          <SelectItem value="h1b">H1B</SelectItem>
                          <SelectItem value="h4-ead">H4 EAD</SelectItem>
                          <SelectItem value="l1">L1</SelectItem>
                          <SelectItem value="gc">Green Card</SelectItem>
                          <SelectItem value="citizen">US Citizen</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Requires Sponsorship?</Label>
                      <Select value={profile.requiresSponsorship} onValueChange={(v) => handleProfileChange('requiresSponsorship', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes, I need sponsorship</SelectItem>
                          <SelectItem value="no">No, I don't need sponsorship</SelectItem>
                          <SelectItem value="future">Will need in future</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Willing to Relocate?</Label>
                      <Select value={profile.willingToRelocate} onValueChange={(v) => handleProfileChange('willingToRelocate', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="depends">Depends on location</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Job Portal Credentials */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Job Portal Credentials
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      These credentials help our Ninjas apply on your behalf. Your data is encrypted and secure.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* LinkedIn */}
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-4">
                        <Linkedin className="w-5 h-5 text-blue-600" />
                        <h4 className="font-medium">LinkedIn</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>Profile URL</Label>
                          <Input
                            value={profile.linkedinUrl}
                            onChange={(e) => handleProfileChange('linkedinUrl', e.target.value)}
                            placeholder="https://linkedin.com/in/yourprofile"
                          />
                        </div>
                        <div>
                          <Label>Email</Label>
                          <Input
                            value={profile.linkedinEmail}
                            onChange={(e) => handleProfileChange('linkedinEmail', e.target.value)}
                            placeholder="your@email.com"
                          />
                        </div>
                        <div>
                          <Label>Password</Label>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              value={profile.linkedinPassword}
                              onChange={(e) => handleProfileChange('linkedinPassword', e.target.value)}
                              placeholder="••••••••"
                            />
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Gmail for Job Applications */}
                    <div className="p-4 border rounded-lg bg-red-50">
                      <div className="flex items-center gap-2 mb-4">
                        <Mail className="w-5 h-5 text-red-500" />
                        <h4 className="font-medium">Gmail (For Job Applications)</h4>
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Required</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        Create a new Gmail account specifically for job applications. Your Ninja will use this to apply on your behalf.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Gmail Email</Label>
                          <Input
                            value={profile.gmailEmail}
                            onChange={(e) => handleProfileChange('gmailEmail', e.target.value)}
                            placeholder="yourjobsearch@gmail.com"
                          />
                        </div>
                        <div>
                          <Label>Gmail Password</Label>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              value={profile.gmailPassword}
                              onChange={(e) => handleProfileChange('gmailPassword', e.target.value)}
                              placeholder="••••••••"
                            />
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Indeed */}
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-4">
                        <Briefcase className="w-5 h-5 text-blue-700" />
                        <h4 className="font-medium">Indeed</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Email</Label>
                          <Input
                            value={profile.indeedEmail}
                            onChange={(e) => handleProfileChange('indeedEmail', e.target.value)}
                            placeholder="your@email.com"
                          />
                        </div>
                        <div>
                          <Label>Password</Label>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              value={profile.indeedPassword}
                              onChange={(e) => handleProfileChange('indeedPassword', e.target.value)}
                              placeholder="••••••••"
                            />
                          </div>
                        </div>
                      </div>
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
                  </CardContent>
                </Card>

                {/* Skills & Background */}
                <Card>
                  <CardHeader>
                    <CardTitle>Skills & Background</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Key Skills</Label>
                      <Textarea
                        value={profile.skills}
                        onChange={(e) => handleProfileChange('skills', e.target.value)}
                        placeholder="e.g., JavaScript, React, Node.js, Python, AWS, etc."
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>Education</Label>
                      <Textarea
                        value={profile.education}
                        onChange={(e) => handleProfileChange('education', e.target.value)}
                        placeholder="e.g., M.S. Computer Science, Stanford University, 2023"
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label>Certifications</Label>
                      <Textarea
                        value={profile.certifications}
                        onChange={(e) => handleProfileChange('certifications', e.target.value)}
                        placeholder="e.g., AWS Solutions Architect, Google Cloud Professional"
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label>Additional Notes for Your Ninja</Label>
                      <Textarea
                        value={profile.additionalNotes}
                        onChange={(e) => handleProfileChange('additionalNotes', e.target.value)}
                        placeholder="Any specific preferences, companies to avoid, or other instructions for your Ninja..."
                        rows={3}
                      />
                    </div>
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

            {activeTab === 'settings' && (
              <div className="space-y-6">
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
    </div>
  );
};

export default Dashboard;
