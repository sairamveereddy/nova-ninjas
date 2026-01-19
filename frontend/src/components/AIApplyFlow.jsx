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
  Link,
  Copy,
  Clock,
  Trash2
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
        setSavedResumes(data.resumes || []);
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

  const handleDeleteResume = async (resumeId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this resume?')) return;

    try {
      const response = await fetch(`${API_URL}/api/resumes/${resumeId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSavedResumes(prev => prev.filter(r => r.id !== resumeId));
        if (selectedResume?.id === resumeId) {
          setSelectedResume(null);
          setResumeText('');
        }
      } else {
        alert('Failed to delete resume');
      }
    } catch (error) {
      console.error('Error deleting resume:', error);
      alert('Error deleting resume');
    }
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch job description');
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

  const sanitizeFileName = (base, company, extension) => {
    const safeCompany = (company || 'Company').trim().replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
    return `${base}_${safeCompany}.${extension}`;
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
          analysis: {},
          is_already_tailored: true
        };
        fileName = sanitizeFileName('Optimized_Resume', companyName, 'docx');
      } else if (type === 'cv') {
        endpoint = `${API_URL}/api/generate/cv`;
        payload = {
          userId: user.id,
          resume_text: detailedCv,
          company: companyName,
          job_description: customJobDescription,
          analysis: {},
          is_already_tailored: true
        };
        fileName = sanitizeFileName('Detailed_CV', companyName, 'docx');
      } else if (type === 'cover') {
        endpoint = `${API_URL}/api/generate/cover-letter`;
        payload = {
          userId: user.id,
          resume_text: tailoredResume, // Base resume for context
          job_description: customJobDescription,
          job_title: customJobTitle,
          company: companyName
        };
        fileName = sanitizeFileName('Cover_Letter', companyName, 'docx');
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
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      // Cleanup with delay to ensure download starts
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error(`Download failed:`, error);
      alert(`Failed to download ${type}. Please try again.`);
    } finally {
      setIsDownloading(null);
    }
  };

  // Copy to clipboard function
  const copyToClipboard = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      // Create a temporary toast or alert
      alert(`${type} copied to clipboard!`);
    }).catch(err => {
      console.error('Failed to copy!', err);
    });
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
            <div className="step-number">{currentStep > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}</div>
            <span>Select Resume</span>
          </div>
          <div className="step-line"></div>
          <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
            <div className="step-number">{currentStep > 2 ? <CheckCircle className="w-5 h-5" /> : '2'}</div>
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
          <div className="ai-apply-card-wrapper">
            <Card className="ai-apply-card">
              <h2>Upload Your Resume</h2>
              <p className="card-description">
                We'll analyze your resume against the job description to find the best match.
              </p>

              {/* Saved Resumes Section - ResumeScanner Style */}
              {isAuthenticated && savedResumes.length > 0 && (
                <div className="saved-resumes-section">
                  <h3>
                    <FileText className="w-5 h-5" />
                    Your Saved Resumes <span className="text-slate-400 font-normal ml-2">({savedResumes.length}/3)</span>
                  </h3>
                  <div className="saved-resumes-grid">
                    {savedResumes.map(resume => (
                      <div
                        key={resume.id}
                        className={`saved-resume-item ${selectedResume?.id === resume.id ? 'selected' : ''}`}
                        onClick={() => handleSelectSavedResume(resume)}
                      >
                        <div className="resume-icon-wrapper">
                          <FileText className="w-8 h-8 text-indigo-500" />
                        </div>
                        <div className="resume-info">
                          <span className="resume-name text-truncate">{resume.resumeName || resume.fileName || 'Resume'}</span>
                          <span className="resume-date">
                            <Clock className="w-3 h-3" />
                            {resume.updatedAt ? new Date(resume.updatedAt).toLocaleDateString() : 'Recent'}
                          </span>
                        </div>
                        <div className="resume-actions-overlay">
                          <button
                            className="delete-resume-btn"
                            onClick={(e) => handleDeleteResume(resume.id, e)}
                            title="Delete Resume"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {selectedResume?.id === resume.id && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 relative z-10" />}
                      </div>
                    ))}
                  </div>
                  <div className="divider-or">
                    <span>or upload a new resume</span>
                  </div>
                </div>
              )}

              {/* Upload New - ResumeScanner Style */}
              <div
                className={`upload-zone ${resumeFile ? 'has-file' : ''}`}
                onClick={() => document.getElementById('resume-upload-input').click()}
              >
                <input
                  id="resume-upload-input"
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />

                {resumeFile ? (
                  <div className="uploaded-file">
                    <FileText className="w-12 h-12 text-indigo-500" />
                    <span className="file-name">{resumeFile.name}</span>
                    <span className="file-size">{(resumeFile.size / 1024).toFixed(1)} KB</span>
                    <button className="remove-file" onClick={(e) => { e.stopPropagation(); setResumeFile(null); setResumeText(''); }}>
                      <X className="w-4 h-4" /> Change
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-slate-300" />
                    <p>Drag & Drop or <span className="choose-file">Choose file</span> to upload</p>
                    <span className="file-types">as .pdf or .docx file</span>
                  </>
                )}

                {isParsingResume && (
                  <div className="parsing-overlay">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    <span>Parsing Resume...</span>
                  </div>
                )}
              </div>

              {/* Job Details Section - Simplified & Conditional */}
              <div className="job-details-review mt-12 pt-8 border-t border-slate-100">
                <h3 className="flex items-center gap-2 mb-6 text-lg font-bold text-slate-900">
                  <Briefcase className="w-5 h-5 text-indigo-600" />
                  Review Job Details
                </h3>

                {/* Only show URL fetcher if we don't have job description */}
                {!jobData.description && (
                  <div className="url-fetch-box mb-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <Label className="text-sm font-bold text-slate-600 mb-2 block">Paste the job link to auto-fill</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://www.linkedin.com/jobs/view/..."
                        value={jobUrl}
                        onChange={(e) => setJobUrl(e.target.value)}
                        className="flex-grow h-11"
                      />
                      <Button
                        onClick={handleFetchJobDescription}
                        disabled={isFetchingUrl || !jobUrl.trim()}
                        className="h-11 px-6 bg-green-600 hover:bg-green-700"
                      >
                        {isFetchingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch'}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="form-group text-left">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Company Name</Label>
                    <Input
                      placeholder="e.g. Amazon"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="bg-slate-50/50"
                    />
                  </div>
                  <div className="form-group text-left">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Job Title</Label>
                    <Input
                      placeholder="e.g. Senior Software Engineer"
                      value={customJobTitle}
                      onChange={(e) => setCustomJobTitle(e.target.value)}
                      className="bg-slate-50/50"
                    />
                  </div>
                </div>

                <div className="form-group text-left">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Job Description</Label>
                  <Textarea
                    placeholder="Paste the full job description here..."
                    value={customJobDescription}
                    onChange={(e) => setCustomJobDescription(e.target.value)}
                    className="min-h-[200px] bg-slate-50/50 leading-relaxed text-sm"
                  />
                </div>
              </div>

              <div className="card-actions mt-10">
                <Button
                  className="btn-primary btn-large w-full h-14 text-lg font-bold rounded-2xl shadow-lg shadow-green-100"
                  onClick={handleStartGeneration}
                  disabled={isParsingResume || (!resumeText && !resumeFile && !selectedResume) || !customJobDescription}
                >
                  {isParsingResume ? (
                    <><Loader2 className="w-5 h-5 mr-3 animate-spin" /> Parsing Resume...</>
                  ) : (
                    <><Bot className="w-5 h-5 mr-3" /> Generate Tailored Application <ArrowRight className="w-5 h-5 ml-2" /></>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Step 2: Generating */}
        {currentStep === 2 && (
          <Card className="ai-apply-card generating-card">
            <div className="generating-content py-12">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-25"></div>
                <div className="relative bg-white p-6 rounded-full shadow-xl">
                  <Bot className="w-16 h-16 text-indigo-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">AI Ninja is Working...</h2>
              <p className="generation-status text-slate-500 font-medium h-6">{generationProgress}</p>

              <div className="generation-progress-bar w-full max-w-md bg-slate-100 h-2 rounded-full mt-8 overflow-hidden">
                <div className="bg-indigo-600 h-full animate-shimmer" style={{ width: '100%' }}></div>
              </div>

              <div className="generation-steps mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl px-4">
                <div className="gen-step-item completed">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Resume Parsed</span>
                </div>
                <div className={`gen-step-item ${generationProgress.includes('resume') ? 'active' : generationProgress.includes('Done') || generationProgress.includes('cover') ? 'completed' : ''}`}>
                  {generationProgress.includes('resume') ? <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> : <CheckCircle className="w-5 h-5" />}
                  <span>Tailoring Resume</span>
                </div>
                <div className={`gen-step-item ${generationProgress.includes('cover') ? 'active' : generationProgress.includes('Done') ? 'completed' : ''}`}>
                  {generationProgress.includes('cover') ? <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> : <CheckCircle className="w-5 h-5" />}
                  <span>Writing Cover Letter</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Step 3: Results */}
        {currentStep === 3 && (
          <Card className="ai-apply-card results-card">
            <div className="results-header-new flex flex-col items-center text-center p-8 bg-slate-50 rounded-2xl mb-8">
              <div className="bg-green-100 p-4 rounded-full mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">Your Application Materials Are Ready!</h2>
              <p className="text-slate-500 mt-2 max-w-lg">We've generated high-impact materials tailored specifically for this {customJobTitle} role.</p>
            </div>

            {/* Main Action Buttons */}
            <div className="results-main-actions grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              <Button
                className="h-16 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 group"
                onClick={() => handleDownload('resume')}
                disabled={!tailoredResume || isDownloading === 'resume'}
              >
                <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                <div className="text-left">
                  <div className="text-xs opacity-75 font-medium uppercase tracking-wider">Download</div>
                  <div>ATS Resume</div>
                </div>
              </Button>

              <Button
                className="h-16 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 group"
                onClick={() => handleDownload('cv')}
                disabled={!detailedCv || isDownloading === 'cv'}
              >
                <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                <div className="text-left">
                  <div className="text-xs opacity-75 font-medium uppercase tracking-wider">Download</div>
                  <div>Detailed CV</div>
                </div>
              </Button>

              <Button
                className="h-16 bg-white hover:bg-slate-50 text-indigo-600 border-2 border-indigo-100 font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-3 group"
                onClick={() => handleDownload('cover')}
                disabled={!tailoredCoverLetter || isDownloading === 'cover'}
              >
                <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform text-indigo-400" />
                <div className="text-left">
                  <div className="text-xs opacity-75 font-medium uppercase tracking-wider">Download</div>
                  <div>Cover Letter</div>
                </div>
              </Button>
            </div>

            {/* AI Generated Content Tabs */}
            <div className="generated-content-tabs">
              <div className="flex bg-slate-100/50 p-1.5 rounded-2xl mb-6 gap-1 max-w-min">
                <button
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${!activeTab || activeTab === 'resume' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setActiveTab('resume')}
                >
                  <FileText className="w-4 h-4" /> Resume
                </button>
                <button
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'cv' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setActiveTab('cv')}
                >
                  <Briefcase className="w-4 h-4" /> Detailed CV
                </button>
                <button
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'cover' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setActiveTab('cover')}
                >
                  <FileText className="w-4 h-4" /> Cover Letter
                </button>
              </div>

              <div className="content-display-wrapper relative group/content">
                <div className="content-display bg-white rounded-2xl p-8 border border-slate-200 shadow-inner min-h-[500px] overflow-hidden">
                  {/* Floating Copy Button */}
                  <div className="absolute top-4 right-4 z-10 opacity-0 group-hover/content:opacity-100 transition-opacity">
                    <Button
                      onClick={() => copyToClipboard(
                        activeTab === 'cv' ? detailedCv : activeTab === 'cover' ? tailoredCoverLetter : tailoredResume,
                        activeTab === 'cv' ? 'CV' : activeTab === 'cover' ? 'Cover Letter' : 'Resume'
                      )}
                      className="bg-slate-900/90 text-white h-10 px-4 rounded-xl backdrop-blur-sm"
                    >
                      <Copy className="w-4 h-4 mr-2" /> Copy Text
                    </Button>
                  </div>

                  <div className="scroll-container max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                    {(!activeTab || activeTab === 'resume') && tailoredResume && (
                      <div className="resume-preview whitespace-pre-wrap font-serif text-slate-800 leading-relaxed">
                        {tailoredResume}
                      </div>
                    )}
                    {activeTab === 'cv' && detailedCv && (
                      <div className="cv-preview whitespace-pre-wrap font-serif text-slate-800 leading-relaxed">
                        {detailedCv}
                      </div>
                    )}
                    {activeTab === 'cover' && tailoredCoverLetter && (
                      <div className="cover-letter-preview whitespace-pre-wrap font-serif text-slate-800 leading-relaxed">
                        {tailoredCoverLetter}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Resume Analysis Section - Condensed */}
            {analysisResult && (
              <div className="analysis-summary-new mt-12 bg-slate-900 text-white rounded-3xl p-8 overflow-hidden relative">
                {/* Decorative blob */}
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-500 rounded-full blur-[80px] opacity-20"></div>

                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="score-viz relative">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle cx="64" cy="64" r="58" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
                        <circle
                          cx="64" cy="64" r="58"
                          stroke={getScoreColor(analysisResult.matchScore || 0)}
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={364.4}
                          strokeDashoffset={364.4 - (364.4 * (analysisResult.matchScore || 0) / 100)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-extrabold">{analysisResult.matchScore || 0}%</span>
                        <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Match</span>
                      </div>
                    </div>

                    <div className="flex-grow text-center md:text-left">
                      <h3 className="text-xl font-bold mb-2">Resume Scan Results</h3>
                      <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
                        {analysisResult.summary || 'Analysis complete. We have optimized your resume based on these results.'}
                      </p>
                    </div>

                    <div className="flex gap-3 flex-wrap justify-center">
                      <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-center min-w-[100px]">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Hard Skills</div>
                        <div className="font-bold text-indigo-400">{analysisResult.hardSkills?.score || 0}%</div>
                      </div>
                      <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-center min-w-[100px]">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Soft Skills</div>
                        <div className="font-bold text-green-400">{analysisResult.softSkills?.score || 0}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="results-final-actions mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-center">
              {jobData.sourceUrl && (
                <Button className="btn-primary w-full md:w-auto h-14 px-10 text-lg font-bold rounded-2xl shadow-xl shadow-green-100" onClick={handleGoToJobPage}>
                  <ExternalLink className="w-5 h-5 mr-3" /> Go to Job Page & Apply
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full md:w-auto h-14 px-8 rounded-2xl font-bold text-slate-600"
                onClick={handleSaveApplication}
                disabled={applicationSaved || isSavingApplication}
              >
                {isSavingApplication ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-3" /> Saving...</>
                ) : applicationSaved ? (
                  <><CheckCircle className="w-4 h-4 mr-3 text-green-500" /> Saved to Dashboard</>
                ) : (
                  <><Save className="w-4 h-4 mr-3" /> Save to tracker</>
                )}
              </Button>
            </div>

            <div className="how-to-use mt-10 p-6 bg-indigo-50 rounded-2xl border border-indigo-100/50">
              <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                <Lightbulb className="w-5 h-5" /> How to apply like a Ninja:
              </h4>
              <ul className="space-y-2 text-sm text-indigo-800/80 font-medium">
                <li className="flex items-start gap-2">
                  <span className="bg-indigo-200 text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] mt-0.5">1</span>
                  Download the tailored resume and cover letter.
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-indigo-200 text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] mt-0.5">2</span>
                  Click "Go to Job Page" to open the application site.
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-indigo-200 text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] mt-0.5">3</span>
                  Upload the downloaded files and submit your application!
                </li>
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

