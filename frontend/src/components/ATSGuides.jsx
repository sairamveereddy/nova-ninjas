import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
    BookOpen,
    CheckCircle,
    AlertTriangle,
    HelpCircle,
    FileText,
    ChevronDown,
    ChevronUp,
    Target,
    Zap,
    Shield
} from 'lucide-react';
import SideMenu from './SideMenu';
import Header from './Header';
import './ATSGuides.css';

const ATSGuides = () => {
    const [sideMenuOpen, setSideMenuOpen] = useState(false);
    const [expandedSection, setExpandedSection] = useState('what-is-ats');

    const sections = [
        {
            id: 'what-is-ats',
            title: 'What is an ATS?',
            icon: HelpCircle,
            content: `An Applicant Tracking System (ATS) is software used by employers to collect, sort, scan, and rank job applications. Over 90% of Fortune 500 companies use ATS software.

**How it works:**
1. Your resume is uploaded to the system
2. The ATS parses your resume into a database
3. Keywords are scanned and matched to the job description
4. Your application is ranked against other candidates
5. Recruiters review top-ranked candidates first

**Key Stats:**
• 75% of resumes are rejected by ATS before a human sees them
• The average job posting receives 250+ applications
• Only the top 25% of applications typically get reviewed`
        },
        {
            id: 'formatting',
            title: 'ATS-Friendly Formatting',
            icon: FileText,
            content: `**DO use:**
✓ Simple, clean fonts (Arial, Calibri, Times New Roman)
✓ Standard section headers (Experience, Education, Skills)
✓ Consistent formatting throughout
✓ .docx or .pdf format (check job posting)
✓ Single column layout
✓ Bullet points for achievements

**DON'T use:**
✗ Tables, columns, or text boxes
✗ Headers or footers (contact info gets cut off)
✗ Images, graphics, or logos
✗ Unusual fonts or special characters
✗ Colored backgrounds
✗ Fancy borders or lines`
        },
        {
            id: 'keywords',
            title: 'Keyword Optimization',
            icon: Target,
            content: `**Finding the right keywords:**
1. Read the job description carefully
2. Identify repeated terms and required skills
3. Note both technical skills and soft skills
4. Check the "requirements" and "qualifications" sections

**Placement strategy:**
• Include keywords in your Summary section
• Use exact phrases from the job posting
• Include both spelled-out terms AND acronyms (e.g., "Search Engine Optimization (SEO)")
• Distribute keywords naturally throughout

**Keyword categories to include:**
• Job titles & variations
• Hard skills (software, tools, technologies)
• Soft skills (leadership, communication)
• Industry-specific terminology
• Certifications and qualifications`
        },
        {
            id: 'common-mistakes',
            title: 'Common ATS Mistakes',
            icon: AlertTriangle,
            content: `**Mistake #1: Using a creative template**
Solution: Stick to clean, simple formats

**Mistake #2: Putting contact info in the header**
Solution: Place it in the main body of your resume

**Mistake #3: Using non-standard section titles**
Solution: Use "Experience" not "Where I've Worked"

**Mistake #4: Keyword stuffing**
Solution: Use keywords naturally in context

**Mistake #5: Not tailoring for each application**
Solution: Customize keywords for each job

**Mistake #6: Submitting as PDF (when DOCX requested)**
Solution: Always follow the application instructions`
        },
        {
            id: 'optimize-score',
            title: 'Boosting Your ATS Score',
            icon: Zap,
            content: `**Step-by-step optimization:**

1. **Match your job title** - If the job is "Product Manager" and you were a "Product Lead," consider using "Product Manager / Product Lead"

2. **Mirror the language** - Use the exact phrases from the job description

3. **Include numbers** - Quantifiable achievements (increased sales by 25%)

4. **List relevant skills** - Create a dedicated Skills section

5. **Use the full name + acronym** - "Bachelor of Science (B.S.)"

6. **Keep it clean** - No graphics, unusual formatting, or complex layouts

**Pro tip:** Use our Resume Scanner tool to check your ATS score before applying!`
        }
    ];

    const quickTips = [
        { icon: CheckCircle, text: 'Use standard fonts like Arial or Calibri' },
        { icon: CheckCircle, text: 'Include keywords from the job description' },
        { icon: CheckCircle, text: 'Keep formatting simple and clean' },
        { icon: CheckCircle, text: 'Use standard section headings' },
        { icon: CheckCircle, text: 'Save as .docx unless PDF is specified' },
        { icon: CheckCircle, text: 'Put contact info in the body, not header' }
    ];

    return (
        <div className="ats-guides-page">
            <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />
            <Header onMenuClick={() => setSideMenuOpen(true)} />

            <div className="ats-guides-container">
                <div className="ats-guides-hero">
                    <div className="hero-badge">
                        <BookOpen className="w-5 h-5" />
                        <span>ATS Guides</span>
                    </div>
                    <h1>Beat the ATS: <span className="text-gradient">Complete Guide</span></h1>
                    <p>Learn how Applicant Tracking Systems work and how to optimize your resume</p>
                </div>

                {/* Quick Tips */}
                <Card className="quick-tips-card">
                    <h3><Shield className="w-5 h-5" /> Quick ATS Checklist</h3>
                    <div className="quick-tips-grid">
                        {quickTips.map((tip, index) => (
                            <div key={index} className="quick-tip">
                                <tip.icon className="w-5 h-5 text-green-500" />
                                <span>{tip.text}</span>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Accordion Sections */}
                <div className="guides-accordion">
                    {sections.map(section => (
                        <Card key={section.id} className="accordion-item">
                            <button
                                className={`accordion-header ${expandedSection === section.id ? 'expanded' : ''}`}
                                onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                            >
                                <div className="header-left">
                                    <section.icon className="w-5 h-5" />
                                    <span>{section.title}</span>
                                </div>
                                {expandedSection === section.id ? (
                                    <ChevronUp className="w-5 h-5" />
                                ) : (
                                    <ChevronDown className="w-5 h-5" />
                                )}
                            </button>
                            {expandedSection === section.id && (
                                <div className="accordion-content">
                                    <div className="content-text">
                                        {section.content.split('\n').map((line, i) => {
                                            if (line.startsWith('**') && line.endsWith('**')) {
                                                return <h4 key={i}>{line.replace(/\*\*/g, '')}</h4>;
                                            }
                                            if (line.startsWith('✓') || line.startsWith('✗') || line.startsWith('•')) {
                                                return <p key={i} className="list-item">{line}</p>;
                                            }
                                            if (line.match(/^\d\./)) {
                                                return <p key={i} className="numbered-item">{line}</p>;
                                            }
                                            return <p key={i}>{line}</p>;
                                        })}
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>

                {/* CTA */}
                <Card className="cta-card">
                    <h3>Ready to Test Your Resume?</h3>
                    <p>Use our free Resume Scanner to check your ATS compatibility score</p>
                    <Button className="cta-btn" onClick={() => window.location.href = '/scanner'}>
                        <Zap className="w-5 h-5" />
                        Scan Your Resume Now
                    </Button>
                </Card>
            </div>
        </div>
    );
};

export default ATSGuides;
