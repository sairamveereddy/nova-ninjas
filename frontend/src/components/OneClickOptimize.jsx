import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
    Upload,
    FileText,
    Zap,
    Loader2,
    Download,
    CheckCircle,
    ArrowRight,
    Sparkles,
    X
} from 'lucide-react';
import { BRAND } from '../config/branding';
import { API_URL } from '../config/api';
import SideMenu from './SideMenu';
import Header from './Header';
import './OneClickOptimize.css';

const OneClickOptimize = () => {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();
    const [sideMenuOpen, setSideMenuOpen] = useState(false);

    const [resumeFile, setResumeFile] = useState(null);
    const [jobDescription, setJobDescription] = useState('');
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizedResume, setOptimizedResume] = useState(null);
    const [error, setError] = useState(null);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setResumeFile(file);
            setError(null);
        }
    };

    const handleOptimize = async () => {
        if (!resumeFile) {
            setError('Please upload a resume first');
            return;
        }

        setIsOptimizing(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('resume', resumeFile);
            formData.append('job_description', jobDescription || 'General optimization for ATS systems');

            const response = await fetch(`${API_URL}/api/scan/analyze`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Optimization failed');
            }

            const data = await response.json();
            setOptimizedResume(data);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsOptimizing(false);
        }
    };

    const downloadOptimizedResume = async () => {
        try {
            const response = await fetch(`${API_URL}/api/generate/resume`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user?.id || 'guest',
                    resume_text: optimizedResume?.resumeText || '',
                    job_description: jobDescription,
                    analysis: optimizedResume?.analysis
                })
            });

            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'Optimized_Resume.docx';
            document.body.appendChild(a);
            a.click();

            // Cleanup with delay to ensure download starts
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="optimize-page">
            <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />
            <Header onMenuClick={() => setSideMenuOpen(true)} />

            <div className="optimize-container">
                <div className="optimize-hero">
                    <div className="hero-badge">
                        <Zap className="w-5 h-5" />
                        <span>One-Click Optimize</span>
                    </div>
                    <h1>Optimize Your Resume <span className="text-gradient">Instantly</span></h1>
                    <p>Upload your resume and let AI automatically optimize it for ATS systems. Get more interviews with a perfectly tailored resume.</p>
                </div>

                {!optimizedResume ? (
                    <Card className="optimize-card">
                        <div className="upload-section">
                            <h2><Upload className="w-5 h-5" /> Upload Your Resume</h2>

                            <div
                                className={`upload-zone ${resumeFile ? 'has-file' : ''}`}
                                onClick={() => document.getElementById('resume-upload').click()}
                            >
                                <input
                                    id="resume-upload"
                                    type="file"
                                    accept=".pdf,.docx,.txt"
                                    onChange={handleFileUpload}
                                    hidden
                                />
                                {resumeFile ? (
                                    <div className="uploaded-file">
                                        <FileText className="w-12 h-12" style={{ color: 'var(--primary)' }} />
                                        <span className="file-name">{resumeFile.name}</span>
                                        <button className="remove-file" onClick={(e) => { e.stopPropagation(); setResumeFile(null); }}>
                                            <X className="w-4 h-4" /> Remove
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-12 h-12" style={{ color: '#94a3b8' }} />
                                        <p>Click to upload your resume</p>
                                        <span className="file-types">PDF, DOCX, or TXT</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="job-section">
                            <h3><Sparkles className="w-5 h-5" /> Add Job Description (Optional)</h3>
                            <p>For better optimization, paste the job description you're targeting</p>
                            <textarea
                                placeholder="Paste job description here for targeted optimization..."
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                rows={6}
                            />
                        </div>

                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}

                        <Button
                            className="optimize-btn"
                            onClick={handleOptimize}
                            disabled={!resumeFile || isOptimizing}
                        >
                            {isOptimizing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Optimizing...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-5 h-5" />
                                    One-Click Optimize
                                </>
                            )}
                        </Button>
                    </Card>
                ) : (
                    <Card className="results-card">
                        <div className="results-header">
                            <CheckCircle className="w-12 h-12 text-green-500" />
                            <h2>Resume Optimized!</h2>
                            <p>Your resume has been optimized for ATS systems</p>
                        </div>

                        <div className="score-display">
                            <div className="score-circle" style={{ '--score': optimizedResume.analysis?.matchScore || 85 }}>
                                <span className="score-number">{optimizedResume.analysis?.matchScore || 85}%</span>
                            </div>
                            <p>ATS Compatibility Score</p>
                        </div>

                        <div className="action-buttons">
                            <Button className="download-btn" onClick={downloadOptimizedResume}>
                                <Download className="w-5 h-5" />
                                Download Optimized Resume
                            </Button>
                            <Button variant="outline" onClick={() => navigate('/scanner')}>
                                <ArrowRight className="w-5 h-5" />
                                View Detailed Analysis
                            </Button>
                        </div>

                        <Button variant="ghost" onClick={() => { setOptimizedResume(null); setResumeFile(null); }}>
                            Optimize Another Resume
                        </Button>
                    </Card>
                )}

                {/* Features Section */}
                <div className="features-section">
                    <h2>Why One-Click Optimize?</h2>
                    <div className="features-grid">
                        <div className="feature-card">
                            <Zap className="w-8 h-8 text-yellow-500" />
                            <h3>Instant Results</h3>
                            <p>Get your optimized resume in seconds, not hours</p>
                        </div>
                        <div className="feature-card">
                            <CheckCircle className="w-8 h-8 text-green-500" />
                            <h3>ATS-Friendly</h3>
                            <p>Pass through Applicant Tracking Systems with ease</p>
                        </div>
                        <div className="feature-card">
                            <Sparkles className="w-8 h-8 text-purple-500" />
                            <h3>AI-Powered</h3>
                            <p>Advanced AI understands what recruiters want</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OneClickOptimize;
