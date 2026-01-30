import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  Menu,
  FileText,
  Target,
  Briefcase,
  Upload,
  Play,
  Loader2
} from 'lucide-react';
import { BRAND } from '../config/branding';
import { API_URL } from '../config/api';
import SideMenu from './SideMenu';
import './SideMenu.css';

const InterviewPrep = () => {
  const navigate = useNavigate();
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [step, setStep] = useState('setup'); // 'setup' or 'active'
  const [file, setFile] = useState(null);
  const [jd, setJd] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleCreateSession = async () => {
    if (!file || !jd || !roleTitle) return;

    setIsCreating(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('jd', jd);
      formData.append('roleTitle', roleTitle);

      const response = await fetch(`${API_URL}/api/interview/create-session`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.sessionId) {
        // Navigate to React interview room
        navigate(`/interview-prep/${data.sessionId}`);
      } else {
        alert('Failed to create session. Please try again.');
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('Network error. Make sure the interview service is running.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="interview-prep-page dark-theme">
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
        <div className="nav-actions">
          <Button variant="ghost" onClick={() => navigate('/ai-ninja')}>
            AI Ninja
          </Button>
          <Button className="btn-primary" onClick={() => navigate('/pricing')}>
            Pricing
          </Button>
        </div>
      </header>

      {/* Setup Form */}
      <main className="interview-setup-container">
        <div className="setup-card">
          <div className="setup-header">
            <h1 className="text-3xl font-bold mb-2">AI Interview Prep</h1>
            <p className="text-gray-400">Practice with our real-time voice interviewer grounded in your resume.</p>
          </div>

          <div className="setup-body space-y-8">
            {/* Step 1: Role */}
            <section className="setup-section">
              <div className="section-title">
                <Briefcase className="w-5 h-5 text-blue-500" />
                <span>What role are you practicing for?</span>
              </div>
              <Input
                placeholder="e.g. Senior Product Manager"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                className="setup-input"
              />
            </section>

            {/* Step 2: Resume */}
            <section className="setup-section">
              <div className="section-title">
                <FileText className="w-5 h-5 text-blue-500" />
                <span>Upload your Resume</span>
              </div>
              <div
                className={`file-upload-zone ${file ? 'has-file' : ''}`}
                onClick={() => document.getElementById('resume-upload').click()}
              >
                <Upload className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">{file ? file.name : 'Click to upload PDF or DOCX'}</p>
                <input
                  id="resume-upload"
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                />
              </div>
            </section>

            {/* Step 3: Job Description */}
            <section className="setup-section">
              <div className="section-title">
                <Target className="w-5 h-5 text-blue-500" />
                <span>Paste the Job Description (optional but recommended)</span>
              </div>
              <textarea
                placeholder="Paste the full job details here to get targeted questions..."
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                className="setup-textarea"
              />
            </section>

            <Button
              className="w-full h-14 btn-primary text-lg font-bold flex items-center justify-center gap-3"
              onClick={handleCreateSession}
              disabled={!file || !roleTitle || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="animate-spin" />
                  Preparing Interview...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Start Mock Interview
                </>
              )}
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer footer-simple">
        <div className="container">
          <div className="footer-content-simple">
            <div className="footer-brand-simple">
              <img src={BRAND.logoPath} alt={BRAND.logoAlt} className="footer-logo-image" />
              <span className="footer-logo">{BRAND.name}</span>
            </div>
            <div className="footer-links-simple">
              <button onClick={() => navigate('/ai-ninja')} className="footer-link">AI Ninja</button>
              <button onClick={() => navigate('/pricing')} className="footer-link">Pricing</button>
            </div>
          </div>
          <div className="footer-bottom">
            <p>{BRAND.copyright}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default InterviewPrep;



