import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Bot, Send, User, Sparkles, X, ArrowRight, ChevronRight } from 'lucide-react';
import { useAINinja } from '../contexts/AINinjaContext';
import './AINinjaChat.css';

const AINinjaChat = ({ isOpen: propIsOpen, onClose }) => {
    const { isChatOpen, setIsChatOpen, jobContext, initialMessage, setInitialMessage } = useAINinja();

    // Controlled by either prop (for fixed layouts) or context (for overlays)
    // In DashboardLayout, isOpen is passed as true, so we might need to respect that.
    // However, for the overlay behavior on mobile or specific triggers, we use context.
    const showChat = propIsOpen || isChatOpen;

    const [messages, setMessages] = useState([]);

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);

    // Initialize chat when jobContext changes
    useEffect(() => {
        if (jobContext) {
            setMessages([
                {
                    id: 'welcome',
                    role: 'assistant',
                    content: `I see that you're asking about the **${jobContext.title}** role at **${jobContext.company}**. What would you like to know?`,
                    isWelcome: true
                }
            ]);
            if (initialMessage) {
                handleSend(initialMessage);
                setInitialMessage(null); // Clear it so it doesn't send again
            }
        } else if (messages.length === 0) {
            setMessages([
                {
                    id: 'default-welcome',
                    role: 'assistant',
                    content: "Hi! I'm AI Ninja, your career copilot. I can help you tailor your resume, write cover letters, or answer questions about jobs. How can I help you today?"
                }
            ]);
        }
    }, [jobContext, initialMessage]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (text = input) => {
        if (!text.trim()) return;

        const userMessage = { id: Date.now(), role: 'user', content: text };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        // Simulate AI response
        setTimeout(() => {
            let responseContent = "I'm analyzing that for you... (Demo Mode)";
            if (text.includes("fit")) responseContent = `Based on your resume, you're a **${jobContext?.matchScore || 85}% match** for this role! Your skills in React and Node.js align perfectly.`;
            if (text.includes("tips")) responseContent = "Here are 3 tips: 1. Highlight your experience with scalable systems. 2. Mention your leadership in the previous role. 3. Quantify your achievements.";

            const aiResponse = {
                id: Date.now() + 1,
                role: 'assistant',
                content: responseContent
            };
            setMessages(prev => [...prev, aiResponse]);
            setIsLoading(false);
        }, 1200);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const suggestedQuestions = [
        "Tell me why this job is a good fit for me.",
        "Give me some resume tips if I want to apply.",
        "Generate custom resume tailored to this job.",
        "Show me Connections for potential referral.",
        "Write a cover letter for this job."
    ];

    if (!showChat && !propIsOpen) return null;

    return (
        <div className={`ai-ninja-chat-sidebar ${!propIsOpen ? 'fixed-overlay' : ''}`}>
            <div className="chat-header">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm">
                            <img src="/ninjasface.png" alt="AI Ninja" className="w-full h-full object-cover" />
                        </div>
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-sm">AI Ninja</h3>
                        <p className="text-[10px] text-gray-500 font-medium">Your Career Copilot</p>
                    </div>
                </div>
                {onClose && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {/* Match Score Display (if job active) */}
            {jobContext && (
                <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-600">Match Score</span>
                        <div className="flex items-center gap-2">
                            <div className="relative w-8 h-8 flex items-center justify-center">
                                {/* Simple ring visualization */}
                                <svg className="transform -rotate-90 w-full h-full">
                                    <circle cx="16" cy="16" r="14" stroke="#e5e7eb" strokeWidth="3" fill="none" />
                                    <circle cx="16" cy="16" r="14" stroke="#10b981" strokeWidth="3" fill="none"
                                        strokeDasharray={2 * Math.PI * 14}
                                        strokeDashoffset={(2 * Math.PI * 14) * (1 - ((jobContext.matchScore || 0) / 100))}
                                        strokeLinecap="round" />
                                </svg>
                                <span className="absolute text-[10px] font-bold text-gray-900">{jobContext.matchScore || '?'}</span>
                            </div>
                            <span className="text-xs font-bold text-emerald-600">{jobContext.matchScore >= 80 ? 'Strong Match' : 'Good Match'}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="chat-messages p-4 space-y-4" ref={scrollRef}>
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-gray-100 bg-white">
                                <img src="/ninjasface.png" alt="AI" className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div className={`max-w-[85%] space-y-2`}>
                            <div className={`p-3 text-sm leading-relaxed rounded-2xl shadow-sm
                                ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-sm'
                                    : 'bg-white border border-gray-100 text-gray-700 rounded-tl-sm'
                                }`}>
                                {(() => {
                                    const content = typeof msg.content === 'string' ? msg.content : String(msg.content || '');
                                    return <span dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />;
                                })()}
                            </div>

                            {/* Suggested Chips (Only on Welcome Message) */}
                            {msg.isWelcome && jobContext && (
                                <div className="flex flex-col gap-2 mt-2">
                                    {suggestedQuestions.map((q, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSend(q)}
                                            className="text-left text-xs bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 py-2 px-3 rounded-xl transition-colors flex items-center justify-between group"
                                        >
                                            {q}
                                            <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-blue-500" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-gray-100 bg-white">
                            <img src="/ninjasface.png" alt="AI" className="w-full h-full object-cover" />
                        </div>
                        <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-white">
                <div className="relative">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Ask anything..."
                        className="pr-10 rounded-xl border-gray-200 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Button
                        size="icon"
                        className="absolute right-1 top-1 h-8 w-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isLoading}
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
                <p className="text-[10px] text-center text-gray-400 mt-2">
                    AI can make mistakes. Check important info.
                </p>
            </div>
        </div>
    );
};

export default AINinjaChat;
