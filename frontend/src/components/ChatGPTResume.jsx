import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
    MessageSquare,
    Loader2,
    Copy,
    Check,
    Send,
    RefreshCw,
    FileText,
    Download,
    Sparkles
} from 'lucide-react';
import { API_URL } from '../config/api';
import SideMenu from './SideMenu';
import Header from './Header';
import './ChatGPTResume.css';
import ResumePaper from './ResumePaper';

const ChatGPTResume = () => {
    const navigate = useNavigate();
    const [sideMenuOpen, setSideMenuOpen] = useState(false);

    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hi! I'm your AI Resume Assistant. Tell me about your experience and the job you're targeting, and I'll help you craft the perfect resume. What's your current role and target position?"
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedResume, setGeneratedResume] = useState('');
    const [copied, setCopied] = useState(false);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const conversationContext = messages.map(m => `${m.role}: ${m.content}`).join('\n');

            const prompt = `You are a professional resume writing assistant. Based on this conversation, help the user with their resume.

Previous conversation:
${conversationContext}

User's latest message: ${input}

If the user has provided enough information about their experience and target role, generate a professional resume section or full resume. Otherwise, ask clarifying questions to gather:
- Their current/past job titles and companies
- Key achievements and responsibilities
- Skills and qualifications
- Target job/industry

Be helpful, professional, and provide specific, actionable resume content when possible.`;

            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/ai/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': token
                },
                body: JSON.stringify({ prompt, max_tokens: 1500 })
            });

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            const data = await response.json();
            const assistantMessage = { role: 'assistant', content: data.response };
            setMessages(prev => [...prev, assistantMessage]);

            // Check if response contains resume content
            if (data.response.includes('RESUME') || data.response.includes('EXPERIENCE') || data.response.includes('SUMMARY')) {
                setGeneratedResume(data.response);
            }

        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I apologize, but I'm having trouble processing your request. Please try again or provide more details about your experience."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const copyResume = () => {
        navigator.clipboard.writeText(generatedResume);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const startOver = () => {
        setMessages([{
            role: 'assistant',
            content: "Hi! I'm your AI Resume Assistant. Tell me about your experience and the job you're targeting, and I'll help you craft the perfect resume. What's your current role and target position?"
        }]);
        setGeneratedResume('');
    };

    return (
        <div className="chatgpt-page">
            <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />
            <Header onMenuClick={() => setSideMenuOpen(true)} />

            <div className="chatgpt-container">
                <div className="chatgpt-hero">
                    <div className="hero-badge chatgpt-badge">
                        <MessageSquare className="w-5 h-5" />
                        <span>ChatGPT Resume Writer</span>
                    </div>
                    <h1>Write Your Resume with <span className="text-gradient-chat">AI Assistance</span></h1>
                    <p>Have a conversation with AI to build your perfect resume step by step</p>
                </div>

                <div className="chat-layout">
                    <Card className="chat-card">
                        <div className="chat-messages">
                            {messages.map((message, index) => (
                                <div key={index} className={`message ${message.role}`}>
                                    <div className="message-avatar">
                                        {message.role === 'assistant' ? (
                                            <Sparkles className="w-5 h-5" />
                                        ) : (
                                            <span>You</span>
                                        )}
                                    </div>
                                    <div className="message-content">
                                        <pre>{message.content}</pre>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="message assistant">
                                    <div className="message-avatar">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <div className="message-content typing">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Thinking...</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="chat-input-area">
                            <textarea
                                placeholder="Tell me about your experience, skills, and target job..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                rows={2}
                            />
                            <Button
                                className="send-btn"
                                onClick={sendMessage}
                                disabled={!input.trim() || isLoading}
                            >
                                <Send className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="chat-actions">
                            <Button variant="ghost" size="sm" onClick={startOver}>
                                <RefreshCw className="w-4 h-4" />
                                Start Over
                            </Button>
                        </div>
                    </Card>

                    {generatedResume && (
                        <Card className="resume-preview-card">
                            <div className="preview-header">
                                <h3><FileText className="w-5 h-5" /> Generated Resume</h3>
                                <Button variant="outline" size="sm" onClick={copyResume}>
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {copied ? 'Copied!' : 'Copy'}
                                </Button>
                            </div>
                            <div className="preview-content bg-gray-900 flex justify-center p-8 overflow-hidden relative border border-gray-800 rounded-lg">
                                <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center' }}>
                                    <ResumePaper content={generatedResume} scale={1} />
                                </div>
                            </div>
                            <Button className="download-btn" onClick={() => navigate('/scanner')}>
                                <Download className="w-4 h-4" />
                                Optimize & Download
                            </Button>
                        </Card>
                    )}
                </div>

                {/* Tips */}
                <div className="tips-section">
                    <h3>Tips for Best Results</h3>
                    <div className="tips-grid">
                        <div className="tip">Share your current job title and years of experience</div>
                        <div className="tip">Mention specific achievements with numbers</div>
                        <div className="tip">Tell me your target role and industry</div>
                        <div className="tip">List your key skills and certifications</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatGPTResume;
