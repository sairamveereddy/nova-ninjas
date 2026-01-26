import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Maximize2, Edit3, Loader2 } from 'lucide-react';

const ResumePaper = ({ content, scale = 1, onContentChange }) => {
    const [parsed, setParsed] = useState(null);
    const containerRef = useRef(null);

    // Simple Regex-based Resume Parser
    const parseResumeContent = (text) => {
        if (!text) return null;

        // Clean up common AI artifacts
        let cleanText = text.replace(/ORIGINAL RESUME TEXT:[\s\S]*$/i, '').trim();
        cleanText = cleanText.replace(/ORIGINAL CONTENT:[\s\S]*$/i, '').trim();

        const sections = {
            header: '',
            summary: '',
            skills: '',
            experience: '',
            projects: '',
            education: ''
        };

        // Split text into lines
        const lines = cleanText.split('\n');
        let currentSection = 'header';
        let buffer = [];

        const sectionPatterns = {
            name: /^#*\s*NAME/i,
            contact: /^#*\s*CONTACT/i,
            summary: /^#*\s*(PROFESSIONAL SUMMARY|SUMMARY|PROFILE|OBJECTIVE)/i,
            skills: /^#*\s*(SKILLS|CORE COMPETENCIES|TECHNICAL SKILLS)/i,
            experience: /^#*\s*(EXPERIENCE|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|EMPLOYMENT HISTORY)/i,
            projects: /^#*\s*(PROJECTS|KEY PROJECTS)/i,
            education: /^#*\s*(EDUCATION|ACADEMIC BACKGROUND)/i
        };

        for (let line of lines) {
            const trimmed = line.trim();
            let matched = false;

            // Check if line matches a section header
            for (const [key, regex] of Object.entries(sectionPatterns)) {
                if (regex.test(trimmed) && trimmed.length < 50) {
                    if (buffer.length > 0) {
                        sections[currentSection] = sections[currentSection] + (sections[currentSection] ? '\n' : '') + buffer.join('\n');
                        buffer = [];
                    }
                    currentSection = key;
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                buffer.push(line);
            }
        }

        if (buffer.length > 0) {
            sections[currentSection] = sections[currentSection] + (sections[currentSection] ? '\n' : '') + buffer.join('\n');
        }

        // Final cleanup: trim all section content and remove redundant newlines
        Object.keys(sections).forEach(key => {
            if (typeof sections[key] === 'string') {
                sections[key] = sections[key]
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0) // Remove empty lines inside sections
                    .join('\n');
            }
        });

        // Process Header
        let name = sections.name || '';
        let contact = sections.contact || '';

        if (!name) {
            const headerLines = sections.header.split('\n').filter(l => l.trim());
            name = headerLines[0] || '';
            if (!contact) {
                contact = headerLines.slice(1).join(' | ').replace(/\|+/g, ' | ');
            }
        }

        // Clean up "NAME" and "CONTACT" labels if they got into the text
        name = name.replace(/^NAME\n?/i, '').trim();
        contact = contact.replace(/^CONTACT\n?/i, '').trim();

        // Detect if parsing failed (everything dumped in header)
        const isRaw = !sections.summary && !sections.experience && !sections.education && sections.header.length > 20;

        return { ...sections, name, contact, isRaw, rawContent: text };
    };

    useEffect(() => {
        setParsed(parseResumeContent(content));
    }, [content]);

    if (!parsed) return <div className="p-10 text-center">Loading document...</div>;

    return (
        <div
            className="bg-white shadow-2xl origin-top transition-transform duration-300 relative"
            style={{
                width: '816px', // A4 width at 96 DPI
                minHeight: '1056px', // A4 height
                transform: `scale(${scale})`,
                padding: '48px',
                fontFamily: '"Times New Roman", Times, serif',
                color: '#000'
            }}
        >
            {/* Floating Actions */}
            <div className="absolute top-4 right-4 flex gap-2 z-10 no-print" style={{ transform: `scale(${1 / scale})`, transformOrigin: 'top right' }}>
                <Button size="sm" className="bg-[#10b981] hover:bg-[#059669] text-white font-bold h-8 text-xs gap-1 shadow-sm">
                    Fit to one page
                </Button>
                <Button size="sm" className="bg-[#10b981] hover:bg-[#059669] text-white font-bold h-8 text-xs gap-1 shadow-sm">
                    <Edit3 className="w-3 h-3" /> Edit
                </Button>
            </div>

            {/* Render Document */}
            <div className="space-y-1" contentEditable suppressContentEditableWarning>

                {parsed.isRaw ? (
                    /* Raw Fallback View */
                    <div className="whitespace-pre-wrap font-serif text-sm leading-relaxed">
                        {parsed.rawContent}
                    </div>
                ) : (
                    /* Structured View */
                    <>
                        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                            <h1 style={{ fontSize: '24pt', fontWeight: 'bold', textTransform: 'uppercase', margin: 0, padding: 0 }}>{parsed.name}</h1>
                            <p style={{ fontSize: '9pt', margin: 0, padding: 0 }}>{parsed.contact}</p>
                        </div>

                        {parsed.summary && (
                            <div style={{ margin: 0, padding: 0 }}>
                                <h2 style={{ fontSize: '10pt', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid black', margin: 0, padding: 0 }}>Professional Summary</h2>
                                <p style={{ fontSize: '10pt', lineHeight: '1.1', textAlign: 'justify', margin: 0, padding: 0 }}>{parsed.summary.trim()}</p>
                            </div>
                        )}

                        {parsed.skills && (
                            <div style={{ margin: 0, padding: 0 }}>
                                <h2 style={{ fontSize: '10pt', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid black', margin: 0, padding: 0 }}>Skills</h2>
                                <div style={{ fontSize: '10pt', lineHeight: '1.1', margin: 0, padding: 0 }}>
                                    {parsed.skills.split('\n').filter(l => l.trim()).map((skillLine, i) => (
                                        <div key={i} style={{ margin: 0, padding: 0 }}>• {skillLine.replace(/^([•\-\*]|#+)\s*/, '')}</div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {parsed.experience && (
                            <div style={{ margin: 0, padding: 0 }}>
                                <h2 style={{ fontSize: '10pt', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid black', margin: 0, padding: 0 }}>Experience</h2>
                                <div style={{ fontSize: '10pt', lineHeight: '1.1', whiteSpace: 'pre-wrap', margin: 0, padding: 0 }}>
                                    {parsed.experience.trim()}
                                </div>
                            </div>
                        )}

                        {parsed.projects && (
                            <div style={{ margin: 0, padding: 0 }}>
                                <h2 style={{ fontSize: '10pt', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid black', margin: 0, padding: 0 }}>Projects</h2>
                                <div style={{ fontSize: '10pt', lineHeight: '1.1', whiteSpace: 'pre-wrap', margin: 0, padding: 0 }}>{parsed.projects.trim()}</div>
                            </div>
                        )}

                        {parsed.education && (
                            <div style={{ margin: 0, padding: 0 }}>
                                <h2 style={{ fontSize: '10pt', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid black', margin: 0, padding: 0 }}>Education</h2>
                                <div style={{ fontSize: '10pt', lineHeight: '1.1', whiteSpace: 'pre-wrap', margin: 0, padding: 0 }}>{parsed.education.trim()}</div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Pagination Footer */}
            <div className="absolute bottom-4 left-0 right-0 text-center no-print">
                <span className="bg-black text-white text-xs font-bold px-3 py-1 rounded-full opacity-80">1/1</span>
            </div>
        </div >
    );
};

export default ResumePaper;
