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
  Save
} from 'lucide-react';
import { BRAND } from '../config/branding';
import { API_URL } from '../config/api';
import SideMenu from './SideMenu';
import Header from './Header';
import './AIApplyFlow.css';

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
  
  // Save resume prompt state
  const [showSaveResumePrompt, setShowSaveResumePrompt] = useState(false);
  const [resumeName, setResumeName] = useState('');
  const [isSavingResume, setIsSavingResume] = useState(false);
  const [resumeSaved, setResumeSaved] = useState(false);

  // Fetch saved resumes on mount
  useEffect(() => {
    if (isAuthenticated && user?.email) {
      fetchSavedResumes();
    }
  }, [isAuthenticated, user]);

  const fetchSavedResumes = async () => {
    setIsLoadingResumes(true);
    try {
      const response = await fetch(`${API_URL}/api/resumes/${encodeURIComponent(user.email)}`);
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
      const resumeResponse = await fetch(`${API_URL}/api/generate/optimized-resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_text: parsedResumeText,
          job_description: jobData.description,
          analysis: analysis
        })
      });
      
      if (resumeResponse.ok) {
        const resumeBlob = await resumeResponse.blob();
        setOptimizedResumeUrl(URL.createObjectURL(resumeBlob));
      }
      
      // Step 3: Generate cover letter
      setGenerationProgress('Writing your custom cover letter...');
      const coverResponse = await fetch(`${API_URL}/api/generate/cover-letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_text: parsedResumeText,
          job_description: jobData.description,
          job_title: jobData.jobTitle || 'the position',
          company: jobData.company || 'the company'
        })
      });
      
      if (coverResponse.ok) {
        const coverBlob = await coverResponse.blob();
        setCoverLetterUrl(URL.createObjectURL(coverBlob));
      }
      
      // Auto-save application to tracker
      setGenerationProgress('Saving to your application tracker...');
      if (isAuthenticated && user?.email) {
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
            matchScore: analysis?.matchScore || 0,
            status: 'materials_ready',
            createdAt: new Date().toISOString()
          };
          
          const saveResponse = await fetch(`${API_URL}/api/applications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(applicationData)
          });
          
          if (saveResponse.ok) {
            setApplicationSaved(true);
          }
        } catch (saveError) {
          console.error('Failed to auto-save application:', saveError);
        }
      }
      
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
      
      const response = await fetch(`${API_URL}/api/resumes/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resumeData)
      });
      
      if (response.ok) {
        setResumeSaved(true);
        setShowSaveResumePrompt(false);
        // Refresh saved resumes list
        fetchSavedResumes();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.detail || 'Failed to save resume. Please try again.');
      }
    } catch (error) {
      console.error('Failed to save resume:', error);
      alert('Failed to save resume. Please try again.');
    } finally {
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

            {/* Match Score */}
            {analysisResult?.matchScore && (
              <div className="match-score-display">
                <div className="score-circle">
                  <span className="score-value">{analysisResult.matchScore}%</span>
                  <span className="score-label">Match</span>
                </div>
              </div>
            )}

            {/* Download Buttons */}
            <div className="download-section">
              <h3>Download Your Documents</h3>
              <div className="download-buttons">
                {optimizedResumeUrl && (
                  <a 
                    href={optimizedResumeUrl} 
                    download={`Resume_${jobData.company?.replace(/\s+/g, '_')}_${jobData.jobTitle?.replace(/\s+/g, '_')}.docx`}
                    className="download-btn resume-btn"
                  >
                    <Download className="w-5 h-5" />
                    <div>
                      <strong>Tailored Resume</strong>
                      <span>Optimized for this job</span>
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
                      <strong>Cover Letter</strong>
                      <span>Customized for {jobData.company}</span>
                    </div>
                  </a>
                )}
              </div>
            </div>

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
    </div>
  );
};

export default AIApplyFlow;

