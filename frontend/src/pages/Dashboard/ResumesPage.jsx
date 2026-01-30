import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
    FileText,
    Upload,
    Download,
    Eye,
    Trash2,
    Plus,
    Calendar,
    Loader2,
    CheckCircle,
    X,
    Zap,
    Briefcase
} from 'lucide-react';
import { API_URL } from '../../config/api';

const ResumesPage = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const [resumes, setResumes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [newResumeFile, setNewResumeFile] = useState(null);
    const [newResumeLabel, setNewResumeLabel] = useState('');

    const fetchResumes = async () => {
        if (!user?.email) return;
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/resumes?email=${encodeURIComponent(user.email)}`);
            if (response.ok) {
                const data = await response.json();
                setResumes(data.resumes || []);
            }
        } catch (error) {
            console.error('Error fetching resumes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) fetchResumes();
    }, [isAuthenticated, user?.email]);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) setNewResumeFile(file);
    };

    const handleUploadSubmit = async () => {
        if (!newResumeFile) return;
        setUploading(true);
        try {
            // Mock upload for now as per current implementation
            await new Promise(resolve => setTimeout(resolve, 1500));
            const newResume = {
                id: Date.now().toString(),
                label: newResumeLabel || 'Base Resume',
                fileName: newResumeFile.name,
                createdAt: new Date().toISOString(),
                isBase: resumes.length === 0
            };
            setResumes(prev => [newResume, ...prev]);
            setUploadModalOpen(false);
            setNewResumeFile(null);
            setNewResumeLabel('');
        } finally {
            setUploading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">My Resumes</h1>
                    <p className="text-gray-500 mt-1">Manage and tailor your resumes for every application.</p>
                </div>
                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setUploadModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Upload New
                </Button>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-green-600" />
                </div>
            ) : resumes.length === 0 ? (
                <Card className="p-12 text-center border-dashed border-2 border-gray-200 shadow-none">
                    <Upload className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No resumes yet</h3>
                    <p className="text-gray-500 mb-6">Upload your base resume to start tailoring it for jobs.</p>
                    <Button onClick={() => setUploadModalOpen(true)}>Upload Your First Resume</Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {resumes.map(resume => (
                        <Card key={resume.id} className="p-6 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <FileText className="w-8 h-8 text-gray-400" />
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="sm"><Download className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="sm"><Trash2 className="w-4 h-4 text-gray-400" /></Button>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold truncate mb-1">
                                {resume.label || 'Untitled Resume'}
                                {resume.isBase && <Badge className="ml-2 bg-blue-100 text-blue-600 border-none">Base</Badge>}
                            </h3>
                            <p className="text-sm text-gray-400 mb-6 truncate">{resume.fileName}</p>

                            <div className="flex items-center gap-4 text-xs text-gray-500 mb-6 font-medium">
                                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDate(resume.createdAt)}</span>
                                {resume.companyName && <span className="flex items-center gap-1 text-green-600"><Briefcase className="w-3.5 h-3.5" /> {resume.companyName}</span>}
                            </div>

                            <Button variant="outline" className="w-full hover:bg-black hover:text-white transition-colors" onClick={() => navigate('/dashboard/tools/resume-scanner', { state: { resumeId: resume.id } })}>
                                Optimize with AI
                            </Button>
                        </Card>
                    ))}
                </div>
            )}

            {/* Upload Modal */}
            {uploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <Card className="w-full max-w-md p-6 bg-white animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">Upload Resume</h3>
                            <Button variant="ghost" size="sm" onClick={() => setUploadModalOpen(false)}><X className="w-5 h-5" /></Button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Label (e.g. Fullstack Engineer)</Label>
                                <Input placeholder="Enter a name for this resume" value={newResumeLabel} onChange={(e) => setNewResumeLabel(e.target.value)} />
                            </div>

                            <div className="space-y-2">
                                <Label>File (PDF, DOCX)</Label>
                                <div className="border-2 border-dashed border-gray-100 rounded-xl p-8 text-center hover:border-green-200 transition-colors cursor-pointer" onClick={() => document.getElementById('dash-res-file').click()}>
                                    <input type="file" id="dash-res-file" className="hidden" onChange={handleFileUpload} />
                                    {newResumeFile ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <CheckCircle className="w-6 h-6 text-green-500" />
                                            <span className="font-medium">{newResumeFile.name}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                                            <p className="text-sm text-gray-500">Click to browse files</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <Button variant="outline" className="flex-1" onClick={() => setUploadModalOpen(false)}>Cancel</Button>
                            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={!newResumeFile || uploading} onClick={handleUploadSubmit}>
                                {uploading ? 'Uploading...' : 'Upload'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default ResumesPage;
