import React, { useState } from 'react';
import {
    User, Mail, Phone, MapPin, Linkedin, Github, Globe,
    GraduationCap, Briefcase, Code, Users, Shield,
    Plus, Trash2, Save, Upload, CheckCircle2,
    ExternalLink, FileText, ChevronRight, Loader2, AlertCircle, Sparkles
} from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import './ProfileOrion.css';

const ProfileOrion = ({
    profile,
    handleProfileChange,
    handleArrayChange,
    addArrayItem,
    removeArrayItem,
    handleFileUpload,
    handleResumeSync,
    handleSaveProfile,
    isSaving,
    isSyncing,
    saveMessage,
    user
}) => {
    const [activeSubTab, setActiveSubTab] = useState('personal');

    const subTabs = [
        { id: 'personal', label: 'Personal', icon: User },
        { id: 'education', label: 'Education', icon: GraduationCap },
        { id: 'experience', label: 'Work Experience', icon: Briefcase },
        { id: 'skills', label: 'Skills', icon: Code },
        { id: 'eeo', label: 'Equal Employment', icon: Shield },
    ];

    const calculateCompletion = () => {
        let total = 0;
        let filled = 0;

        // Personal
        total += 4;
        if (profile.person.firstName) filled++;
        if (profile.person.lastName) filled++;
        if (profile.person.email) filled++;
        if (profile.person.phone) filled++;

        // Experience & Education
        total += 2;
        if (profile.employment_history?.length > 0) filled++;
        if (profile.education?.length > 0) filled++;

        return Math.round((filled / total) * 100);
    };

    const completion = calculateCompletion();

    const renderPersonal = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight uppercase">{profile.person.fullName || 'User Name'}</h2>
                <button
                    onClick={handleSaveProfile}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-emerald-600 font-bold flex items-center gap-1"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-5 h-5" />}
                    <span className="text-xs">SAVE</span>
                </button>
            </div>

            <div className="flex flex-wrap gap-3">
                {profile.person.location && (
                    <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full text-sm text-gray-700">
                        <MapPin className="w-4 h-4" /> {profile.person.location}
                    </div>
                )}
                {profile.person.email && (
                    <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full text-sm text-gray-700">
                        <Mail className="w-4 h-4" /> {profile.person.email}
                    </div>
                )}
                {profile.person.phone && (
                    <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full text-sm text-gray-700">
                        <Phone className="w-4 h-4" /> {profile.person.phone}
                    </div>
                )}
            </div>

            <div className="flex flex-wrap gap-3">
                {profile.person.linkedinUrl && (
                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full text-sm text-blue-700">
                        <Linkedin className="w-4 h-4" /> Linkedin Connected
                    </div>
                )}
                {profile.person.githubUrl && (
                    <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-full text-sm text-white">
                        <Github className="w-4 h-4" /> GitHub
                    </div>
                )}
            </div>

            {/* Basic Info Form */}
            <Card className="border-none shadow-none bg-transparent pt-4">
                <CardContent className="p-0 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label>First Name</Label>
                            <Input value={profile.person.firstName} onChange={(e) => handleProfileChange('person', 'firstName', e.target.value)} />
                        </div>
                        <div>
                            <Label>Middle Name</Label>
                            <Input value={profile.person.middleName} onChange={(e) => handleProfileChange('person', 'middleName', e.target.value)} />
                        </div>
                        <div>
                            <Label>Last Name</Label>
                            <Input value={profile.person.lastName} onChange={(e) => handleProfileChange('person', 'lastName', e.target.value)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <Label>Full Name (as on legal documents)</Label>
                            <Input value={profile.person.fullName} onChange={(e) => handleProfileChange('person', 'fullName', e.target.value)} />
                        </div>
                        <div>
                            <Label>Preferred Name</Label>
                            <Input value={profile.person.preferredName} onChange={(e) => handleProfileChange('person', 'preferredName', e.target.value)} />
                        </div>
                        <div>
                            <Label>Pronouns</Label>
                            <Input value={profile.person.pronouns} placeholder="e.g. He/Him" onChange={(e) => handleProfileChange('person', 'pronouns', e.target.value)} />
                        </div>
                        <div>
                            <Label>Phone</Label>
                            <Input value={profile.person.phone} onChange={(e) => handleProfileChange('person', 'phone', e.target.value)} />
                        </div>
                        <div>
                            <Label>Personal Website / Portfolio</Label>
                            <Input value={profile.person.portfolioUrl} placeholder="https://..." onChange={(e) => handleProfileChange('person', 'portfolioUrl', e.target.value)} />
                        </div>
                        <div>
                            <Label>LinkedIn URL</Label>
                            <Input value={profile.person.linkedinUrl} onChange={(e) => handleProfileChange('person', 'linkedinUrl', e.target.value)} />
                        </div>
                        <div>
                            <Label>GitHub URL</Label>
                            <Input value={profile.person.githubUrl} onChange={(e) => handleProfileChange('person', 'githubUrl', e.target.value)} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Address */}
            <div className="pt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Location & Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <Label>Street Address</Label>
                        <Input value={profile.address.line1} onChange={(e) => handleProfileChange('address', 'line1', e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                        <Label>Apt, Suite, etc. (Optional)</Label>
                        <Input value={profile.address.line2} onChange={(e) => handleProfileChange('address', 'line2', e.target.value)} />
                    </div>
                    <div>
                        <Label>City</Label>
                        <Input value={profile.address.city} onChange={(e) => handleProfileChange('address', 'city', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label>State</Label>
                            <Input value={profile.address.state} onChange={(e) => handleProfileChange('address', 'state', e.target.value)} />
                        </div>
                        <div>
                            <Label>Zip Code</Label>
                            <Input value={profile.address.zip} onChange={(e) => handleProfileChange('address', 'zip', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <Label>Country</Label>
                        <Input value={profile.address.country} onChange={(e) => handleProfileChange('address', 'country', e.target.value)} />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderEducation = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-xl text-orange-600">
                        <GraduationCap className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Education</h2>
                </div>
                <Button variant="outline" size="sm" onClick={() => addArrayItem('education', { school: '', degree: '', major: '', location: '', end_date: '', gpa: '' })} className="border-gray-200">
                    <Plus className="w-4 h-4 mr-1" /> Add Degree
                </Button>
            </div>

            <div className="space-y-12">
                {profile.education.map((edu, index) => (
                    <div key={index} className="relative pl-8 border-l-2 border-orange-100 pb-2">
                        <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full border-2 border-orange-300 bg-white" />
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <div className="font-bold text-gray-900 text-lg">{edu.school || 'New Institution'}</div>
                                <button onClick={() => removeArrayItem('education', index)} className="text-gray-400 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="text-gray-700">{edu.degree}{edu.major ? ` in ${edu.major}` : ''}</div>
                            <div className="text-sm text-gray-500">{edu.end_date} {edu.location ? `| ${edu.location}` : ''}</div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 p-6 bg-gray-50 rounded-[24px]">
                                <div>
                                    <Label className="text-xs uppercase text-gray-500 font-bold">School Name</Label>
                                    <Input value={edu.school} onChange={(e) => handleArrayChange('education', index, 'school', e.target.value)} />
                                </div>
                                <div>
                                    <Label className="text-xs uppercase text-gray-500 font-bold">Degree Type</Label>
                                    <Input value={edu.degree} onChange={(e) => handleArrayChange('education', index, 'degree', e.target.value)} />
                                </div>
                                <div>
                                    <Label className="text-xs uppercase text-gray-500 font-bold">Major / Field</Label>
                                    <Input value={edu.major} onChange={(e) => handleArrayChange('education', index, 'major', e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label className="text-xs uppercase text-gray-500 font-bold">Graduation</Label>
                                        <Input value={edu.end_date} placeholder="MM/YYYY" onChange={(e) => handleArrayChange('education', index, 'end_date', e.target.value)} />
                                    </div>
                                    <div>
                                        <Label className="text-xs uppercase text-gray-500 font-bold">GPA</Label>
                                        <Input value={edu.gpa} placeholder="4.0" onChange={(e) => handleArrayChange('education', index, 'gpa', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {profile.education.length === 0 && (
                    <div className="text-center py-16 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-100">
                        <GraduationCap className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                        <h4 className="text-gray-900 font-bold mb-1">No Academic History</h4>
                        <p className="text-gray-500 text-sm">Add your degrees to help our AI match you better.</p>
                        <Button variant="outline" className="mt-6 rounded-full" onClick={() => addArrayItem('education', { school: '', degree: '', major: '', location: '', end_date: '', gpa: '' })}>
                            <Plus className="w-4 h-4 mr-1" /> Add Education
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );

    const renderExperience = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                        <Briefcase className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Work Experience</h2>
                </div>
                <Button variant="outline" size="sm" onClick={() => addArrayItem('employment_history', { company: '', title: '', location: '', start_date: '', end_date: '', is_current: false, summary: '' })} className="border-gray-200">
                    <Plus className="w-4 h-4 mr-1" /> Add Job
                </Button>
            </div>

            <div className="space-y-12">
                {profile.employment_history.map((job, index) => (
                    <div key={index} className="relative pl-8 border-l-2 border-indigo-100 pb-2">
                        <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full border-2 border-indigo-300 bg-white" />
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <div className="font-bold text-gray-900 text-lg">{job.title || 'Job Title'}</div>
                                <button onClick={() => removeArrayItem('employment_history', index)} className="text-gray-400 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="text-gray-800 font-medium">{job.company}</div>
                            <div className="text-sm text-gray-500 mb-4">{job.start_date} - {job.is_current ? 'Present' : job.end_date} {job.location ? `| ${job.location}` : ''}</div>

                            {job.summary && (
                                <div className="text-sm text-gray-600 leading-relaxed mb-6 bg-gray-50/50 p-4 rounded-xl border border-gray-50">
                                    {String(job.summary || '').split('\n').filter(Boolean).map((line, i) => (
                                        <div key={i} className="flex gap-2 mb-1">
                                            <span className="text-emerald-500 shrink-0 mt-0.5"><CheckCircle2 className="w-3.5 h-3.5" /></span>
                                            <span>{String(line || '').replace(/^[•\-\*]\s*/, '')}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-gray-50 rounded-[24px]">
                                <div>
                                    <Label className="text-xs uppercase text-gray-500 font-bold">Company</Label>
                                    <Input value={job.company} onChange={(e) => handleArrayChange('employment_history', index, 'company', e.target.value)} />
                                </div>
                                <div>
                                    <Label className="text-xs uppercase text-gray-500 font-bold">Title</Label>
                                    <Input value={job.title} onChange={(e) => handleArrayChange('employment_history', index, 'title', e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label className="text-xs uppercase text-gray-500 font-bold">Start Date</Label>
                                        <Input placeholder="MM/YYYY" value={job.start_date} onChange={(e) => handleArrayChange('employment_history', index, 'start_date', e.target.value)} />
                                    </div>
                                    <div>
                                        <Label className="text-xs uppercase text-gray-500 font-bold">End Date</Label>
                                        <Input placeholder="Present" value={job.end_date} onChange={(e) => handleArrayChange('employment_history', index, 'end_date', e.target.value)} disabled={job.is_current} />
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs uppercase text-gray-500 font-bold">Location</Label>
                                    <Input value={job.location} onChange={(e) => handleArrayChange('employment_history', index, 'location', e.target.value)} />
                                </div>
                                <div className="md:col-span-2">
                                    <Label className="text-xs uppercase text-gray-500 font-bold">Responsibilities & Achievements</Label>
                                    <Textarea rows={5} value={job.summary} onChange={(e) => handleArrayChange('employment_history', index, 'summary', e.target.value)} placeholder="One bullet point per line..." />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderSkills = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
                    <Code className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Skills & Technical Expertise</h2>
            </div>

            <div className="space-y-8">
                <div>
                    <Label className="text-base font-bold text-gray-800 mb-3 block">Primary Technical Skills</Label>
                    <div className="p-6 bg-gray-50 rounded-[24px] border border-gray-100">
                        <Textarea
                            rows={4}
                            value={profile.skills.primary}
                            onChange={(e) => handleProfileChange('skills', 'primary', e.target.value)}
                            placeholder="e.g. React, Python, AWS, Docker..."
                            className="bg-white border-gray-200 text-lg"
                        />
                        <div className="mt-6 flex flex-wrap gap-2">
                            {(profile.skills.primary || '').split(',').map(s => s.trim()).filter(Boolean).map(skill => (
                                <Badge key={skill} variant="secondary" className="bg-white shadow-sm text-emerald-700 border-none px-4 py-1.5 text-sm font-bold">
                                    {skill}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <Label className="text-base font-bold text-gray-800 mb-3 block">Languages</Label>
                        <Textarea
                            rows={3}
                            value={profile.skills.languages}
                            onChange={(e) => handleProfileChange('skills', 'languages', e.target.value)}
                            placeholder="e.g. English (Native), Spanish (Conversational)..."
                            className="rounded-2xl"
                        />
                    </div>
                    <div>
                        <Label className="text-base font-bold text-gray-800 mb-3 block">Certifications</Label>
                        <Textarea
                            rows={3}
                            value={profile.certifications_text}
                            onChange={(e) => handleProfileChange(null, 'certifications_text', e.target.value)}
                            placeholder="List any professional certifications..."
                            className="rounded-2xl"
                        />
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                    <Label className="text-base font-bold text-gray-800 mb-4 block">Application Preferences</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label className="text-xs uppercase text-gray-500 font-bold">Desired Salary</Label>
                            <Input value={profile.preferences.expected_salary} placeholder="e.g. $120k - $150k" onChange={(e) => handleProfileChange('preferences', 'expected_salary', e.target.value)} />
                        </div>
                        <div>
                            <Label className="text-xs uppercase text-gray-500 font-bold">Notice Period</Label>
                            <Input value={profile.preferences.notice_period} placeholder="e.g. 2 weeks" onChange={(e) => handleProfileChange('preferences', 'notice_period', e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderEEO = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                    <Shield className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Equal Employment Opportunity</h2>
            </div>

            <p className="text-gray-500 text-sm max-w-2xl leading-relaxed">
                Companies are often required to collect this information for diversity reporting. This data is handled securely and typically not seen by hiring managers.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                <div className="space-y-2">
                    <Label className="font-bold text-gray-700">Work Authorization</Label>
                    <Select value={profile.work_authorization.authorized_to_work} onValueChange={(v) => handleProfileChange('work_authorization', 'authorized_to_work', v)}>
                        <SelectTrigger className="bg-gray-50 rounded-xl h-12 border-none"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="yes">Yes, I am authorized to work</SelectItem>
                            <SelectItem value="no">No, I am not authorized</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="font-bold text-gray-700">Sponsorship Requirement</Label>
                    <Select value={profile.work_authorization.requires_sponsorship_future} onValueChange={(v) => handleProfileChange('work_authorization', 'requires_sponsorship_future', v)}>
                        <SelectTrigger className="bg-gray-50 rounded-xl h-12 border-none"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="yes">Yes, I will require sponsorship</SelectItem>
                            <SelectItem value="no">No, I will not require sponsorship</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="font-bold text-gray-700">Disability Status</Label>
                    <Select value={profile.sensitive.disability} onValueChange={(v) => handleProfileChange('sensitive', 'disability', v)}>
                        <SelectTrigger className="bg-gray-50 rounded-xl h-12 border-none"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="no">No, I do not have a disability</SelectItem>
                            <SelectItem value="yes">Yes, I have a disability</SelectItem>
                            <SelectItem value="decline">I do not wish to answer</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="font-bold text-gray-700">Gender Identity</Label>
                    <Select value={profile.sensitive.gender} onValueChange={(v) => handleProfileChange('sensitive', 'gender', v)}>
                        <SelectTrigger className="bg-gray-50 rounded-xl h-12 border-none"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Non-binary">Non-binary</SelectItem>
                            <SelectItem value="Decline">Decline to state</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="font-bold text-gray-700">Race / Ethnicity</Label>
                    <Select value={profile.sensitive.race} onValueChange={(v) => handleProfileChange('sensitive', 'race', v)}>
                        <SelectTrigger className="bg-gray-50 rounded-xl h-12 border-none"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Asian">Asian</SelectItem>
                            <SelectItem value="Black">Black or African American</SelectItem>
                            <SelectItem value="Hispanic">Hispanic or Latino</SelectItem>
                            <SelectItem value="White">White</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                            <SelectItem value="Decline">Decline to state</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="font-bold text-gray-700">Veteran Status</Label>
                    <Select value={profile.sensitive.veteran} onValueChange={(v) => handleProfileChange('sensitive', 'veteran', v)}>
                        <SelectTrigger className="bg-gray-50 rounded-xl h-12 border-none"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="No">No, I am not a veteran</SelectItem>
                            <SelectItem value="Yes">Yes, I am a veteran</SelectItem>
                            <SelectItem value="Decline">Decline to state</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );

    return (
        <div className="profile-orion-container">
            {/* Header Bar */}
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-black text-gray-900">PROFILE</h1>
                <Button className="bg-emerald-400 hover:bg-emerald-500 text-gray-900 font-bold rounded-full px-6 flex gap-2">
                    <span className="bg-white rounded-full p-0.5"><Sparkles className="w-3.5 h-3.5" /></span>
                    Upgrade to Turbo: Get Hired Faster <ChevronRight className="w-4 h-4" />
                </Button>
            </div>

            {/* Save Message Notification */}
            {saveMessage && (
                <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${saveMessage.includes('success') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                    }`}>
                    {saveMessage.includes('success') ? <CheckCircle2 className="w-5 h-5 font-bold" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="font-bold">{saveMessage}</span>
                </div>
            )}

            {/* Info Banner */}
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-[28px] p-5 flex items-center gap-4 mb-8">
                <div className="bg-emerald-400 p-2.5 rounded-2xl">
                    <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                    <p className="text-gray-900 font-bold text-sm">Your Data is End-to-End Encrypted</p>
                    <p className="text-gray-500 text-xs">Profile information is kept strictly private and used only for application tailoring.</p>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8">
                    {/* Internal Sub-Tabs */}
                    <div className="flex items-center gap-8 border-b border-gray-100 mb-8 overflow-x-auto no-scrollbar scroll-smooth">
                        {subTabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveSubTab(tab.id)}
                                    className={`pb-4 text-sm font-bold transition-all relative flex items-center gap-2 ${activeSubTab === tab.id ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    <Icon className={`w-4 h-4 ${activeSubTab === tab.id ? 'text-emerald-500' : 'text-gray-300'}`} />
                                    {tab.label}
                                    {activeSubTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900 rounded-full" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab Content Area */}
                    <div className="bg-white rounded-[40px] border border-gray-100 p-12 min-h-[600px] shadow-sm relative overflow-hidden">
                        {/* Background pattern */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/20 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

                        <div className="relative z-10">
                            {activeSubTab === 'personal' && renderPersonal()}
                            {activeSubTab === 'education' && renderEducation()}
                            {activeSubTab === 'experience' && renderExperience()}
                            {activeSubTab === 'skills' && renderSkills()}
                            {activeSubTab === 'eeo' && renderEEO()}
                        </div>

                        {/* Save Profile Button */}
                        <div className="mt-16 pt-10 border-t border-gray-50 flex justify-end">
                            <Button
                                onClick={handleSaveProfile}
                                className="bg-gray-900 hover:bg-black text-white px-10 py-7 rounded-[22px] font-bold flex gap-3 shadow-lg shadow-gray-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Saving Changes...</>
                                ) : (
                                    <><Save className="w-5 h-5 text-emerald-400" /> Save Universal Profile</>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Status Widget */}
                    <div className="bg-indigo-600 rounded-[40px] p-10 relative overflow-hidden text-white shadow-xl shadow-indigo-100">
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 border border-white/10">
                                {completion === 100 ? <CheckCircle2 className="w-8 h-8 text-white" /> : <Sparkles className="w-8 h-8 text-emerald-300" />}
                            </div>

                            <div className="space-y-2 mb-8">
                                <h3 className="text-2xl font-black leading-tight tracking-tight uppercase">
                                    {completion === 100 ? 'Profile Optimized' : 'Power Up Your Ninja'}
                                </h3>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-400 transition-all duration-1000" style={{ width: `${completion}%` }} />
                                    </div>
                                    <span className="font-black text-sm">{completion}%</span>
                                </div>
                            </div>

                            <p className="text-indigo-100 font-medium mb-8 leading-relaxed">
                                {completion === 100
                                    ? "Your profile is 100% complete. Our AI is now primed to give you the highest possible match scores!"
                                    : "Complete your profile to unlock Turbo features and 2x better job matching accuracy."}
                            </p>

                            <Button onClick={() => window.location.href = '/ai-ninja'} className="w-full bg-white hover:bg-gray-50 text-indigo-600 py-7 rounded-2xl font-black transition-all hover:translate-y-[-2px] shadow-lg shadow-indigo-900/20">
                                {completion === 100 ? 'START APPLYING' : 'EXPLORE JOBS'}
                            </Button>
                        </div>

                        {/* Abstract shapes */}
                        <div className="absolute top-[-20%] right-[-20%] w-60 h-60 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute bottom-[-10%] left-[-10%] w-40 h-40 bg-indigo-400/20 rounded-full blur-2xl pointer-events-none" />
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-4">
                        <h4 className="px-4 text-xs font-black text-gray-400 uppercase tracking-widest mb-2">QUICK ACTIONS</h4>

                        <button
                            onClick={() => document.getElementById('resume-upload').click()}
                            className="w-full flex items-center justify-between p-7 bg-white border border-gray-100 rounded-[32px] hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group shadow-sm"
                        >
                            <div className="flex items-center gap-5">
                                <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-emerald-100/50 transition-all">
                                    <FileText className="w-6 h-6 text-gray-600 group-hover:text-emerald-600" />
                                </div>
                                <div className="text-left">
                                    <span className="block font-black text-gray-900 text-sm">UPDATE RESUME</span>
                                    <span className="text-[10px] text-gray-400 font-bold">PDF, DOCX supported</span>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                        </button>

                        <button
                            onClick={() => setActiveSubTab('personal')}
                            className="w-full flex items-center justify-between p-7 bg-white border border-gray-100 rounded-[32px] hover:border-blue-200 hover:bg-blue-50/30 transition-all group shadow-sm"
                        >
                            <div className="flex items-center gap-5">
                                <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-blue-100/50 transition-all">
                                    <Linkedin className="w-6 h-6 text-gray-600 group-hover:text-blue-600" />
                                </div>
                                <div className="text-left">
                                    <span className="block font-black text-gray-900 text-sm">LINKEDIN SYNC</span>
                                    <span className="text-[10px] text-gray-400 font-bold">Auto-fill experience</span>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                        </button>

                        <div className="p-8 bg-gradient-to-br from-gray-900 to-black rounded-[32px] mt-8 text-white relative overflow-hidden border border-white/5">
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 text-emerald-400 mb-4 font-black text-[10px] tracking-widest uppercase">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Ninja Insight
                                </div>
                                <p className="text-sm font-bold text-gray-300 leading-relaxed mb-6">
                                    High-completion profiles are <strong>87% more likely</strong> to pass ATS filters on JobNinjas.
                                </p>
                                <div className="flex -space-x-3 mb-4">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-gray-800 flex items-center justify-center text-[10px] font-black">
                                            {String.fromCharCode(64 + i)}
                                        </div>
                                    ))}
                                    <div className="w-8 h-8 rounded-full border-2 border-black bg-emerald-500 flex items-center justify-center text-[10px] font-black text-black">
                                        +50
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-500 font-bold uppercase">Applied in last 24h</p>
                            </div>
                        </div>
                    </div>

                    {/* Hidden Input for Resume Sync */}
                    <input
                        type="file"
                        id="resume-upload"
                        className="hidden"
                        accept=".pdf,.doc,.docx"
                        onChange={handleResumeSync}
                    />
                </div>
            </div>
        </div>
    );
};

export default ProfileOrion;
