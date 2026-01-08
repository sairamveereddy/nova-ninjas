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
  Lightbulb
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

  const [showSaveResumePrompt, setShowSaveResumePrompt] = useState(false);
  const [resumeName, setResumeName] = useState('');
  const [isSavingResume, setIsSavingResume] = useState(false);
  const [resumeSaved, setResumeSaved] = useState(false);

  // New Usage & Company state
  const [companyName, setCompanyName] = useState(jobData.company || '');
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
      } else {
        console.error('Failed to parse resume:', response.status);
        // Fallback: use a placeholder so button is enabled
        setResumeText(`[Resume content from: ${file.name}]`);
      }
    } catch (error) {
      console.error('Failed to parse resume:', error);
      // Fallback: use a placeholder so button is enabled
      setResumeText(`[Resume content from: ${file.name}]`);
    } finally {
      setIsParsingResume(false);
    }
  };

  const handleSelectSavedResume = (resume) => {
    setSelectedResume(resume);
    setResumeFile(null);
    setResumeText(resume.resumeText || '');
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

    if (!textToUse && !resumeFile && !selectedResume) {
      alert('Please upload a resume first');
      return;
    }

    if (!jobData.description) {
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
      analyzeFormData.append('job_description', jobData.description);

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
      applyFormData.append('jobTitle', jobData.jobTitle || jobData.title || '');
      applyFormData.append('company', companyName);
      applyFormData.append('jobDescription', jobData.description);
      applyFormData.append('jobUrl', jobData.sourceUrl || jobData.url || '');

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

      // Since we now get everything in one go from ai-ninja/apply
      setOptimizedResumeUrl(null); // Will use text display for now or handle docx later
      setCoverLetterUrl(null);
      setAnalysisResult(analysis); // Keep analysis from first step

      // Set results for display
      setTailoredResume(applyData.tailoredResume);
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
      setGenerationProgress('Something went wrong. Please try again.');
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

  const handleGoToJobPage = () => {
    if (jobData.sourceUrl) {
      window.open(jobData.sourceUrl, '_blank');
    }
  };

  // If no job data, redirect back
  if (!jobData.jobTitle && !jobData.description) {
    return (
      <div className="ai-apply-page">
        <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />
        <Header onMenuClick={() => setSideMenuOpen(true)} />
        <div className="ai-apply-container">
          <Card className="ai-apply-card">
            <div className="empty-state">
              <Bot className="w-16 h-16 text-gray-300 mb-4" />
              <h2>No Job Selected</h2>
              <p>Please select a job from the job board to apply with AI Ninja.</p>
              <Button className="btn-primary" onClick={() => navigate('/ai-ninja')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Go to Job Board
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-apply-page">
      <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />
      <Header onMenuClick={() => setSideMenuOpen(true)} />

      <div className="ai-apply-container">
        {/* Job Info Header */}
        <Card className="job-info-card">
          <div className="job-info-header">
            <div>
              <h1 className="job-title">{jobData.jobTitle}</h1>
              <div className="job-meta">
                <span><Building2 className="w-4 h-4" /> {jobData.company}</span>
                {jobData.location && <span><MapPin className="w-4 h-4" /> {jobData.location}</span>}
              </div>
            </div>
            <Button variant="ghost" onClick={() => navigate('/ai-ninja')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </div>
        </Card>

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

        {/* Step 1: Resume Selection */}
        {currentStep === 1 && (
          <Card className="ai-apply-card">
            <h2><FileText className="w-5 h-5" /> Select Your Resume</h2>
            <p className="card-description">
              Choose a saved resume or upload a new one. We'll tailor it for this job.
            </p>

            {/* Saved Resumes */}
            {isAuthenticated && (
              <div className="saved-resumes-section">
                <h3>Your Saved Resumes</h3>
                {isLoadingResumes ? (
                  <p className="loading-text"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</p>
                ) : savedResumes.length > 0 ? (
                  <div className="saved-resumes-grid">
                    {savedResumes.map(resume => (
                      <div
                        key={resume._id}
                        className={`saved-resume-item ${selectedResume?._id === resume._id ? 'selected' : ''}`}
                        onClick={() => handleSelectSavedResume(resume)}
                      >
                        <FileText className="w-5 h-5" />
                        <span>{resume.fileName || 'Resume'}</span>
                        {selectedResume?._id === resume._id && <CheckCircle className="w-4 h-4 text-green-500" />}
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

            {/* Company Name Input */}
            <div className="company-input-section mt-4 mb-6">
              <Label htmlFor="companyName" className="text-sm font-semibold mb-2 block">
                Applying to Company*
              </Label>
              <Input
                id="companyName"
                placeholder="Enter company name (e.g. Google)"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full"
                required
              />
            </div>

            {/* Job Description Preview */}
            <div className="job-description-section">
              <h3>Job Description</h3>
              <div className="job-description-preview">
                {jobData.description?.substring(0, 500)}
                {jobData.description?.length > 500 && '...'}
              </div>
            </div>

            <div className="card-actions">
              <Button
                className="btn-primary btn-large"
                onClick={handleStartGeneration}
                disabled={isParsingResume || (!resumeText && !resumeFile)}
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

            {/* Download Buttons - Moved to top */}
            <div className="download-section">
              <div className="download-buttons">
                {optimizedResumeUrl && (
                  <a
                    href={optimizedResumeUrl}
                    download={`Resume_${jobData.company?.replace(/\s+/g, '_')}_${jobData.jobTitle?.replace(/\s+/g, '_')}.docx`}
                    className="download-btn resume-btn"
                  >
                    <Download className="w-5 h-5" />
                    <div>
                      <strong>Download Optimized Resume</strong>
                    </div>
                  </a>
                )}
                {coverLetterUrl && (
                  <a
                    href={coverLetterUrl}
                    download={`CoverLetter_${jobData.company?.replace(/\s+/g, '_')}.docx`}
                    className="download-btn cover-btn"
                  >
                    <Download className="w-5 h-5" />
                    <div>
                      <strong>Get Cover Letter</strong>
                    </div>
                  </a>
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

      {/* Save Resume Prompt Modal */}
      {showSaveResumePrompt && (
        <div className="modal-overlay" onClick={() => setShowSaveResumePrompt(false)}>
          <Card className="save-resume-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><Save className="w-5 h-5" /> Save Resume for Future Use?</h2>
              <button className="modal-close" onClick={() => setShowSaveResumePrompt(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-content">
              <p>Would you like to save this resume for future job applications? You won't need to upload it again.</p>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <Label>Resume Name</Label>
                <Input
                  placeholder="e.g., Software Engineer Resume"
                  value={resumeName}
                  onChange={(e) => setResumeName(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <Button variant="outline" onClick={() => setShowSaveResumePrompt(false)}>
                No, Thanks
              </Button>
              <Button
                className="btn-primary"
                onClick={handleSaveResume}
                disabled={isSavingResume || !resumeName.trim()}
              >
                {isSavingResume ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Save Resume</>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Resume Saved Toast */}
      {resumeSaved && (
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
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && usageLimits && (
        <UpgradeModal
          tier={usageLimits.tier}
          limit={usageLimits.limit}
          resetDate={usageLimits.resetDate}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  );
};

export default AIApplyFlow;

