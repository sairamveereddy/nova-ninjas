import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Bot,
  FileText,
  Upload,
  CheckCircle,
  Download,
  ExternalLink,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Briefcase,
  MapPin,
  Building2,
  X,
  Save,
  Target,
  TrendingUp,
  Lightbulb,
  Link
} from 'lucide-react';
import { BRAND } from '../config/branding';
import { API_URL } from '../config/api';
import SideMenu from './SideMenu';
import Header from './Header';
import UpgradeModal from './UpgradeModal';
import './AIApplyFlow.css';

// Helper function to get color based on score
const getScoreColor = (score) => {
  if (score >= 70) return '#22c55e'; // Green
  if (score >= 50) return '#eab308'; // Yellow
  return '#ef4444'; // Red
};

const AIApplyFlow = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  // Get job details from navigation state
  const jobData = location.state || {};

  // Steps: 1=Resume Selection, 2=Generating, 3=Results
  const [currentStep, setCurrentStep] = useState(1);

  // Resume state
  const [savedResumes, setSavedResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [isLoadingResumes, setIsLoadingResumes] = useState(false);
  const [isParsingResume, setIsParsingResume] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');

  // Results state
  const [analysisResult, setAnalysisResult] = useState(null);
  const [optimizedResumeUrl, setOptimizedResumeUrl] = useState(null);
  const [coverLetterUrl, setCoverLetterUrl] = useState(null);
  const [isSavingApplication, setIsSavingApplication] = useState(false);
  const [applicationSaved, setApplicationSaved] = useState(false);
  const [tailoredResume, setTailoredResume] = useState('');
  const [detailedCv, setDetailedCv] = useState('');
  const [tailoredCoverLetter, setTailoredCoverLetter] = useState('');
  const [suggestedAnswers, setSuggestedAnswers] = useState([]);

  const [showSaveResumePrompt, setShowSaveResumePrompt] = useState(false);
  const [resumeName, setResumeName] = useState('');
  const [isSavingResume, setIsSavingResume] = useState(false);
  const [resumeSaved, setResumeSaved] = useState(false);

  // New Usage & Company state
  const [companyName, setCompanyName] = useState(jobData.company || '');
  const [jobUrl, setJobUrl] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [activeTab, setActiveTab] = useState('resume');
  const [isDownloading, setIsDownloading] = useState(null);
  const [customJobDescription, setCustomJobDescription] = useState(jobData.description || '');
  const [customJobTitle, setCustomJobTitle] = useState(jobData.jobTitle || jobData.title || '');
  const [usageLimits, setUsageLimits] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=' + encodeURIComponent(location.pathname));
    }
  }, [isAuthenticated, navigate, location.pathname]);

  // Fetch usage and resumes on mount
  useEffect(() => {
    if (isAuthenticated && user?.email) {
      fetchSavedResumes();
      fetchUsageLimits();
    }
  }, [isAuthenticated, user]);

  const fetchUsageLimits = async () => {
    try {
      const response = await fetch(`${API_URL}/api/usage/limits?email=${encodeURIComponent(user.email)}`);
      if (response.ok) {
        const data = await response.json();
        setUsageLimits(data);
      }
    } catch (error) {
      console.error('Failed to fetch usage limits:', error);
    }
  };

  const fetchSavedResumes = async () => {
    setIsLoadingResumes(true);
    try {
      const response = await fetch(`${API_URL}/api/resumes?email=${encodeURIComponent(user.email)}`);
      if (response.ok) {
        const data = await response.json();
        setSavedResumes(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch resumes:', error);
    } finally {
      setIsLoadingResumes(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeFile(file);
    setSelectedResume(null);
    setResumeText(''); // Reset while parsing
    setIsParsingResume(true);

    // Parse the resume
    const formData = new FormData();
    formData.append('resume', file); // Backend expects 'resume' field

    try {
      const response = await fetch(`${API_URL}/api/scan/parse`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setResumeText(data.text || data.resumeText || '');
        console.log('Resume parsed successfully, text length:', (data.text || data.resumeText || '').length);

        // Auto-set resume name to original file name (without extension)
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setResumeName(nameWithoutExt);
      } else {
        console.error('Failed to parse resume:', response.status);
        // Fallback: use a placeholder so button is enabled
        setResumeText(`[Resume content from: ${file.name}]`);
        setResumeName(file.name.replace(/\.[^/.]+$/, ''));
      }
    } catch (error) {
      console.error('Failed to parse resume:', error);
      // Fallback: use a placeholder so button is enabled
      setResumeText(`[Resume content from: ${file.name}]`);
      setResumeName(file.name.replace(/\.[^/.]+$/, ''));
    } finally {
      setIsParsingResume(false);
    }
  };

  const handleSelectSavedResume = (resume) => {
    setSelectedResume(resume);
    setResumeFile(null);
    setResumeText(resume.resumeText || '');
    setResumeName(resume.resumeName || resume.fileName || 'Resume');
  };

  const handleFetchJobDescription = async () => {
    if (!jobUrl.trim()) return;

    setIsFetchingUrl(true);
    try {
      const response = await fetch(`${API_URL}/api/fetch-job-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: jobUrl.trim() })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch job description');
      }

      const data = await response.json();
      if (data.success) {
        if (data.description) setCustomJobDescription(data.description);
        if (data.jobTitle) setCustomJobTitle(data.jobTitle);
        if (data.company) setCompanyName(data.company);
      } else {
        alert(data.error || 'Failed to fetch job description. Please paste it manually.');
      }
    } catch (error) {
      console.error('Failed to fetch job description:', error);
      alert('Failed to fetch job description. You might need to paste it manually.');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleStartGeneration = async () => {
    // If we have a file but no text, try to parse it again
    let textToUse = resumeText;

    if (!textToUse && resumeFile) {
      // Try parsing the resume again
      const formData = new FormData();
      formData.append('resume', resumeFile);

      try {
        const parseResponse = await fetch(`${API_URL}/api/scan/parse`, {
          method: 'POST',
          body: formData
        });

        if (parseResponse.ok) {
          const parseData = await parseResponse.json();
          textToUse = parseData.text || parseData.resumeText || '';
          setResumeText(textToUse);
        }
      } catch (e) {
        console.error('Re-parse failed:', e);
      }

      // If still no text, use fallback
      if (!textToUse) {
        textToUse = `[Resume uploaded: ${resumeFile.name}]`;
        setResumeText(textToUse);
      }
    }

    if (!textToUse && !resumeFile) {
      alert('Your resume content seems to be empty. Please re-upload your resume.');
      return;
    }

    if (!customJobDescription) {
      alert('Job description is missing');
      return;
    }

    if (!companyName.trim()) {
      alert('Please enter the company name');
      return;
    }

    // Check usage limits
    if (usageLimits && !usageLimits.canGenerate) {
      setShowUpgradeModal(true);
      return;
    }

    setCurrentStep(2);
    setIsGenerating(true);

    try {
      // Step 1: Analyze resume
      setGenerationProgress('Analyzing your resume against the job description...');

      // Create form data for analysis (backend expects file upload)
      const analyzeFormData = new FormData();
      if (resumeFile) {
        analyzeFormData.append('resume', resumeFile);
      } else if (selectedResume) {
        // Create a text file from saved resume text
        const blob = new Blob([textToUse], { type: 'text/plain' });
        analyzeFormData.append('resume', blob, 'resume.txt');
      } else {
        const blob = new Blob([textToUse], { type: 'text/plain' });
        analyzeFormData.append('resume', blob, 'resume.txt');
      }
      analyzeFormData.append('job_description', customJobDescription);

      const analyzeResponse = await fetch(`${API_URL}/api/scan/analyze`, {
        method: 'POST',
        body: analyzeFormData
      });

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Analysis failed');
      }
      const analysisData = await analyzeResponse.json();
      const analysis = analysisData.analysis || analysisData;
      setAnalysisResult(analysis);

      // Use resume text from analysis if available (properly parsed from file)
      const parsedResumeText = analysisData.resumeText || textToUse;

      // Update resumeText state so it's available for saving
      if (parsedResumeText && parsedResumeText !== resumeText) {
        setResumeText(parsedResumeText);
      }

      // Step 2: Generate optimized resume
      setGenerationProgress('Creating your tailored resume...');

      const applyFormData = new FormData();
      applyFormData.append('userId', user.id);
      applyFormData.append('jobId', jobData.jobId || jobData.id || '');
      applyFormData.append('jobTitle', customJobTitle);
      applyFormData.append('company', companyName);
      applyFormData.append('jobDescription', customJobDescription);
      applyFormData.append('jobUrl', jobUrl || jobData.sourceUrl || jobData.url || '');

      if (resumeFile) {
        applyFormData.append('resume', resumeFile);
      } else if (textToUse) {
        const blob = new Blob([textToUse], { type: 'text/plain' });
        applyFormData.append('resume', blob, 'resume.txt');
      }

      const applyResponse = await fetch(`${API_URL}/api/ai-ninja/apply`, {
        method: 'POST',
        body: applyFormData
      });

      if (!applyResponse.ok) {
        const errorData = await applyResponse.json().catch(() => ({}));
        if (applyResponse.status === 403) {
          setShowUpgradeModal(true);
          throw new Error('Usage limit reached');
        }
        throw new Error(errorData.detail || 'Application generation failed');
      }

      const applyData = await applyResponse.json();

      // Update usage from response
      if (applyData.usage) {
        setUsageLimits(applyData.usage);
      }

      // Set results for display
      setTailoredResume(applyData.tailoredResume);
      setDetailedCv(applyData.detailedCv || '');
      setTailoredCoverLetter(applyData.tailoredCoverLetter);
      setSuggestedAnswers(applyData.suggestedAnswers);
      setApplicationSaved(true); // Backend saves it now

      setGenerationProgress('Done! Your application materials are ready.');
      setCurrentStep(3);

      // Show save resume prompt if user uploaded a new resume (not using saved one)
      if (resumeFile && !selectedResume && isAuthenticated) {
        setTimeout(() => {
          setShowSaveResumePrompt(true);
          setResumeName(resumeFile.name.replace(/\.[^/.]+$/, '') || 'My Resume');
        }, 500);
      }

    } catch (error) {
      console.error('Generation failed:', error);
      setGenerationProgress(error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveApplication = async () => {
    if (!isAuthenticated || !user?.email) {
      navigate('/login');
      return;
    }

    setIsSavingApplication(true);

    try {
      const applicationData = {
        userEmail: user.email,
        jobId: jobData.jobId || null,
        jobTitle: jobData.jobTitle,
        company: jobData.company,
        location: jobData.location || '',
        jobDescription: jobData.description,
        sourceUrl: jobData.sourceUrl || '',
        salaryRange: jobData.salaryRange || '',
        matchScore: analysisResult?.matchScore || 0,
        status: 'materials_ready',
        createdAt: new Date().toISOString()
      };

      const response = await fetch(`${API_URL}/api/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(applicationData)
      });

      if (response.ok) {
        setApplicationSaved(true);
      }
    } catch (error) {
      console.error('Failed to save application:', error);
    } finally {
      setIsSavingApplication(false);
    }
  };

  const handleSaveResume = async () => {
    if (!isAuthenticated || !user?.email) {
      alert('Please sign in to save your resume');
      return;
    }

    // Use the current resume text, or fall back to any available text
    const textToSave = resumeText || selectedResume?.resumeText || '';

    if (!textToSave) {
      alert('No resume content to save');
      return;
    }

    setIsSavingResume(true);

    try {
      const resumeData = {
        user_email: user.email,
        resume_name: resumeName || `Resume_${new Date().toLocaleDateString().replace(/\//g, '-')}`,
        resume_text: textToSave,
        file_name: resumeFile?.name || ''
      };

      console.log('Saving resume:', { ...resumeData, resume_text: `[${textToSave.length} chars]` });
      console.log('API URL:', `${API_URL}/api/resumes/save`);

      const response = await fetch(`${API_URL}/api/resumes/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resumeData)
      });

      console.log('Response status:', response.status);
      const responseData = await response.json();
      console.log('Response data:', responseData);

      if (response.ok || responseData.success) {
        setResumeSaved(true);
        setShowSaveResumePrompt(false);
        // Refresh saved resumes list
        fetchSavedResumes();
      } else {
        alert(responseData.detail || 'Failed to save resume. Please try again.');
      }
    } catch (error) {
      console.error('Failed to save resume:', error);
      alert('Network error: ' + error.message);
    } finally {
      console.log('Save complete, stopping loading');
      setIsSavingResume(false);
    }
  };

  const handleDownload = async (type) => {
    setIsDownloading(type);
    try {
      let endpoint = '';
      let payload = {};
      let fileName = '';

      if (type === 'resume') {
        endpoint = `${API_URL}/api/generate/resume`;
        payload = {
          userId: user.id,
          resume_text: tailoredResume,
          company: companyName,
          job_description: customJobDescription,
          analysis: {}
        };
        fileName = `Optimized_Resume_${companyName.replace(/\s+/g, '_')}.docx`;
      } else if (type === 'cv') {
        endpoint = `${API_URL}/api/generate/cv`;
        payload = {
          userId: user.id,
          resume_text: detailedCv,
          company: companyName,
          job_description: customJobDescription,
          analysis: {}
        };
        fileName = `Detailed_CV_${companyName.replace(/\s+/g, '_')}.docx`;
      } else if (type === 'cover') {
        endpoint = `${API_URL}/api/generate/cover-letter`;
        payload = {
          userId: user.id,
          resume_text: tailoredResume, // Base resume for context
          job_description: customJobDescription,
          job_title: customJobTitle,
          company: companyName
        };
        fileName = `Cover_Letter_${companyName.replace(/\s+/g, '_')}.docx`;
      }

      console.log(`Downloading ${type} from ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`Failed to generate ${type}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error(`Download failed:`, error);
      alert(`Failed to download ${type}. Please try again.`);
    } finally {
      setIsDownloading(null);
    }
  };

  const handleGoToJobPage = () => {
    if (jobData.sourceUrl) {
      window.open(jobData.sourceUrl, '_blank');
    }
  };

  // Job Info Header component
  const JobHeader = () => {
    const title = customJobTitle || jobData.jobTitle || "New Application";
    const company = companyName || jobData.company;

    return (
      <Card className="job-info-card">
        <div className="job-info-header">
          <div>
            <h1 className="job-title">{title}</h1>
            <div className="job-meta">
              {company && <span><Building2 className="w-4 h-4" /> {company}</span>}
              {jobData.location && <span><MapPin className="w-4 h-4" /> {jobData.location}</span>}
            </div>
          </div>
          <Button variant="ghost" onClick={() => navigate('/ai-ninja')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="ai-apply-page">
      <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />
      <Header onMenuClick={() => setSideMenuOpen(true)} />

      <div className="ai-apply-container">
        {/* Job Info Header */}
        <JobHeader />

        {/* Progress Steps */}
        <div className="progress-steps">
          <div className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
            <div className="step-number">1</div>
            <span>Select Resume</span>
          </div>
          <div className="step-line"></div>
          <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
            <div className="step-number">2</div>
            <span>Generating</span>
          </div>
          <div className="step-line"></div>
          <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <span>Download & Apply</span>
          </div>
        </div>

        {/* Step 1: Resume Selection & Job Details */}
        {currentStep === 1 && (
          <Card className="ai-apply-card">
            {/* Job Details Section at the TOP */}
            <div className="job-description-section mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-slate-900">
                <Link className="w-5 h-5 text-green-600" />
                Paste the job link to continue
              </h3>

              <div className="url-fetch-box mb-6">
                <div className="flex gap-2">
                  <Input
                    placeholder="https://www.linkedin.com/jobs/view/..."
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    className="flex-grow h-12 text-base shadow-sm border-slate-300 focus:border-green-500 focus:ring-green-500"
                  />
                  <Button
                    onClick={handleFetchJobDescription}
                    disabled={isFetchingUrl || !jobUrl.trim()}
                    className="h-12 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold transition-all shadow-md"
                  >
                    {isFetchingUrl ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Fetch Details'}
                  </Button>
                </div>
                <p className="mt-2 text-sm text-slate-500 italic">
                  Supported: LinkedIn, Indeed, Glassdoor, and more.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Applying to Company*</Label>
                    <Input
                      placeholder="e.g. Google"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="mt-1 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Job Title*</Label>
                    <Input
                      placeholder="e.g. Senior Product Designer"
                      value={customJobTitle}
                      onChange={(e) => setCustomJobTitle(e.target.value)}
                      className="mt-1 bg-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Job Description*</Label>
                    {!customJobDescription && (
                      <button
                        type="button"
                        onClick={() => setCustomJobDescription(' ')}
                        className="text-xs text-green-600 hover:underline font-medium"
                      >
                        Enter Manually
                      </button>
                    )}
                  </div>
                  {(customJobDescription || jobUrl) && (
                    <Textarea
                      value={customJobDescription}
                      onChange={(e) => setCustomJobDescription(e.target.value)}
                      className="mt-1 min-h-[180px] bg-white text-slate-700 leading-relaxed"
                      placeholder="Paste the full job description text here..."
                      required
                    />
                  )}
                </div>
              </div>
            </div>

            <h2><FileText className="w-5 h-5" /> Select Your Resume</h2>
            <p className="card-description">
              Choose a saved resume or upload a new one. We'll tailor it for this job.
            </p>

            {/* Saved Resumes */}
            {isAuthenticated && (
              <div className="saved-resumes-section">
                <h3>Your Saved Resumes</h3>
                {isLoadingResumes ? (
                  <p className="loading-text"><Loader2 className="w-4 h-4 animate-spin" /> Loading your resumes...</p>
                ) : savedResumes.length > 0 ? (
                  <div className="saved-resumes-grid">
                    {savedResumes.map(resume => (
                      <div
                        key={resume.id}
                        className={`saved-resume-item ${selectedResume?.id === resume.id ? 'selected' : ''}`}
                        onClick={() => handleSelectSavedResume(resume)}
                      >
                        <FileText className="w-5 h-5 text-indigo-500" />
                        <span>{resume.resumeName || resume.fileName || 'Resume'}</span>
                        {selectedResume?.id === resume.id && <CheckCircle className="w-4 h-4 text-green-500" />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-resumes-text">No saved resumes yet.</p>
                )}
              </div>
            )}

            {/* Upload New */}
            <div className="upload-section">
              <h3>Or Upload New Resume</h3>
              <label className="upload-zone">
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <Upload className="w-8 h-8 text-gray-400" />
                <p>Click to upload or drag & drop</p>
                <span>PDF, DOCX, or TXT</span>
              </label>
              {resumeFile && (
                <div className="selected-file">
                  {isParsingResume ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  <span>{resumeFile.name}</span>
                  {isParsingResume && <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Parsing...</span>}
                  {!isParsingResume && resumeText && <CheckCircle className="w-4 h-4 text-green-500" />}
                  <button onClick={() => { setResumeFile(null); setResumeText(''); }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="card-actions">
              <Button
                className="btn-primary btn-large"
                onClick={handleStartGeneration}
                disabled={isParsingResume || (!resumeText && !resumeFile && !selectedResume)}
              >
                {isParsingResume ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Parsing Resume...</>
                ) : (
                  <><Bot className="w-5 h-5 mr-2" /> Generate Tailored Application <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Generating */}
        {currentStep === 2 && (
          <Card className="ai-apply-card generating-card">
            <div className="generating-content">
              <Loader2 className="w-16 h-16 animate-spin text-primary" />
              <h2>AI Ninja is Working...</h2>
              <p className="generation-status">{generationProgress}</p>
              <div className="generation-steps">
                <div className="gen-step completed">
                  <CheckCircle className="w-4 h-4" /> Reading your resume
                </div>
                <div className={`gen-step ${generationProgress.includes('resume') ? 'active' : ''}`}>
                  <FileText className="w-4 h-4" /> Creating tailored resume
                </div>
                <div className={`gen-step ${generationProgress.includes('cover') ? 'active' : ''}`}>
                  <FileText className="w-4 h-4" /> Writing cover letter
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Step 3: Results */}
        {currentStep === 3 && (
          <Card className="ai-apply-card results-card">
            <div className="results-header">
              <CheckCircle className="w-12 h-12 text-green-500" />
              <h2>Your Application Materials Are Ready!</h2>
              <p>Download your tailored resume and cover letter, then apply to the job.</p>
            </div>

            {/* Download Buttons - Restored & Fixed */}
            <div className="download-section bg-indigo-50 p-6 rounded-2xl border border-indigo-100 mb-8">
              <div className="flex flex-col md:flex-row gap-4">
                <Button
                  className="flex-1 h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-3"
                  onClick={() => handleDownload('resume')}
                  disabled={!tailoredResume || isDownloading === 'resume'}
                >
                  {isDownloading === 'resume' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  Download ATS Resume
                </Button>

                <Button
                  className="flex-1 h-14 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-3"
                  onClick={() => handleDownload('cv')}
                  disabled={!detailedCv || isDownloading === 'cv'}
                >
                  {isDownloading === 'cv' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  Download Detailed CV
                </Button>

                <Button
                  className="flex-1 h-14 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-3"
                  onClick={() => handleDownload('cover')}
                  disabled={!tailoredCoverLetter || isDownloading === 'cover'}
                >
                  {isDownloading === 'cover' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  Download Cover Letter
                </Button>
              </div>
              <p className="text-center mt-4 text-xs font-semibold text-indigo-400 uppercase tracking-widest">
                DOCX FORMAT • ATS FRIENDLY • ZERO HALLUCINATIONS
              </p>
            </div>

            {/* AI Generated Content Tabs */}
            <div className="generated-content-tabs mt-8">
              <div className="flex border-b border-slate-200 mb-6 gap-2">
                <button
                  className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${!activeTab || activeTab === 'resume' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  style={{ marginBottom: '-2px' }}
                  onClick={() => setActiveTab('resume')}
                >
                  <FileText className="w-4 h-4 inline mr-2" /> ATS Resume
                </button>
                <button
                  className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'cv' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  style={{ marginBottom: '-2px' }}
                  onClick={() => setActiveTab('cv')}
                >
                  <Briefcase className="w-4 h-4 inline mr-2" /> Detailed CV
                </button>
                <button
                  className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'cover' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  style={{ marginBottom: '-2px' }}
                  onClick={() => setActiveTab('cover')}
                >
                  <FileText className="w-4 h-4 inline mr-2" /> Cover Letter
                </button>
              </div>

              <div className="content-display bg-white rounded-xl p-8 border border-slate-200 shadow-sm min-h-[400px]">
                {(!activeTab || activeTab === 'resume') && tailoredResume && (
                  <div className="resume-preview whitespace-pre-wrap font-serif text-slate-800 leading-relaxed max-h-[600px] overflow-y-auto pr-2">
                    {tailoredResume}
                  </div>
                )}
                {activeTab === 'cv' && detailedCv && (
                  <div className="cv-preview whitespace-pre-wrap font-serif text-slate-800 leading-relaxed max-h-[600px] overflow-y-auto pr-2">
                    {detailedCv}
                  </div>
                )}
                {activeTab === 'cover' && tailoredCoverLetter && (
                  <div className="cover-letter-preview whitespace-pre-wrap font-serif text-slate-800 leading-relaxed max-h-[600px] overflow-y-auto pr-2">
                    {tailoredCoverLetter}
                  </div>
                )}
                {((activeTab === 'resume' && !tailoredResume) || (activeTab === 'cv' && !detailedCv) || (activeTab === 'cover' && !tailoredCoverLetter)) && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                    <Loader2 className="w-8 h-8 animate-spin mb-4" />
                    <p>Document content is loading or not available...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Resume Analysis Section - Full Details */}
            {analysisResult && (
              <div className="full-analysis-section">
                <h3 className="analysis-title">Resume Analysis</h3>

                {/* Match Score Circle with Summary */}
                <div className="match-summary-card">
                  <div className="score-circle-large" style={{
                    background: `conic-gradient(${getScoreColor(analysisResult.matchScore || 0)} ${(analysisResult.matchScore || 0) * 3.6}deg, #e5e7eb ${(analysisResult.matchScore || 0) * 3.6}deg)`
                  }}>
                    <div className="score-inner">
                      <span className="score-number">{analysisResult.matchScore || 0}%</span>
                    </div>
                  </div>
                  <div className="match-summary-text">
                    <h4 className={`match-level ${(analysisResult.matchScore || 0) >= 70 ? 'strong' : (analysisResult.matchScore || 0) >= 50 ? 'moderate' : 'needs-work'}`}>
                      {(analysisResult.matchScore || 0) >= 70 ? 'Strong Match' : (analysisResult.matchScore || 0) >= 50 ? 'Moderate Match' : 'Needs Improvement'}
                    </h4>
                    <p>{analysisResult.summary || 'Your resume has been analyzed against this job description.'}</p>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="quick-stats-grid">
                  <div className="stat-item">
                    <Target className="w-5 h-5" />
                    <span className="stat-label">HARD SKILLS</span>
                    <span className="stat-value" style={{ color: getScoreColor(analysisResult.hardSkills?.score || 0) }}>
                      {analysisResult.hardSkills?.score || 0}%
                    </span>
                  </div>
                  <div className="stat-item">
                    <TrendingUp className="w-5 h-5" />
                    <span className="stat-label">SOFT SKILLS</span>
                    <span className="stat-value" style={{ color: getScoreColor(analysisResult.softSkills?.score || 0) }}>
                      {analysisResult.softSkills?.score || 0}%
                    </span>
                  </div>
                  <div className="stat-item">
                    <Briefcase className="w-5 h-5" />
                    <span className="stat-label">EXPERIENCE</span>
                    <span className="stat-value" style={{ color: getScoreColor(analysisResult.experience?.score || 0) }}>
                      {analysisResult.experience?.score || 0}%
                    </span>
                  </div>
                  <div className="stat-item">
                    <FileText className="w-5 h-5" />
                    <span className="stat-label">SEARCHABILITY</span>
                    <span className="stat-value" style={{ color: getScoreColor(analysisResult.searchability?.score || 0) }}>
                      {analysisResult.searchability?.score || 0}%
                    </span>
                  </div>
                </div>

                {/* Hard Skills Section */}
                <div className="skills-section">
                  <div className="section-header">
                    <h4>Hard Skills</h4>
                    <span className="skills-badge">
                      {analysisResult.hardSkills?.matched?.length || 0} MATCHED, {analysisResult.hardSkills?.missing?.length || 0} MISSING
                    </span>
                  </div>
                  <div className="skills-columns">
                    <div className="skills-column matched-column">
                      <h5>✅ Matched Skills</h5>
                      {analysisResult.hardSkills?.matched?.slice(0, 8).map((skill, i) => (
                        <div key={i} className="skill-chip matched">
                          {typeof skill === 'string' ? skill : skill.skill}
                        </div>
                      ))}
                      {(!analysisResult.hardSkills?.matched || analysisResult.hardSkills.matched.length === 0) && (
                        <p className="no-skills">No matched skills found</p>
                      )}
                    </div>
                    <div className="skills-column missing-column">
                      <h5>❌ Missing Skills</h5>
                      {analysisResult.hardSkills?.missing?.slice(0, 8).map((skill, i) => (
                        <div key={i} className="skill-chip missing">
                          {typeof skill === 'string' ? skill : skill.skill}
                        </div>
                      ))}
                      {(!analysisResult.hardSkills?.missing || analysisResult.hardSkills.missing.length === 0) && (
                        <p className="no-skills">No missing skills</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Soft Skills Section */}
                <div className="skills-section">
                  <div className="section-header">
                    <h4>Soft Skills</h4>
                    <span className="skills-badge">
                      {analysisResult.softSkills?.matched?.length || 0} MATCHED, {analysisResult.softSkills?.missing?.length || 0} MISSING
                    </span>
                  </div>
                  <div className="skills-columns">
                    <div className="skills-column matched-column">
                      <h5>✅ Found</h5>
                      {analysisResult.softSkills?.matched?.slice(0, 6).map((skill, i) => (
                        <div key={i} className="skill-chip matched">
                          {typeof skill === 'string' ? skill : skill.skill}
                        </div>
                      ))}
                      {(!analysisResult.softSkills?.matched || analysisResult.softSkills.matched.length === 0) && (
                        <p className="no-skills">No soft skills found</p>
                      )}
                    </div>
                    <div className="skills-column missing-column">
                      <h5>❌ Missing</h5>
                      {analysisResult.softSkills?.missing?.slice(0, 6).map((skill, i) => (
                        <div key={i} className="skill-chip missing">
                          {typeof skill === 'string' ? skill : skill.skill}
                        </div>
                      ))}
                      {(!analysisResult.softSkills?.missing || analysisResult.softSkills.missing.length === 0) && (
                        <p className="no-skills">No missing skills</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recruiter Tips */}
                {analysisResult.tips && analysisResult.tips.length > 0 && (
                  <div className="tips-section">
                    <h4><Lightbulb className="w-5 h-5" /> Recruiter Tips</h4>
                    <ul className="tips-list">
                      {analysisResult.tips.slice(0, 5).map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="results-actions">
              {jobData.sourceUrl && (
                <Button className="btn-primary btn-large" onClick={handleGoToJobPage}>
                  <ExternalLink className="w-5 h-5 mr-2" /> Go to Job Page & Apply
                </Button>
              )}

              {!applicationSaved ? (
                <Button
                  variant="outline"
                  onClick={handleSaveApplication}
                  disabled={isSavingApplication}
                >
                  {isSavingApplication ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" /> Save to Application Tracker</>
                  )}
                </Button>
              ) : (
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  <CheckCircle className="w-4 h-4 mr-2" /> View in Tracker
                </Button>
              )}
            </div>

            {/* Tips */}
            <div className="application-tips">
              <h4>Next Steps:</h4>
              <ul>
                <li>Download both documents</li>
                <li>Click "Go to Job Page" to open the application</li>
                <li>Upload your tailored resume and cover letter</li>
                <li>Track your application status in your dashboard</li>
              </ul>
            </div>
          </Card>
        )}
      </div>

      {/* REDESIGNED: Save Resume Prompt Modal */}
      {showSaveResumePrompt && (
        <div className="modal-overlay glassmorphism" onClick={() => setShowSaveResumePrompt(false)}>
          <Card
            className="save-resume-modal mt-8 md:mt-20 premium-shadow"
            onClick={(e) => e.stopPropagation()}
            style={{
              borderRadius: '24px',
              overflow: 'hidden',
              border: 'none',
              maxWidth: '450px',
              width: '90%'
            }}
          >
            <div className="p-0">
              <div className="bg-slate-900 p-6 text-white relative overflow-hidden">
                {/* Decorative background circle */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500 rounded-full blur-[60px] opacity-40"></div>

                <div className="flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500 rounded-lg">
                      <Save className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight">Save Resume</h2>
                  </div>
                  <button className="text-slate-400 hover:text-white transition-colors" onClick={() => setShowSaveResumePrompt(false)}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-8 bg-white">
                <p className="text-slate-600 leading-relaxed mb-6">
                  Would you like to save <span className="font-semibold text-slate-800">"{resumeName}"</span> for future job applications?
                </p>

                <div className="space-y-4">
                  <div className="form-group">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Resume Name</Label>
                    <Input
                      placeholder="e.g., Software Engineer Resume"
                      value={resumeName}
                      onChange={(e) => setResumeName(e.target.value)}
                      className="h-12 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-slate-800 font-medium px-4 bg-slate-50"
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-10">
                  <Button
                    variant="ghost"
                    className="flex-1 h-12 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-semibold"
                    onClick={() => setShowSaveResumePrompt(false)}
                  >
                    No, Thanks
                  </Button>
                  <Button
                    className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-100 transition-all transform hover:-translate-y-1 active:translate-y-0"
                    onClick={handleSaveResume}
                    disabled={isSavingResume || !resumeName.trim()}
                  >
                    {isSavingResume ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</>
                    ) : (
                      <><Save className="w-4 h-4 mr-2" /> Save Now</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Resume Saved Toast */}
      {
        resumeSaved && (
          <div className="toast-notification" style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            background: '#10b981',
            color: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000
          }}>
            <CheckCircle className="w-5 h-5" />
            Resume saved! You can use it for future applications.
          </div>
        )
      }

      {/* Upgrade Modal */}
      {
        showUpgradeModal && usageLimits && (
          <UpgradeModal
            tier={usageLimits.tier}
            limit={usageLimits.limit}
            resetDate={usageLimits.resetDate}
            onClose={() => setShowUpgradeModal(false)}
          />
        )
      }
    </div >
  );
};

export default AIApplyFlow;

