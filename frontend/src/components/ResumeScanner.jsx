import React, { useState } from 'react';
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
  FileDown
} from 'lucide-react';
import { BRAND } from '../config/branding';
import { API_URL } from '../config/api';
import SideMenu from './SideMenu';
import Header from './Header';
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

  const handleAnalyze = async () => {
    if (!resumeFile || !jobDescription.trim()) {
      setError('Please upload a resume and enter a job description');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
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

      const data = await response.json();
      setAnalysisResult(data.analysis);
      setParsedResumeText(data.resumeText || ''); // Store for document generation
      setCurrentStep(3);

      // Save scan if user is authenticated
      if (isAuthenticated && user?.email) {
        try {
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
        } catch (saveError) {
          console.error('Failed to save scan:', saveError);
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
          resume_text: parsedResumeText || jobDescription, // fallback
          job_description: jobDescription,
          job_title: jobTitle || 'Position',
          company: company || 'Company',
          analysis: analysisResult
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate resume');
      }
      
      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Optimized_Resume_${company || 'Job'}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
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
      a.href = url;
      a.download = `Cover_Letter_${company || 'Job'}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
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
            <div className="step-number">{currentStep > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}</div>
            <span>Upload Resume</span>
          </div>
          <div className="step-line" />
          <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
            <div className="step-number">{currentStep > 2 ? <CheckCircle className="w-5 h-5" /> : '2'}</div>
            <span>Add Job</span>
          </div>
          <div className="step-line" />
          <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
            <div className="step-number">3</div>
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

            <div className="paste-option">
              <button onClick={() => {/* Future: paste text option */}}>
                Or paste resume text
              </button>
            </div>

            <Button 
              className="btn-primary next-btn"
              disabled={!resumeFile}
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
                placeholder="Copy and paste a job description here..."
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
            </div>

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
      </div>
    </div>
  );
};

export default ResumeScanner;

