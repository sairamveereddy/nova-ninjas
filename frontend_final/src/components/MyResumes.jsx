import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Menu,
  FileText, 
  Upload, 
  Download, 
  Eye, 
  Trash2, 
  Bot,
  Plus,
  Calendar,
  Tag,
  Loader2,
  CheckCircle,
  X
} from 'lucide-react';
import { BRAND } from '../config/branding';
import { API_URL } from '../config/api';
import SideMenu from './SideMenu';
import './SideMenu.css';

const MyResumes = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newResumeFile, setNewResumeFile] = useState(null);
  const [newResumeLabel, setNewResumeLabel] = useState('');

  // Mock resumes for demo
  useEffect(() => {
    const fetchResumes = async () => {
      setIsLoading(true);
      try {
        // TODO: Replace with actual API call
        // const response = await fetch(`${API_URL}/api/resumes/${user?.email}`);
        // const data = await response.json();
        
        // Mock data for now
        const mockResumes = [
          {
            id: '1',
            label: 'Base Resume',
            fileName: 'john_doe_resume.pdf',
            origin: 'upload',
            createdAt: '2025-01-02T10:00:00Z',
            isBase: true
          },
          {
            id: '2',
            label: 'Backend-focused',
            fileName: 'john_doe_backend.pdf',
            origin: 'Generated for: Senior Backend Engineer at Google',
            createdAt: '2025-01-03T14:30:00Z',
            jobId: 'job_123',
            isBase: false
          },
          {
            id: '3',
            label: 'Data Engineer',
            fileName: 'john_doe_data.pdf',
            origin: 'Generated for: Data Engineer at Microsoft',
            createdAt: '2025-01-04T09:15:00Z',
            jobId: 'job_456',
            isBase: false
          }
        ];
        
        setResumes(mockResumes);
      } catch (error) {
        console.error('Error fetching resumes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchResumes();
    }
  }, [isAuthenticated, user?.email]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewResumeFile(file);
    }
  };

  const handleUploadSubmit = async () => {
    if (!newResumeFile) return;

    setUploading(true);
    try {
      // TODO: Implement actual upload
      const formData = new FormData();
      formData.append('resume', newResumeFile);
      formData.append('label', newResumeLabel || 'Base Resume');
      formData.append('email', user?.email);

      // Mock success
      await new Promise(resolve => setTimeout(resolve, 1500));

      const newResume = {
        id: Date.now().toString(),
        label: newResumeLabel || 'Base Resume',
        fileName: newResumeFile.name,
        origin: 'upload',
        createdAt: new Date().toISOString(),
        isBase: resumes.length === 0
      };

      setResumes(prev => [newResume, ...prev]);
      setUploadModalOpen(false);
      setNewResumeFile(null);
      setNewResumeLabel('');
    } catch (error) {
      console.error('Error uploading resume:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this resume?')) return;

    try {
      // TODO: Implement actual delete
      setResumes(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting resume:', error);
    }
  };

  const handleStartApplication = (resumeId) => {
    navigate('/ai-ninja', { state: { selectedResumeId: resumeId } });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="resumes-page">
        <div className="auth-required">
          <FileText className="w-16 h-16 text-gray-300" />
          <h2>Login Required</h2>
          <p>Please log in to manage your resumes.</p>
          <Button className="btn-primary" onClick={() => navigate('/login')}>
            Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="resumes-page">
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
          <Button variant="secondary" onClick={() => navigate('/dashboard')}>
            Dashboard
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="resumes-content">
        <div className="container">
          <div className="resumes-header">
            <div>
              <h1>My Resumes</h1>
              <p>Manage your base resume and AI-generated tailored versions</p>
            </div>
            <Button className="btn-primary" onClick={() => setUploadModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Upload Resume
            </Button>
          </div>

          {isLoading ? (
            <div className="loading-state">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p>Loading your resumes...</p>
            </div>
          ) : resumes.length === 0 ? (
            <Card className="empty-state">
              <CardContent className="pt-6 text-center">
                <Upload className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3>No resumes yet</h3>
                <p>Upload your base resume to start using AI Ninja.</p>
                <Button className="btn-primary mt-4" onClick={() => setUploadModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Upload Your First Resume
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="resumes-grid">
              {resumes.map(resume => (
                <Card key={resume.id} className={`resume-card ${resume.isBase ? 'base-resume' : ''}`}>
                  <CardContent className="pt-6">
                    <div className="resume-header">
                      <div className="resume-icon">
                        <FileText className="w-8 h-8" />
                      </div>
                      <div className="resume-actions">
                        <Button variant="ghost" size="sm" title="View">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Download">
                          <Download className="w-4 h-4" />
                        </Button>
                        {!resume.isBase && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Delete"
                            onClick={() => handleDelete(resume.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="resume-info">
                      <h3 className="resume-label">
                        {resume.label}
                        {resume.isBase && <Badge className="ml-2">Base</Badge>}
                      </h3>
                      <p className="resume-filename">{resume.fileName}</p>
                      
                      <div className="resume-meta">
                        <span className="meta-item">
                          <Calendar className="w-4 h-4" />
                          {formatDate(resume.createdAt)}
                        </span>
                        <span className="meta-item">
                          <Tag className="w-4 h-4" />
                          {resume.origin === 'upload' ? 'Uploaded' : resume.origin}
                        </span>
                      </div>
                    </div>

                    <div className="resume-footer">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => handleStartApplication(resume.id)}
                      >
                        <Bot className="w-4 h-4 mr-2" /> Use for New Application
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="modal-overlay" onClick={() => setUploadModalOpen(false)}>
          <Card className="upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><Upload className="w-5 h-5" /> Upload Resume</h2>
              <button className="modal-close" onClick={() => setUploadModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <Label>Resume Label (optional)</Label>
                <Input
                  placeholder="e.g., Backend-focused, Data Engineer, Base Resume"
                  value={newResumeLabel}
                  onChange={(e) => setNewResumeLabel(e.target.value)}
                />
              </div>

              <div className="form-group">
                <Label>Resume File *</Label>
                <div className="file-upload-area">
                  <input
                    type="file"
                    id="resume-file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label htmlFor="resume-file" className="file-upload-label">
                    {newResumeFile ? (
                      <div className="file-selected">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                        <span>{newResumeFile.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8" />
                        <span>Click to upload PDF, DOC, or DOCX</span>
                        <span className="text-sm text-muted">Max 5MB</span>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <Button variant="outline" onClick={() => setUploadModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="btn-primary"
                onClick={handleUploadSubmit}
                disabled={!newResumeFile || uploading}
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" /> Upload Resume</>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MyResumes;

