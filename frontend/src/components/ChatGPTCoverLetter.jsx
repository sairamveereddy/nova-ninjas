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
    Sparkles,
    Mail
} from 'lucide-react';
import { API_URL } from '../config/api';
import SideMenu from './SideMenu';
import Header from './Header';
import './ChatGPTCoverLetter.css';

const ChatGPTCoverLetter = () => {
    const navigate = useNavigate();
    const [sideMenuOpen, setSideMenuOpen] = useState(false);

    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hi! I'm your AI Cover Letter Assistant. Tell me about the job you're applying for and your relevant experience, and I'll help you craft a compelling cover letter. What position are you interested in?"
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedLetter, setGeneratedLetter] = useState('');
    const [copied, setCopied] = useState(false);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const conversationContext = messages.map(m => `${m.role}: ${m.content}`).join('\n');

            const prompt = `You are a professional cover letter writing assistant. Based on this conversation, help the user write their cover letter.

Previous conversation:
${conversationContext}

User's latest message: ${input}

If the user has provided enough information (job title, company, their experience), generate a professional cover letter. Otherwise, ask clarifying questions to gather:
- The job title and company name
- Why they're interested in this role
- Their relevant experience and achievements
- What makes them a good fit

When generating a cover letter:
- Use a professional but warm tone
- Include specific details they mentioned
- Keep it concise (3-4 paragraphs)
- End with a strong call to action`;

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

            // Check if response contains letter content
            if (data.response.includes('Dear') || data.response.includes('Hiring Manager') || data.response.includes('Sincerely')) {
                setGeneratedLetter(data.response);
            }

        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I apologize, but I'm having trouble processing your request. Please try again with more details about the position."
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

    const copyLetter = () => {
        navigator.clipboard.writeText(generatedLetter);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const startOver = () => {
        setMessages([{
            role: 'assistant',
            content: "Hi! I'm your AI Cover Letter Assistant. Tell me about the job you're applying for and your relevant experience, and I'll help you craft a compelling cover letter. What position are you interested in?"
        }]);
        setGeneratedLetter('');
    };

    return (
        <SubscriptionWall>
            <div className="coverletter-chat-page">
                <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />
                <Header onMenuClick={() => setSideMenuOpen(true)} />

                <div className="coverletter-container">
                    <div className="coverletter-hero">
                        <div className="hero-badge coverletter-badge">
                            <Mail className="w-5 h-5" />
                            <span>ChatGPT Cover Letter</span>
                        </div>
                        <h1>Write Your Cover Letter with <span className="text-gradient-cover">AI Assistance</span></h1>
                        <p>Have a conversation with AI to craft the perfect cover letter for your dream job</p>
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
                                            <span>Writing...</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="chat-input-area">
                                <textarea
                                    placeholder="Tell me about the job and why you're a great fit..."
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

                        {generatedLetter && (
                            <Card className="letter-preview-card">
                                <div className="preview-header">
                                    <h3><FileText className="w-5 h-5" /> Generated Cover Letter</h3>
                                    <Button variant="outline" size="sm" onClick={copyLetter}>
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        {copied ? 'Copied!' : 'Copy'}
                                    </Button>
                                </div>
                                <div className="preview-content">
                                    <pre>{generatedLetter}</pre>
                                </div>
                                <Button className="download-btn">
                                    <Download className="w-4 h-4" />
                                    Download as DOCX
                                </Button>
                            </Card>
                        )}
                    </div>

                    {/* Sample Prompts */}
                    <div className="prompts-section">
                        <h3>Try These Prompts</h3>
                        <div className="prompts-grid">
                            <button
                                className="prompt-chip"
                                onClick={() => setInput("I'm applying for a Software Engineer position at Google. I have 3 years of experience with Python and machine learning.")}
                            >
                                "I'm applying for Software Engineer at Google..."
                            </button>
                            <button
                                className="prompt-chip"
                                onClick={() => setInput("Help me write a cover letter for a Product Manager role at a startup. I have MBA and 5 years of product experience.")}
                            >
                                "Product Manager at a startup..."
                            </button>
                            <button
                                className="prompt-chip"
                                onClick={() => setInput("I'm a recent graduate applying for my first Data Analyst job. I studied statistics and know SQL and Python.")}
                            >
                                "Recent graduate for Data Analyst..."
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </SubscriptionWall>
    );
};

export default ChatGPTCoverLetter;
