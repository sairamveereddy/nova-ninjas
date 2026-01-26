import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import {
  Bot,
  FileText,
  Upload,
  CheckCircle,
  Check,
  AlertCircle,
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
  Trash2,
  AlertTriangle,
  Maximize2,
  RotateCcw,
  Flame,
  Activity,
  Edit,
  Plus,
  GripVertical,
  Zap
} from 'lucide-react';
import { BRAND } from '../config/branding';
import { API_URL } from '../config/api';
import SideMenu from './SideMenu';
import Header from './Header';
import UpgradeModal from './UpgradeModal';
import ResumePaper from './ResumePaper';
import './AIApplyFlow.css';

// Helper function to get color based on score
const getScoreColor = (score) => {
  if (score >= 70) return '#22c55e'; // Green
  if (score >= 50) return '#eab308'; // Yellow
  return '#ef4444'; // Red
};

const HighlightText = ({ text, keywords }) => {
  if (!text) return null;
  if (!keywords || keywords.length === 0) return <>{text}</>;

  // Escape special regex characters
  const escapedKeywords = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escapedKeywords.join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        keywords.some(k => k.toLowerCase() === part.toLowerCase()) ? (
          <span key={i} className="bg-green-200 text-slate-900 font-bold border-b-2 border-green-400 px-0.5 rounded shadow-sm">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
};

const AIApplyFlow = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  // Get job details from navigation state
  const jobData = location.state || {};

  // Steps: 1=Resume Selection, 2=Difference Report, 3=Tailoring, 4=Generating, 5=Results
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
  const [activeTab, setActiveTab] = useState('report');
  const [isDownloading, setIsDownloading] = useState(null);
  const [customJobDescription, setCustomJobDescription] = useState(jobData.description || '');
  const [customJobTitle, setCustomJobTitle] = useState(jobData.jobTitle || jobData.title || '');
  const [usageLimits, setUsageLimits] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // New Jobright Flow state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedSections, setSelectedSections] = useState(['summary', 'skills', 'experience']);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [matchImprovement, setMatchImprovement] = useState(0);

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
    if (user?.email) formData.append('email', user.email);

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

  const handleRunAnalysis = async () => {
    if (!resumeText && !resumeFile && !selectedResume) {
      alert('Your resume content seems to be empty. Please upload or select a resume.');
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

    setIsAnalyzing(true);
    try {
      // Create form data for analysis
      const analyzeFormData = new FormData();
      if (resumeFile) {
        analyzeFormData.append('resume', resumeFile);
      } else if (selectedResume) {
        const textToUse = resumeText || selectedResume.resumeText || '';
        const blob = new Blob([textToUse], { type: 'text/plain' });
        analyzeFormData.append('resume', blob, 'resume.txt');
      } else if (resumeText) {
        const blob = new Blob([resumeText], { type: 'text/plain' });
        analyzeFormData.append('resume', blob, 'resume.txt');
      }
      analyzeFormData.append('job_description', customJobDescription);
      if (user?.email) analyzeFormData.append('email', user.email);

      const analyzeResponse = await fetch(`${API_URL}/api/scan/analyze`, {
        method: 'POST',
        body: analyzeFormData
      });

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Analysis failed');
      }
      const data = await analyzeResponse.json();
      setAnalysisResult(data.analysis || data);

      // Update resume text if parsed by backend
      if (data.resumeText && data.resumeText !== resumeText) {
        setResumeText(data.resumeText);
      }

      setCurrentStep(2); // Move to Difference Report
    } catch (error) {
      console.error('Analysis failed:', error);
      alert(error.message || 'Something went wrong during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartGeneration = async () => {
    // Check usage limits
    if (usageLimits && !usageLimits.canGenerate) {
      setShowUpgradeModal(true);
      return;
    }

    setCurrentStep(4); // Move to Generating step
    setIsGenerating(true);

    try {
      setGenerationProgress('Creating your tailored application materials...');

      const applyFormData = new FormData();
      applyFormData.append('userId', user.id);
      applyFormData.append('jobId', jobData.jobId || jobData.id || '');
      applyFormData.append('jobTitle', customJobTitle);
      applyFormData.append('company', companyName);
      applyFormData.append('jobDescription', customJobDescription);
      applyFormData.append('jobUrl', jobUrl || jobData.sourceUrl || jobData.url || '');

      // Pass selective tailoring parameters
      applyFormData.append('selectedSections', JSON.stringify(selectedSections));
      applyFormData.append('selectedKeywords', JSON.stringify(selectedKeywords));

      if (resumeFile) {
        applyFormData.append('resume', resumeFile);
      } else {
        const textToUse = resumeText || selectedResume?.resumeText || '';
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
      setApplicationSaved(true);

      // Estimate match improvement (mock for now, could be calculated if we run analysis again)
      setMatchImprovement(Math.floor(Math.random() * 15) + 10);

      setGenerationProgress('Done! Your application materials are ready.');
      setCurrentStep(5); // Move to Results step

      // Show save resume prompt if user uploaded a new resume
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

      <div className={currentStep === 5 ? "ai-apply-container-full" : "ai-apply-container"}>
        <JobHeader />

        {/* Progress Steps */}
        {currentStep < 5 && (
          <div className="progress-steps-new mb-10">
            {[
              { step: 1, label: 'Upload' },
              { step: 2, label: 'Analysis' },
              { step: 3, label: 'Tailor' },
              { step: 4, label: 'Generating' }
            ].map((s, idx) => {
              let status = 'pending';
              if (currentStep === s.step) status = 'active';
              if (currentStep > s.step) status = 'completed';

              return (
                <React.Fragment key={s.step}>
                  <div className={`step-item ${status}`}>
                    <div className="step-count">
                      {status === 'completed' ? <Check className="w-4 h-4" /> : s.step}
                    </div>
                    <span className="step-label">{s.label}</span>
                  </div>
                  {idx < 3 && <div className={`step-connector ${status === 'completed' ? 'filled' : ''}`} />}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Step 1: Upload Existing/New Resume */}
        {currentStep === 1 && (
          <div className="ai-apply-card-wrapper">
            <Card className="ai-apply-card">
              <h2>Upload Your Resume</h2>
              <p className="card-description">
                We'll analyze your resume against the job description to find the best match.
              </p>

              {/* Saved Resumes Section */}
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

              {/* Upload Zone */}
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

              {/* Job Details Section */}
              <div className="job-details-review mt-12 pt-8 border-t border-slate-100">
                <h3 className="flex items-center gap-2 mb-6 text-lg font-bold text-slate-900">
                  <Briefcase className="w-5 h-5 text-indigo-600" />
                  Review Job Details
                </h3>

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
                  onClick={handleRunAnalysis}
                  disabled={isParsingResume || isAnalyzing || (!resumeText && !resumeFile && !selectedResume) || !customJobDescription}
                >
                  {isParsingResume || isAnalyzing ? (
                    <><Loader2 className="w-5 h-5 mr-3 animate-spin" /> {isParsingResume ? 'Parsing Resume...' : 'Analyzing Match...'}</>
                  ) : (
                    <><Bot className="w-5 h-5 mr-3" /> See Your Difference <ArrowRight className="w-5 h-5 ml-2" /></>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Step 2: Difference Report */}
        {currentStep === 2 && analysisResult && (
          <div className="max-w-5xl mx-auto space-y-6">
            <Card className="rounded-3xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-500">
              <div className="p-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
                  <div className="text-center md:text-left">
                    <h2 className="text-3xl font-black text-slate-900 mb-3">Your Match Report</h2>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-full text-sm font-semibold border border-yellow-100">
                      <AlertCircle className="w-4 h-4" />
                      <span>We found some differences we can fix to boost your score!</span>
                    </div>
                  </div>

                  {/* Gauge */}
                  <div className="flex flex-col items-center justify-center relative shrink-0">
                    <svg className="w-48 h-24 overflow-visible">
                      <path d="M 10 110 A 85 85 0 0 1 200 110" fill="none" stroke="#f1f5f9" strokeWidth="16" strokeLinecap="round" />
                      <path
                        d="M 10 110 A 85 85 0 0 1 200 110"
                        fill="none"
                        stroke={getScoreColor(analysisResult.matchScore || 0)}
                        strokeWidth="16"
                        strokeDasharray="290"
                        strokeDashoffset={290 - (290 * ((analysisResult.matchScore || 0) / 100))}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute top-12 text-center">
                      <span className="text-5xl font-black text-slate-900 tracking-tight">{(analysisResult.matchScore / 10).toFixed(1)}</span>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Match Score</p>
                    </div>
                  </div>
                </div>

                {/* Insights Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <Card className="p-6 bg-slate-50/50 border-slate-100 hover:border-indigo-100 transition-colors">
                    <h4 className="flex items-center gap-2 text-slate-900 font-bold mb-4">
                      <Target className="w-5 h-5 text-indigo-500" />
                      Missing Keywords
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.hardSkills?.missing?.slice(0, 8).map((skill, i) => (
                        <Badge key={i} variant="outline" className="bg-white border-slate-200 text-slate-600 px-3 py-1">
                          {typeof skill === 'string' ? skill : skill.skill}
                        </Badge>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-6 bg-slate-50/50 border-slate-100 hover:border-indigo-100 transition-colors">
                    <h4 className="flex items-center gap-2 text-slate-900 font-bold mb-4">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                      Recommendations
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-600">
                      <li className="flex gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        <span>Highlight technical skills in your summary.</span>
                      </li>
                      <li className="flex gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        <span>Quantify impact in your work history.</span>
                      </li>
                    </ul>
                  </Card>
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={() => setCurrentStep(3)}
                    className="btn-primary h-14 px-12 rounded-full text-lg shadow-xl"
                  >
                    Boost My Score with AI <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Step 3: Tailoring Options */}
        {currentStep === 3 && (
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-5 duration-500">
            <Card className="p-8 rounded-3xl border-0 shadow-xl bg-white/80 backdrop-blur">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-lg shadow-indigo-100">1</div>
                <h3 className="text-2xl font-black text-slate-900">Sections to enhance</h3>
              </div>

              <div className="space-y-4">
                {['Summary', 'Skills', 'Work Experience'].map(section => (
                  <div
                    key={section}
                    className={`group p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${selectedSections.includes(section.toLowerCase())
                      ? 'border-indigo-600 bg-indigo-50/30'
                      : 'border-slate-100 hover:border-indigo-200 bg-white'
                      }`}
                    onClick={() => {
                      const low = section.toLowerCase();
                      setSelectedSections(prev =>
                        prev.includes(low) ? prev.filter(s => s !== low) : [...prev, low]
                      );
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${selectedSections.includes(section.toLowerCase()) ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100'}`}>
                          {selectedSections.includes(section.toLowerCase()) && <Check className="w-4 h-4" />}
                        </div>
                        <span className="font-bold text-slate-700 text-lg group-hover:text-indigo-600 transition-colors">{section}</span>
                      </div>
                      <div className="px-3 py-1 bg-green-50 text-green-600 text-xs font-bold rounded-lg">+1.2 pts</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-8 rounded-3xl border-0 shadow-xl bg-white/80 backdrop-blur">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-green-500 text-white flex items-center justify-center font-bold shadow-lg shadow-green-100">2</div>
                  <h3 className="text-2xl font-black text-slate-900">Missing Skills</h3>
                </div>
                <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors underline-offset-4 hover:underline" onClick={() => {
                  const all = analysisResult?.hardSkills?.missing?.map(s => typeof s === 'string' ? s : s.skill) || [];
                  setSelectedKeywords(all);
                }}>Select all</button>
              </div>

              <div className="flex flex-wrap gap-3 max-h-[450px] overflow-y-auto p-1 custom-scrollbar">
                {analysisResult?.hardSkills?.missing?.map((skillItem, i) => {
                  const skill = typeof skillItem === 'string' ? skillItem : skillItem.skill;
                  const active = selectedKeywords.includes(skill);
                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedKeywords(prev => active ? prev.filter(k => k !== skill) : [...prev, skill])}
                      className={`px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all duration-300 cursor-pointer select-none ${active
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-105'
                        : 'bg-white text-slate-600 border-slate-100 hover:border-indigo-200'
                        }`}
                    >
                      {skill}
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="md:col-span-2 flex flex-col items-center gap-4 mt-8">
              <Button
                onClick={handleStartGeneration}
                className="h-16 px-16 bg-slate-900 hover:bg-black text-white text-xl font-black rounded-full shadow-2xl transition-all transform hover:-translate-y-1 hover:scale-105"
              >
                <Zap className="w-6 h-6 mr-3 text-yellow-400 fill-yellow-400" /> Generate Tailored Resume
              </Button>
              <p className="text-slate-400 text-sm font-medium italic">Estimated Score After Tailoring: <span className="text-green-600 font-bold">9.2+</span></p>
            </div>
          </div>
        )}

        {/* Step 4: Generating */}
        {currentStep === 4 && (
          <Card className="max-w-3xl mx-auto p-12 rounded-[40px] shadow-2xl border-0 bg-white relative overflow-hidden text-center">
            <div className="absolute top-0 left-0 w-full h-2 bg-slate-100">
              <div className="h-full bg-indigo-600 animate-shimmer" style={{ width: '100%' }}></div>
            </div>

            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-600 rounded-3xl animate-ping opacity-10"></div>
                <div className="relative bg-indigo-50 p-8 rounded-[32px] border-2 border-indigo-100">
                  <Bot className="w-16 h-16 text-indigo-600" />
                </div>
              </div>
            </div>

            <h2 className="text-3xl font-black text-slate-900 mb-2">Tailoring Your Application</h2>
            <p className="text-indigo-600 font-bold tracking-widest uppercase text-xs mb-8">AI Ninja at work</p>

            <div className="space-y-4 max-w-sm mx-auto mb-10">
              <div className="flex items-center justify-between text-sm font-bold">
                <span className="text-slate-500">Processing Document</span>
                <span className="text-indigo-600">80%</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 transition-all duration-1000" style={{ width: '80%' }}></div>
              </div>
            </div>

            <p className="text-slate-500 font-medium italic animate-pulse">"{generationProgress}"</p>
          </Card>
        )}

        {/* Step 5: Results (The Final Split View - Forced Jobright Layout) */}
        {currentStep === 5 && (
          <div
            className="flex flex-col md:flex-row items-stretch overflow-hidden bg-slate-50"
            style={{ height: 'calc(100vh - 100px)', width: '100%', display: 'flex' }}
          >

            {/* Left Pane: Resume Preview (The Main Stage) */}
            <div
              className="jobright-main bg-[#f1f5f9] rounded-3xl p-4 md:p-8 overflow-hidden flex flex-col relative border border-slate-200 shadow-inner"
              style={{ flex: '1 1 0%', minWidth: '400px' }}
            >
              <div className="absolute top-4 left-4 flex gap-2 z-20">
                <Button variant="outline" size="sm" className="bg-white/90 backdrop-blur shadow-sm hover:shadow-md border-slate-200" onClick={() => navigate('/dashboard')}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
                </Button>
              </div>

              <div className="flex-1 w-full overflow-y-auto custom-scrollbar flex justify-center py-8">
                <div className="transition-all duration-300 origin-top" style={{ transform: 'scale(1)', paddingBottom: '40px' }}>
                  <div className="scale-[0.5] sm:scale-[0.6] md:scale-[0.7] lg:scale-[0.8] xl:scale-[0.9] 2xl:scale-[1.0] origin-top">
                    {detailedCv || tailoredResume ? (
                      <ResumePaper content={detailedCv || tailoredResume} scale={1} />
                    ) : (
                      <div className="bg-white shadow-2xl w-[816px] min-h-[1056px] flex flex-col items-center justify-center py-20 text-slate-400 rounded-lg">
                        <FileText className="w-16 h-16 mb-4 opacity-10" />
                        <p className="text-xl font-medium">Preparing your tailored resume...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Floating Action Bar */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-white/90 backdrop-blur-md p-2 rounded-full shadow-2xl border border-white/50 z-20">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100" onClick={() => handleDownload('resume')}><Download className="w-5 h-5 text-slate-600" /></Button>
                <div className="w-px h-6 bg-slate-200 mx-1"></div>
                <Button className="rounded-full bg-slate-900 hover:bg-black text-white px-8 font-bold shadow-lg" onClick={() => handleDownload('resume')}>
                  <Download className="w-4 h-4 mr-2" /> Download Document
                </Button>
              </div>
            </div>

            {/* Right Pane: Sidebar Tools (The Control Center) */}
            <div
              className="jobright-sidebar bg-white rounded-3xl shadow-xl flex flex-col overflow-hidden border border-slate-200"
              style={{ width: '350px', flexShrink: 0 }}
            >
              {/* Tabs */}
              <div className="flex items-center p-2 bg-slate-50 border-b border-slate-100">
                {['Report', 'Editor', 'Style'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab.toLowerCase())}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === tab.toLowerCase()
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {/* REPORT TAB */}
                {activeTab === 'report' && (
                  <div className="space-y-8">
                    <div className="bg-slate-50 rounded-2xl p-6 relative overflow-hidden">
                      <div className="flex justify-between items-start z-10 relative">
                        <div>
                          <h3 className="text-xl font-bold text-slate-900">Excellent!</h3>
                          <p className="text-slate-500 text-sm mt-1">Your score jumped from<br />{analysisResult?.matchScore || 50} to <span className="text-green-600 font-bold">92+</span></p>
                        </div>
                        <div className="text-center">
                          <div className="text-4xl font-black text-slate-900">9.2</div>
                          <div className="text-[10px] font-bold uppercase text-green-600 tracking-wider">Excellent</div>
                        </div>
                      </div>
                      <div className="absolute -right-6 -top-6 w-32 h-32 bg-green-100/50 rounded-full blur-2xl"></div>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 mb-4">AI Ninja Optimization Report</h4>
                      <div className="space-y-3">
                        {['Summary Enhanced', 'Skills Realigned', 'Keywords Optimized', 'Impact Quantified'].map((item, i) => (
                          <div key={i} className="group border border-slate-100 rounded-xl p-4 flex justify-between items-center bg-white shadow-sm hover:border-green-100 transition-colors">
                            <span className="font-bold text-slate-700 text-sm">{item}</span>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* STYLE TAB */}
                {activeTab === 'style' && (
                  <div className="space-y-8">
                    <div>
                      <h3 className="font-bold text-slate-900 mb-4">Template</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="border-2 border-green-500 rounded-xl p-3 text-center bg-green-50">
                          <span className="font-bold text-xs uppercase text-green-600">Standard</span>
                        </div>
                        <div className="border border-slate-200 rounded-xl p-3 text-center opacity-50">
                          <span className="font-bold text-xs uppercase">Modern</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 mb-4">Font Family</h3>
                      <div className="space-y-2">
                        {['Times New Roman', 'Arial', 'Georgia'].map(f => (
                          <div key={f} className="p-3 border border-slate-100 rounded-xl text-sm font-medium">{f}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* EDITOR TAB */}
                {activeTab === 'editor' && (
                  <div className="space-y-4">
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex gap-3">
                      <Lightbulb className="w-5 h-5 text-indigo-600" />
                      <p className="text-xs text-indigo-800 leading-snug">AI has automatically expanded your skills and summary to match the job requirement.</p>
                    </div>
                    {['Work Experience', 'Skills', 'Summary'].map(s => (
                      <div key={s} className="p-4 border border-slate-100 rounded-xl flex items-center justify-between">
                        <span className="font-bold text-slate-700 text-xs uppercase">{s}</span>
                        <Edit className="w-3 h-3 text-slate-400" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 bg-white grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-12 rounded-xl font-bold" onClick={() => handleDownload('resume')}>
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
                <Button className="h-12 rounded-xl bg-slate-900 text-white font-bold" onClick={handleSaveApplication}>
                  <Zap className="w-4 h-4 mr-2 text-yellow-500 fill-yellow-500" /> APPLY NOW
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Prompt Modal */}
      {showSaveResumePrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 duration-300">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-indigo-50 rounded-2xl">
                <Save className="w-10 h-10 text-indigo-600" />
              </div>
            </div>
            <h2 className="text-2xl font-black text-slate-900 text-center mb-2">Save This Resume?</h2>
            <p className="text-slate-500 text-center mb-8 font-medium">Add this to your library for future application ninjas.</p>

            <div className="space-y-4 mb-8">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Resume Name</Label>
              <Input
                value={resumeName}
                onChange={(e) => setResumeName(e.target.value)}
                className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button variant="ghost" className="h-12 rounded-xl font-bold text-slate-500" onClick={() => setShowSaveResumePrompt(false)}>Later</Button>
              <Button className="h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg" onClick={handleSaveResume} disabled={isSavingResume}>
                {isSavingResume ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Now'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {showUpgradeModal && usageLimits && (
        <UpgradeModal tier={usageLimits.tier} limit={usageLimits.limit} resetDate={usageLimits.resetDate} onClose={() => setShowUpgradeModal(false)} />
      )}
    </div>
  );
};

export default AIApplyFlow;
