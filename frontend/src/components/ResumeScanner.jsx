import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  Upload,
  FileText,
  Briefcase,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  X,
  AlertTriangle,
  TrendingUp,
  Target,
  Sparkles,
  Download,
  FileDown,
  Save,
  FolderOpen,
  Trash2,
  Clock
} from 'lucide-react';
import { BRAND } from '../config/branding';
import { API_URL } from '../config/api';
import SideMenu from './SideMenu';
import Header from './Header';
import UpgradeModal from './UpgradeModal';
import './SideMenu.css';
import './ResumeScanner.css';

const ResumeScanner = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  // Step state: 1 = Upload Resume, 2 = Add Job, 3 = View Results
  const [currentStep, setCurrentStep] = useState(1);

  // Form state
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);

  // Copy state
  const [copiedSkills, setCopiedSkills] = useState(false);

  // Document generation state
  const [generatingResume, setGeneratingResume] = useState(false);
  const [generatingCoverLetter, setGeneratingCoverLetter] = useState(false);
  const [parsedResumeText, setParsedResumeText] = useState('');

  // Saved resumes state
  const [savedResumes, setSavedResumes] = useState([]);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [selectedSavedResume, setSelectedSavedResume] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [resumeName, setResumeName] = useState('');
  const [savingResume, setSavingResume] = useState(false);
  const [usageLimits, setUsageLimits] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Fetch saved resumes and usage on mount
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
    if (!user?.email) return;

    setLoadingResumes(true);
    try {
      const response = await fetch(`${API_URL}/api/resumes/${encodeURIComponent(user.email)}`);
      if (response.ok) {
        const data = await response.json();
        setSavedResumes(data.resumes || []);
      }
    } catch (err) {
      console.error('Failed to fetch saved resumes:', err);
    } finally {
      setLoadingResumes(false);
    }
  };

  const selectSavedResume = async (resume) => {
    try {
      const response = await fetch(`${API_URL}/api/resumes/detail/${resume.id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedSavedResume(data.resume);
        setParsedResumeText(data.resume.resumeText);
        setResumeFile(null); // Clear file upload
        setCurrentStep(2); // Go to job description step
      }
    } catch (err) {
      setError('Failed to load resume');
    }
  };

  const saveCurrentResume = async () => {
    if (!parsedResumeText || !resumeName.trim() || !user?.email) return;

    setSavingResume(true);
    try {
      const response = await fetch(`${API_URL}/api/resumes/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: user.email,
          resume_name: resumeName.trim(),
          resume_text: parsedResumeText,
          file_name: resumeFile?.name || 'Saved Resume'
        })
      });

      if (response.ok) {
        setShowSaveModal(false);
        setResumeName('');
        fetchSavedResumes(); // Refresh list
      } else {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to save');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingResume(false);
    }
  };

  const deleteSavedResume = async (resumeId, e) => {
    e.stopPropagation();
    if (!confirm('Delete this saved resume?')) return;

    try {
      const response = await fetch(`${API_URL}/api/resumes/${resumeId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSavedResumes(prev => prev.filter(r => r.id !== resumeId));
        if (selectedSavedResume?.id === resumeId) {
          setSelectedSavedResume(null);
        }
      }
    } catch (err) {
      setError('Failed to delete resume');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      if (!validTypes.includes(file.type) && !file.name.endsWith('.pdf') && !file.name.endsWith('.docx') && !file.name.endsWith('.txt')) {
        setError('Please upload a PDF, DOCX, or TXT file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setResumeFile(file);
      setError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setResumeFile(file);
      setError(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleFetchJobDescription = async () => {
    if (!jobUrl.trim()) {
      setError('Please enter a valid job URL');
      return;
    }

    setIsFetchingUrl(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/fetch-job-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: jobUrl.trim() })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch job description. The site might be blocking access.');
      }

      const data = await response.json();
      if (data.success) {
        setJobDescription(data.description || '');
        if (data.jobTitle) setJobTitle(data.jobTitle);
        if (data.company) setCompany(data.company);
      } else {
        throw new Error(data.error || 'Could not extract job information from the URL.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleAnalyze = async () => {
    if ((!resumeFile && !selectedSavedResume) || !jobDescription.trim()) {
      setError('Please upload a resume and enter a job description');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      let data;

      if (selectedSavedResume) {
        // Use saved resume text - call analyze with text directly
        const formData = new FormData();
        // Create a blob from the saved text to send as file
        const blob = new Blob([selectedSavedResume.resumeText], { type: 'text/plain' });
        formData.append('resume', blob, 'saved_resume.txt');
        formData.append('job_description', jobDescription);

        const response = await fetch(`${API_URL}/api/scan/analyze`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Analysis failed');
        }

        data = await response.json();
        // Keep using the saved resume text
        setParsedResumeText(selectedSavedResume.resumeText);
      } else {
        // Upload new file
        const formData = new FormData();
        formData.append('resume', resumeFile);
        formData.append('job_description', jobDescription);

        const response = await fetch(`${API_URL}/api/scan/analyze`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Analysis failed');
        }

        data = await response.json();
        setParsedResumeText(data.resumeText || '');
      }

      setAnalysisResult(data.analysis);
      setCurrentStep(3);

      // Save scan and application if user is authenticated
      if (isAuthenticated && user?.email) {
        try {
          // Save scan history
          await fetch(`${API_URL}/api/scan/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_email: user.email,
              job_title: jobTitle || 'Untitled Position',
              company: company || 'Unknown Company',
              job_description: jobDescription,
              analysis: data.analysis
            })
          });

          // Also save to application tracker
          const applicationData = {
            userEmail: user.email,
            jobId: null,
            jobTitle: jobTitle || 'Untitled Position',
            company: company || 'Unknown Company',
            location: '',
            jobDescription: (jobDescription || '').substring(0, 5000),
            sourceUrl: '',
            salaryRange: '',
            matchScore: data.analysis?.matchScore || 0,
            status: 'materials_ready',
            createdAt: new Date().toISOString()
          };

          console.log('Saving to application tracker:', applicationData);

          const appResponse = await fetch(`${API_URL}/api/applications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(applicationData)
          });

          if (appResponse.ok) {
            console.log('Application saved to tracker');
          }
        } catch (saveError) {
          console.error('Failed to save scan/application:', saveError);
        }
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyAllSkills = () => {
    if (!analysisResult) return;

    const missingHard = analysisResult.hardSkills?.missing?.map(s => s.skill) || [];
    const missingSoft = analysisResult.softSkills?.missing?.map(s => s.skill) || [];
    const allMissing = [...missingHard, ...missingSoft].join(', ');

    navigator.clipboard.writeText(allMissing);
    setCopiedSkills(true);
    setTimeout(() => setCopiedSkills(false), 2000);
  };

  const downloadOptimizedResume = async () => {
    if (!analysisResult) return;

    setGeneratingResume(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/generate/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id || user.email,
          resume_text: parsedResumeText || jobDescription, // fallback
          job_description: jobDescription,
          job_title: jobTitle || 'Position',
          company: company || 'Company',
          analysis: analysisResult
        })
      });

      if (!response.ok) {
        if (response.status === 403) {
          setShowUpgradeModal(true);
          throw new Error('You have reached your resume generation limit.');
        }
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate resume');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;

      // Sanitized filename
      const safeCompany = (company || 'Job').trim().replace(/[^a-z0-9]/gi, '_');
      a.download = `Optimized_Resume_${safeCompany}.docx`;

      document.body.appendChild(a);
      a.click();

      // Cleanup with delay to ensure download starts
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);

    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingResume(false);
    }
  };

  const downloadCoverLetter = async () => {
    setGeneratingCoverLetter(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/generate/cover-letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id || user.email,
          resume_text: parsedResumeText || jobDescription,
          job_description: jobDescription,
          job_title: jobTitle || 'Position',
          company: company || 'Company'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate cover letter');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;

      // Sanitized filename
      const safeCompany = (company || 'Job').trim().replace(/[^a-z0-9]/gi, '_');
      a.download = `Cover_Letter_${safeCompany}.docx`;

      document.body.appendChild(a);
      a.click();

      // Cleanup with delay
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);

    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingCoverLetter(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (score) => {
    if (score >= 70) return 'Strong Match';
    if (score >= 50) return 'Moderate Match';
    return 'Needs Improvement';
  };

  return (
    <div className="scanner-page">
      <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />
      <Header onMenuClick={() => setSideMenuOpen(true)} />

      <div className="scanner-container">
        {/* Progress Steps */}
        <div className="scanner-steps">
          <div className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
            <span>Upload Resume</span>
          </div>
          <div className="step-line" />
          <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
            <span>Add Job</span>
          </div>
          <div className="step-line" />
          <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
            <span>View Results</span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="scanner-error">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
            <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Step 1: Upload Resume */}
        {currentStep === 1 && (
          <div className="scanner-step-content">
            <h2>Upload Your Resume</h2>
            <p>We'll analyze your resume against the job description to find the best match</p>

            {/* Saved Resumes Section */}
            {isAuthenticated && savedResumes.length > 0 && (
              <div className="saved-resumes-section">
                <h3>
                  <FolderOpen className="w-5 h-5" />
                  Your Saved Resumes <span className="text-slate-400 font-normal ml-2">({savedResumes.length}/3)</span>
                </h3>
                <div className="saved-resumes-list">
                  {savedResumes.map((resume) => (
                    <div
                      key={resume.id}
                      className={`saved-resume-card ${selectedSavedResume?.id === resume.id ? 'selected' : ''}`}
                      onClick={() => selectSavedResume(resume)}
                    >
                      <FileText className="w-8 h-8" />
                      <div className="resume-info">
                        <span className="resume-name">{resume.resumeName}</span>
                        <span className="resume-date">
                          <Clock className="w-3 h-3" />
                          {new Date(resume.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <button
                        className="delete-resume-btn"
                        onClick={(e) => deleteSavedResume(resume.id, e)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="divider-or">
                  <span>or upload a new resume</span>
                </div>
              </div>
            )}

            {/* Selected Saved Resume */}
            {selectedSavedResume && (
              <div className="upload-zone has-file">
                <div className="uploaded-file">
                  <FileText className="w-12 h-12" style={{ color: 'var(--primary)' }} />
                  <span className="file-name">{selectedSavedResume.resumeName}</span>
                  <span className="file-size">Saved Resume</span>
                  <button className="remove-file" onClick={() => { setSelectedSavedResume(null); setParsedResumeText(''); }}>
                    <X className="w-4 h-4" /> Change
                  </button>
                </div>
              </div>
            )}

            {/* Upload Zone - show only if no saved resume selected */}
            {!selectedSavedResume && (
              <div
                className={`upload-zone ${resumeFile ? 'has-file' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                {resumeFile ? (
                  <div className="uploaded-file">
                    <FileText className="w-12 h-12" style={{ color: 'var(--primary)' }} />
                    <span className="file-name">{resumeFile.name}</span>
                    <span className="file-size">{(resumeFile.size / 1024).toFixed(1)} KB</span>
                    <button className="remove-file" onClick={() => setResumeFile(null)}>
                      <X className="w-4 h-4" /> Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12" style={{ color: '#94a3b8' }} />
                    <p>Drag & Drop or <label className="choose-file">
                      Choose file
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt"
                        onChange={handleFileUpload}
                        hidden
                      />
                    </label> to upload</p>
                    <span className="file-types">as .pdf or .docx file</span>
                  </>
                )}
              </div>
            )}

            <Button
              className="btn-primary next-btn"
              disabled={!resumeFile && !selectedSavedResume}
              onClick={() => setCurrentStep(2)}
            >
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Step 2: Add Job Description */}
        {currentStep === 2 && (
          <div className="scanner-step-content">
            <h2>Add Job Description</h2>
            <p>Paste the job description you want to match your resume against</p>

            <div className="job-input-section">
              <div className="url-fetch-group mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste job URL here (LinkedIn, Indeed, etc.)..."
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    className="job-url-input flex-grow p-3 border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                  <Button
                    onClick={handleFetchJobDescription}
                    disabled={isFetchingUrl || !jobUrl.trim()}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 rounded-xl font-semibold"
                  >
                    {isFetchingUrl ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Fetch'
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-2 px-1">
                  AI will extract the job title, company, and description for you.
                </p>
              </div>

              <div className="job-meta">
                <input
                  type="text"
                  placeholder="Job Title (optional)"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="job-title-input"
                />
                <input
                  type="text"
                  placeholder="Company (optional)"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="company-input"
                />
              </div>

              <textarea
                placeholder="Or paste a job description manually here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="job-description-textarea"
                rows={12}
              />
            </div>

            <div className="step-buttons">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                className="btn-primary"
                disabled={!jobDescription.trim() || isAnalyzing}
                onClick={handleAnalyze}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
                  </>
                ) : (
                  <>
                    Scan <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {currentStep === 3 && analysisResult && (
          <div className="scanner-results">
            <div className="results-header">
              <Button variant="outline" onClick={() => { setCurrentStep(1); setAnalysisResult(null); }}>
                <ArrowLeft className="w-4 h-4" /> New Scan
              </Button>
              <h2>{jobTitle || 'Resume Analysis'} {company && `at ${company}`}</h2>
            </div>

            {/* Download Actions */}
            <div className="download-actions">
              <Button
                className="btn-primary download-btn"
                onClick={downloadOptimizedResume}
                disabled={generatingResume}
              >
                {generatingResume ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                ) : (
                  <><Download className="w-4 h-4" /> Download Optimized Resume</>
                )}
              </Button>
              <Button
                className="btn-secondary download-btn"
                onClick={downloadCoverLetter}
                disabled={generatingCoverLetter}
              >
                {generatingCoverLetter ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                ) : (
                  <><FileDown className="w-4 h-4" /> Get Cover Letter</>
                )}
              </Button>
              {isAuthenticated && !selectedSavedResume && parsedResumeText && (
                <Button
                  variant="outline"
                  className="save-resume-btn"
                  onClick={() => setShowSaveModal(true)}
                >
                  <Save className="w-4 h-4" /> Save Resume
                </Button>
              )}
            </div>

            {/* Save Resume Modal */}
            {showSaveModal && (
              <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
                <div className="save-resume-modal" onClick={(e) => e.stopPropagation()}>
                  <h3><Save className="w-5 h-5" /> Save Resume for Later</h3>
                  <p>Give your resume a name to easily find it next time</p>
                  <input
                    type="text"
                    placeholder="e.g., Software Engineer Resume"
                    value={resumeName}
                    onChange={(e) => setResumeName(e.target.value)}
                    className="resume-name-input"
                  />
                  <div className="modal-actions">
                    <Button variant="outline" onClick={() => setShowSaveModal(false)}>
                      Cancel
                    </Button>
                    <Button
                      className="btn-primary"
                      onClick={saveCurrentResume}
                      disabled={!resumeName.trim() || savingResume}
                    >
                      {savingResume ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {savingResume ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Match Score */}
            <div className="match-score-section">
              <div className="match-score-circle" style={{ '--score-color': getScoreColor(analysisResult.matchScore) }}>
                <svg viewBox="0 0 36 36" className="circular-chart">
                  <path
                    className="circle-bg"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="circle"
                    strokeDasharray={`${analysisResult.matchScore}, 100`}
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="score-text">
                  <span className="score-number">{analysisResult.matchScore}</span>
                  <span className="score-percent">%</span>
                </div>
              </div>
              <div className="match-info">
                <h3 style={{ color: getScoreColor(analysisResult.matchScore) }}>
                  {getScoreLabel(analysisResult.matchScore)}
                </h3>
                <p>{analysisResult.summary}</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="quick-stats">
              <div className="stat-card">
                <Target className="w-5 h-5" />
                <span className="stat-label">Hard Skills</span>
                <span className="stat-value" style={{ color: getScoreColor(analysisResult.hardSkills?.score || 0) }}>
                  {analysisResult.hardSkills?.score || 0}%
                </span>
              </div>
              <div className="stat-card">
                <TrendingUp className="w-5 h-5" />
                <span className="stat-label">Soft Skills</span>
                <span className="stat-value" style={{ color: getScoreColor(analysisResult.softSkills?.score || 0) }}>
                  {analysisResult.softSkills?.score || 0}%
                </span>
              </div>
              <div className="stat-card">
                <Briefcase className="w-5 h-5" />
                <span className="stat-label">Experience</span>
                <span className="stat-value" style={{ color: getScoreColor(analysisResult.experience?.score || 0) }}>
                  {analysisResult.experience?.score || 0}%
                </span>
              </div>
              <div className="stat-card">
                <FileText className="w-5 h-5" />
                <span className="stat-label">Searchability</span>
                <span className="stat-value" style={{ color: getScoreColor(analysisResult.searchability?.score || 0) }}>
                  {analysisResult.searchability?.score || 0}%
                </span>
              </div>
            </div>

            {/* Hard Skills Section */}
            <Card className="results-section">
              <div className="section-header">
                <h3>Hard Skills</h3>
                <span className="section-badge" style={{ background: analysisResult.hardSkills?.score >= 50 ? '#dcfce7' : '#fef3c7' }}>
                  {analysisResult.hardSkills?.matched?.length || 0} matched, {analysisResult.hardSkills?.missing?.length || 0} missing
                </span>
              </div>

              <div className="skills-grid">
                <div className="skills-column">
                  <h4>✅ Matched Skills</h4>
                  {analysisResult.hardSkills?.matched?.map((skill, i) => (
                    <div key={i} className="skill-item matched">
                      <span className="skill-name">{skill.skill}</span>
                      <span className="skill-count">Resume: {skill.resumeCount} | Job: {skill.jobCount}</span>
                    </div>
                  ))}
                </div>
                <div className="skills-column">
                  <h4>❌ Missing Skills</h4>
                  {analysisResult.hardSkills?.missing?.map((skill, i) => (
                    <div key={i} className="skill-item missing">
                      <span className="skill-name">{skill.skill}</span>
                      <span className={`skill-importance ${skill.importance}`}>{skill.importance}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button variant="outline" className="copy-skills-btn" onClick={copyAllSkills}>
                {copiedSkills ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedSkills ? 'Copied!' : 'Copy Missing Skills'}
              </Button>
            </Card>

            {/* Soft Skills Section */}
            <Card className="results-section">
              <div className="section-header">
                <h3>Soft Skills</h3>
              </div>
              <div className="skills-grid">
                <div className="skills-column">
                  <h4>✅ Found</h4>
                  {analysisResult.softSkills?.matched?.map((skill, i) => (
                    <div key={i} className="skill-item matched">
                      <span className="skill-name">{skill.skill}</span>
                    </div>
                  ))}
                </div>
                <div className="skills-column">
                  <h4>❌ Missing</h4>
                  {analysisResult.softSkills?.missing?.map((skill, i) => (
                    <div key={i} className="skill-item missing">
                      <span className="skill-name">{skill.skill}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Searchability Section */}
            <Card className="results-section">
              <div className="section-header">
                <h3>Searchability</h3>
                <span className="section-badge important">IMPORTANT</span>
              </div>
              <div className="checklist">
                <div className={`check-item ${analysisResult.searchability?.hasEmail ? 'pass' : 'fail'}`}>
                  {analysisResult.searchability?.hasEmail ? <CheckCircle /> : <X />}
                  <span>Email address found</span>
                </div>
                <div className={`check-item ${analysisResult.searchability?.hasPhone ? 'pass' : 'fail'}`}>
                  {analysisResult.searchability?.hasPhone ? <CheckCircle /> : <X />}
                  <span>Phone number found</span>
                </div>
                <div className={`check-item ${analysisResult.searchability?.hasLinkedIn ? 'pass' : 'fail'}`}>
                  {analysisResult.searchability?.hasLinkedIn ? <CheckCircle /> : <X />}
                  <span>LinkedIn profile found</span>
                </div>
                <div className={`check-item ${analysisResult.searchability?.hasSummary ? 'pass' : 'fail'}`}>
                  {analysisResult.searchability?.hasSummary ? <CheckCircle /> : <X />}
                  <span>Professional summary found</span>
                </div>
                <div className={`check-item ${analysisResult.searchability?.hasExperience ? 'pass' : 'fail'}`}>
                  {analysisResult.searchability?.hasExperience ? <CheckCircle /> : <X />}
                  <span>Work experience found</span>
                </div>
                <div className={`check-item ${analysisResult.searchability?.hasEducation ? 'pass' : 'fail'}`}>
                  {analysisResult.searchability?.hasEducation ? <CheckCircle /> : <X />}
                  <span>Education section found</span>
                </div>
              </div>
            </Card>

            {/* Recruiter Tips */}
            <Card className="results-section">
              <div className="section-header">
                <h3>Recruiter Tips</h3>
                <span className="section-badge important">IMPORTANT</span>
              </div>

              <div className="tip-item">
                <div className={`tip-status ${analysisResult.jobTitleMatch?.match ? 'pass' : 'fail'}`}>
                  {analysisResult.jobTitleMatch?.match ? <CheckCircle /> : <AlertTriangle />}
                </div>
                <div className="tip-content">
                  <h4>Job Title Match</h4>
                  <p>{analysisResult.jobTitleMatch?.feedback}</p>
                </div>
              </div>

              <div className="tip-item">
                <div className={`tip-status ${analysisResult.recruiterTips?.measurableResults?.count >= 5 ? 'pass' : 'warn'}`}>
                  {analysisResult.recruiterTips?.measurableResults?.count >= 5 ? <CheckCircle /> : <AlertTriangle />}
                </div>
                <div className="tip-content">
                  <h4>Measurable Results</h4>
                  <p>Found {analysisResult.recruiterTips?.measurableResults?.count || 0} quantified achievements. {analysisResult.recruiterTips?.measurableResults?.feedback}</p>
                </div>
              </div>

              <div className="tip-item">
                <div className={`tip-status ${analysisResult.recruiterTips?.wordCount?.status === 'good' ? 'pass' : 'warn'}`}>
                  {analysisResult.recruiterTips?.wordCount?.status === 'good' ? <CheckCircle /> : <AlertTriangle />}
                </div>
                <div className="tip-content">
                  <h4>Word Count</h4>
                  <p>{analysisResult.recruiterTips?.wordCount?.count || 0} words. {analysisResult.recruiterTips?.wordCount?.feedback}</p>
                </div>
              </div>
            </Card>

            {/* Suggestions */}
            <Card className="results-section suggestions-section">
              <div className="section-header">
                <h3><Sparkles className="w-5 h-5" /> Top Suggestions</h3>
              </div>
              <ul className="suggestions-list">
                {analysisResult.suggestions?.map((suggestion, i) => (
                  <li key={i}>{suggestion}</li>
                ))}
              </ul>

              {analysisResult.keywordsToAdd?.length > 0 && (
                <div className="keywords-to-add">
                  <h4>Keywords to Add:</h4>
                  <div className="keywords-tags">
                    {analysisResult.keywordsToAdd.map((keyword, i) => (
                      <span key={i} className="keyword-tag">{keyword}</span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
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
    </div>
  );
};

export default ResumeScanner;


