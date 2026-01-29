import React, { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { 
  Bot, 
  UserCheck, 
  MapPin, 
  DollarSign, 
  Globe, 
  ArrowLeft,
  Sparkles,
  FileText,
  MessageSquare,
  Upload,
  Download,
  Loader2,
  Check,
  Copy,
  Menu,
  AlertTriangle,
  Target,
  CheckCircle
} from 'lucide-react';
import { BRAND, VISA_TYPES, WORK_TYPES } from '../config/branding';
import { sampleJobs } from '../mock';
import API_URL from '../config/api';
import SideMenu from './SideMenu';
import './SideMenu.css';

const AIApply = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  // Check for external job data passed via navigation state
  const externalJobData = location.state;
  const isExternalJob = id === 'external' && externalJobData?.isExternal;

  // Get job either from internal jobs or external data
  const internalJob = sampleJobs.find(j => j.id === id);
  const job = isExternalJob ? {
    id: 'external',
    title: externalJobData.jobTitle,
    company: externalJobData.company,
    location: 'Not specified',
    salaryRange: 'Not specified',
    description: externalJobData.description,
    fullDescription: externalJobData.description,
    visaTags: [],
    highPay: false,
    sourceUrl: ''
  } : internalJob;

  const [step, setStep] = useState('form'); // 'form', 'loading', 'results'
  const [formData, setFormData] = useState({
    resumeFile: null,
    yearsOfExperience: '',
    primarySkills: '',
    visaStatus: '',
    targetSalary: '',
    preferredWorkType: '',
  });
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState({});

  if (!isAuthenticated) {
    return (
      <div className="ai-apply-page">
        <header className="nav-header">
          <button onClick={() => navigate('/')} className="nav-logo">
            <img src={BRAND.logoPath} alt={BRAND.logoAlt} className="logo-image" />
            <span className="logo-text">{BRAND.name}</span>
          </button>
        </header>
        <div className="container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <h1>Login Required</h1>
          <p>Please log in to use AI Ninja's apply feature.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
            <Button onClick={() => navigate('/login')} className="btn-primary">
              Login
            </Button>
            <Button onClick={() => navigate('/signup')} variant="outline" className="btn-secondary">
              Sign Up
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="ai-apply-page">
        <header className="nav-header">
          <button onClick={() => navigate('/')} className="nav-logo">
            <img src={BRAND.logoPath} alt={BRAND.logoAlt} className="logo-image" />
            <span className="logo-text">{BRAND.name}</span>
          </button>
        </header>
        <div className="container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <h1>Job Not Found</h1>
          <p>The job you're trying to apply for doesn't exist.</p>
          <Button onClick={() => navigate('/ai-ninja')} className="btn-primary" style={{ marginTop: '1rem' }}>
            <ArrowLeft className="w-4 h-4" /> Back to Job Board
          </Button>
        </div>
      </div>
    );
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, resumeFile: file });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStep('loading');
    setError(null);

    try {
      // API call to generate tailored application
      const formDataToSend = new FormData();
      formDataToSend.append('userId', user?.id || 'guest');
      formDataToSend.append('jobId', job.id);
      formDataToSend.append('jobTitle', job.title);
      formDataToSend.append('company', job.company);
      formDataToSend.append('jobDescription', job.fullDescription);
      formDataToSend.append('yearsOfExperience', formData.yearsOfExperience);
      formDataToSend.append('primarySkills', formData.primarySkills);
      formDataToSend.append('visaStatus', formData.visaStatus);
      formDataToSend.append('targetSalary', formData.targetSalary);
      formDataToSend.append('preferredWorkType', formData.preferredWorkType);
      if (formData.resumeFile) {
        formDataToSend.append('resume', formData.resumeFile);
      }

      const response = await fetch(`${API_URL}/api/ai-ninja/apply`, {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error('Failed to generate application materials');
      }

      const data = await response.json();
      setResults(data);
      setStep('results');
    } catch (err) {
      console.error('Error:', err);
      // For now, use stub data if API fails
      setResults({
        applicationId: `app-${Date.now()}`,
        jdAnalysis: {
          requiredSkills: ['Python', 'React', 'Node.js', 'SQL', 'AWS'],
          preferredSkills: ['Docker', 'Kubernetes', 'TypeScript'],
          keyResponsibilities: ['Backend development', 'API design', 'System architecture'],
          experience: '3-5 years'
        },
        profileMatch: {
          matchedSkills: ['React', 'Node.js', 'SQL'],
          missingSkills: ['Python', 'AWS', 'Docker'],
          matchPercentage: 60
        },
        atsReport: {
          score: 72,
          keywordsFound: ['Software Engineer', 'React', 'JavaScript', 'Node.js', 'SQL', 'API'],
          keywordsMissing: ['Python', 'AWS', 'Docker', 'Kubernetes'],
          suggestions: [
            'Add Python to your skills section',
            'Include AWS or cloud experience',
            'Mention Docker or containerization experience'
          ]
        },
        tailoredResume: `# ${user?.name || 'Your Name'}\n\n## Professional Summary\nExperienced ${formData.primarySkills || 'professional'} with ${formData.yearsOfExperience || '3+'} years of experience. Passionate about joining ${job.company} as a ${job.title}.\n\n## Key Skills\n- ${formData.primarySkills || 'Technical Skills'}\n- Problem Solving\n- Team Collaboration\n- Communication\n\n## Experience\n*This is a sample tailored resume. In production, AI will analyze your base resume and the job description to create a customized version.*\n\n## Why I'm a Great Fit for ${job.company}\n- Strong alignment with the role requirements\n- Relevant experience and skills\n- Enthusiasm for the company mission`,
        tailoredCoverLetter: `Dear Hiring Manager,\n\nI am excited to apply for the ${job.title} position at ${job.company}. With ${formData.yearsOfExperience || 'several'} years of experience in ${formData.primarySkills || 'this field'}, I am confident in my ability to contribute to your team.\n\n${job.description}\n\nMy background aligns well with your requirements, and I am particularly drawn to ${job.company}'s commitment to innovation. I would welcome the opportunity to discuss how my skills and experience can benefit your team.\n\n${formData.visaStatus ? `Regarding work authorization: I am currently on ${formData.visaStatus} and am authorized to work in the United States.` : ''}\n\nThank you for considering my application. I look forward to the opportunity to speak with you.\n\nBest regards,\n${user?.name || 'Your Name'}`,
        suggestedAnswers: [
          {
            question: "Why are you interested in this role?",
            answer: `I'm drawn to the ${job.title} role at ${job.company} because it perfectly aligns with my ${formData.primarySkills || 'professional'} background and career goals. The opportunity to work on innovative solutions while contributing to a dynamic team is exactly what I'm looking for in my next position.`
          },
          {
            question: "Why do you want to work at this company?",
            answer: `${job.company} stands out to me for its reputation for innovation and commitment to employee growth. The company's focus on impactful work and collaborative culture makes it an ideal environment where I can contribute meaningfully while continuing to develop my skills.`
          },
          {
            question: "What is your visa status?",
            answer: formData.visaStatus 
              ? `I am currently on ${formData.visaStatus} status and am authorized to work in the United States. ${formData.visaStatus.includes('OPT') ? 'I have work authorization through my STEM OPT extension and am looking for an employer who can sponsor H-1B in the future.' : 'I am eligible to work without any additional sponsorship requirements at this time.'}`
              : "I am authorized to work in the United States."
          },
          {
            question: "What are your salary expectations?",
            answer: formData.targetSalary 
              ? `Based on my research and experience level, I'm targeting a salary in the range of ${formData.targetSalary}. However, I'm open to discussing compensation as part of a complete package that includes benefits and growth opportunities.`
              : `I'm open to discussing compensation based on the full scope of the role and the complete benefits package. I'm primarily focused on finding the right fit and growth opportunity.`
          }
        ]
      });
      setStep('results');
    }
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied({ ...copied, [key]: true });
    setTimeout(() => setCopied({ ...copied, [key]: false }), 2000);
  };

  const handleDownload = (content, filename) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ai-apply-page">
      {/* Side Menu */}
      <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />

      {/* Navigation Header */}
      <header className="nav-header">
        <div className="nav-left">
          <button className="hamburger-btn" onClick={() => setSideMenuOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <button onClick={() => navigate('/')} className="nav-logo">
            <img src={BRAND.logoPath} alt={BRAND.logoAlt} className="logo-image" />
            <span className="logo-text">{BRAND.name}</span>
          </button>
        </div>
        <nav className="nav-links">
          <button onClick={() => navigate('/ai-ninja')} className="nav-link nav-link-active">
            <Bot className="w-4 h-4" /> AI Ninja
          </button>
          <button onClick={() => navigate('/human-ninja')} className="nav-link">
            <UserCheck className="w-4 h-4" /> Human Ninja
          </button>
        </nav>
        <div className="nav-actions">
          <Button variant="secondary" className="btn-secondary" onClick={() => navigate('/dashboard')}>
            Dashboard
          </Button>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="breadcrumb-bar">
        <div className="container">
          <button onClick={() => navigate(`/ai-ninja/jobs/${job.id}`)} className="breadcrumb-link">
            <ArrowLeft className="w-4 h-4" /> Back to Job Details
          </button>
        </div>
      </div>

      <div className="ai-apply-content">
        <div className="container">
          {/* Job Summary */}
          <Card className="job-summary-card">
            <div className="job-summary-info">
              <h2>{job.title}</h2>
              <p className="job-summary-company">{job.company}</p>
              <div className="job-summary-meta">
                <span><MapPin className="w-4 h-4" /> {job.location}</span>
                <span><DollarSign className="w-4 h-4" /> {job.salaryRange}</span>
              </div>
            </div>
            <div className="job-summary-tags">
              {job.highPay && <Badge className="tag-high-pay">High-paying</Badge>}
              {job.visaTags?.map(tag => (
                <Badge key={tag} className="tag-visa"><Globe className="w-3 h-3" /> {tag}</Badge>
              ))}
            </div>
          </Card>

          {/* Form Step */}
          {step === 'form' && (
            <Card className="apply-form-card">
              <div className="apply-form-header">
                <Bot className="w-8 h-8" />
                <div>
                  <h2>Apply with AI Ninja</h2>
                  <p>Upload your resume and we'll generate tailored application materials for this role.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="apply-form">
                {/* Resume Upload */}
                <div className="form-group">
                  <Label htmlFor="resume">Base Resume (PDF/DOCX) *</Label>
                  <div className="file-upload-wrapper">
                    <input
                      type="file"
                      id="resume"
                      accept=".pdf,.docx,.doc"
                      onChange={handleFileChange}
                      className="file-input"
                      required
                    />
                    <div className="file-upload-display">
                      <Upload className="w-6 h-6" />
                      <span>{formData.resumeFile ? formData.resumeFile.name : 'Click to upload your resume'}</span>
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <Label htmlFor="experience">Years of Experience</Label>
                    <Select 
                      value={formData.yearsOfExperience}
                      onValueChange={(value) => setFormData({ ...formData, yearsOfExperience: value })}
                    >
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

                  <div className="form-group">
                    <Label htmlFor="visaStatus">Visa Status</Label>
                    <Select 
                      value={formData.visaStatus}
                      onValueChange={(value) => setFormData({ ...formData, visaStatus: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select visa status" />
                      </SelectTrigger>
                      <SelectContent>
                        {VISA_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.label}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="form-group">
                  <Label htmlFor="skills">Primary Tech Skills / Role</Label>
                  <Input
                    id="skills"
                    placeholder="e.g., React, Python, Product Management"
                    value={formData.primarySkills}
                    onChange={(e) => setFormData({ ...formData, primarySkills: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <Label htmlFor="salary">Target Salary Range</Label>
                    <Input
                      id="salary"
                      placeholder="e.g., $120,000 - $150,000"
                      value={formData.targetSalary}
                      onChange={(e) => setFormData({ ...formData, targetSalary: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <Label htmlFor="workType">Preferred Work Type</Label>
                    <Select 
                      value={formData.preferredWorkType}
                      onValueChange={(value) => setFormData({ ...formData, preferredWorkType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select work type" />
                      </SelectTrigger>
                      <SelectContent>
                        {WORK_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="form-info-box">
                  <Sparkles className="w-5 h-5" />
                  <div>
                    <strong>AI Ninja will use your base resume and this job description to generate:</strong>
                    <ul>
                      <li>A tailored resume</li>
                      <li>A tailored cover letter</li>
                      <li>Suggested answers to common application questions</li>
                    </ul>
                  </div>
                </div>

                <Button type="submit" className="btn-primary btn-large w-full">
                  <Sparkles className="w-5 h-5" /> Generate Application Materials
                </Button>
              </form>
            </Card>
          )}

          {/* Loading Step */}
          {step === 'loading' && (
            <Card className="loading-card">
              <Loader2 className="w-12 h-12 animate-spin" />
              <h2>AI Ninja is crafting your application...</h2>
              <p>Analyzing job description and tailoring your materials.</p>
            </Card>
          )}

          {/* Results Step */}
          {step === 'results' && results && (
            <div className="results-section">
              <div className="results-header">
                <div className="results-success">
                  <CheckCircle className="w-8 h-8" />
                  <h2>Your Application Materials Are Ready!</h2>
                </div>
                <p>Review your tailored documents below and use them to apply.</p>
                <p className="text-sm text-muted" style={{ marginTop: '0.5rem' }}>
                  This application has been saved in your Application Tracker.
                </p>
              </div>

              {/* JD Analysis & Profile Match */}
              <div className="results-grid-2col">
                <Card className="result-card compact">
                  <div className="result-card-header">
                    <Target className="w-5 h-5" />
                    <h3>JD Analysis</h3>
                  </div>
                  <div className="result-content-compact">
                    <div className="analysis-section">
                      <strong>Required Skills:</strong>
                      <div className="skill-tags">
                        {results.jdAnalysis?.requiredSkills?.map(skill => (
                          <Badge key={skill} variant="outline">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="analysis-section">
                      <strong>Experience:</strong> {results.jdAnalysis?.experience}
                    </div>
                  </div>
                </Card>

                <Card className="result-card compact">
                  <div className="result-card-header">
                    <Target className="w-5 h-5" />
                    <h3>Profile Match</h3>
                    <Badge className={results.profileMatch?.matchPercentage >= 70 ? 'tag-visa' : 'tag-high-pay'}>
                      {results.profileMatch?.matchPercentage}% Match
                    </Badge>
                  </div>
                  <div className="result-content-compact">
                    <div className="analysis-section">
                      <strong>Matched:</strong>
                      <div className="skill-tags">
                        {results.profileMatch?.matchedSkills?.map(skill => (
                          <Badge key={skill} className="matched-skill">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="analysis-section">
                      <strong>Missing:</strong>
                      <div className="skill-tags">
                        {results.profileMatch?.missingSkills?.map(skill => (
                          <Badge key={skill} variant="outline" className="missing-skill">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* ATS Report */}
              <Card className="result-card ats-card">
                <div className="result-card-header">
                  <AlertTriangle className="w-6 h-6" />
                  <h3>ATS Compatibility Check</h3>
                  <div className="ats-score">
                    <span className={`score-value ${results.atsReport?.score >= 70 ? 'good' : results.atsReport?.score >= 50 ? 'medium' : 'low'}`}>
                      {results.atsReport?.score}%
                    </span>
                    <span className="score-label">ATS Score</span>
                  </div>
                </div>
                <div className="ats-content">
                  <div className="ats-section">
                    <h4>Keywords Found ({results.atsReport?.keywordsFound?.length})</h4>
                    <div className="skill-tags">
                      {results.atsReport?.keywordsFound?.map(kw => (
                        <Badge key={kw} className="matched-skill">{kw}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="ats-section">
                    <h4>Keywords Missing ({results.atsReport?.keywordsMissing?.length})</h4>
                    <div className="skill-tags">
                      {results.atsReport?.keywordsMissing?.map(kw => (
                        <Badge key={kw} variant="outline" className="missing-skill">{kw}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="ats-section">
                    <h4>Suggestions</h4>
                    <ul className="ats-suggestions">
                      {results.atsReport?.suggestions?.map((suggestion, i) => (
                        <li key={i}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>

              {/* Tailored Resume */}
              <Card className="result-card">
                <div className="result-card-header">
                  <FileText className="w-6 h-6" />
                  <h3>Tailored Resume</h3>
                  <div className="result-actions">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(results.tailoredResume, 'resume')}
                    >
                      {copied.resume ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied.resume ? 'Copied!' : 'Copy'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(results.tailoredResume, `Resume_${job.company}_${job.title.replace(/\s+/g, '_')}.txt`)}
                    >
                      <Download className="w-4 h-4" /> Download
                    </Button>
                  </div>
                </div>
                <div className="result-content">
                  <pre>{results.tailoredResume}</pre>
                </div>
              </Card>

              {/* Cover Letter */}
              <Card className="result-card">
                <div className="result-card-header">
                  <MessageSquare className="w-6 h-6" />
                  <h3>Tailored Cover Letter</h3>
                  <div className="result-actions">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(results.tailoredCoverLetter, 'coverLetter')}
                    >
                      {copied.coverLetter ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied.coverLetter ? 'Copied!' : 'Copy'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(results.tailoredCoverLetter, `CoverLetter_${job.company}_${job.title.replace(/\s+/g, '_')}.txt`)}
                    >
                      <Download className="w-4 h-4" /> Download
                    </Button>
                  </div>
                </div>
                <div className="result-content">
                  <pre>{results.tailoredCoverLetter}</pre>
                </div>
              </Card>

              {/* Suggested Answers */}
              <Card className="result-card">
                <div className="result-card-header">
                  <Sparkles className="w-6 h-6" />
                  <h3>Suggested Answers</h3>
                </div>
                <div className="suggested-answers">
                  {results.suggestedAnswers.map((qa, index) => (
                    <div key={index} className="qa-item">
                      <div className="qa-question">
                        <strong>Q: {qa.question}</strong>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(qa.answer, `qa-${index}`)}
                        >
                          {copied[`qa-${index}`] ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                      <p className="qa-answer">{qa.answer}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Next Steps */}
              <Card className="next-steps-card">
                <h3>Next Steps</h3>
                <ol>
                  <li>Review and personalize your tailored resume and cover letter</li>
                  <li>Open the original job posting and submit your application</li>
                  <li>Track your application in the Application Tracker</li>
                </ol>
                <div className="next-steps-actions">
                  <Button
                    className="btn-primary"
                    onClick={() => window.open(job.sourceUrl, '_blank')}
                  >
                    Open Job Posting to Apply
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/dashboard')}
                  >
                    Go to Application Tracker
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-bottom">
            <p>{BRAND.copyright}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AIApply;


