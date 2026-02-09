import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
    X,
    Send,
    Bot,
    Sparkles,
    FileText,
    PenTool,
    Users,
    MessageSquare,
    Loader2
} from 'lucide-react';
import { API_URL } from '../config/api';

const QuickActionChip = ({ icon: Icon, label, onClick }) => (
    <button
        onClick={onClick}
        className="flex items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold transition-colors border border-emerald-100 whitespace-nowrap"
    >
        <Icon className="w-3.5 h-3.5" />
        {label}
    </button>
);

const NovaChatPanel = ({ isOpen, onClose, jobContext }) => {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);

    // Initial greeting when job context changes
    useEffect(() => {
        if (jobContext && isOpen) {
            setMessages([
                {
                    role: 'assistant',
                    content: `I see you're interested in the **${jobContext.title}** role at **${jobContext.company}**. \n\nWhat would you like to know?`
                }
            ]);
        }
    }, [jobContext, isOpen]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (text) => {
        if (!text.trim()) return;

        // Add user message
        const userMsg = { role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token && { 'token': token })
            };

            const response = await fetch(`${API_URL}/api/nova/chat`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    message: text,
                    jobContext: jobContext,
                    history: messages
                })
            });

            const data = await response.json();

            if (data.reply) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
            } else {
                throw new Error('No reply from Nova');
            }

        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: "I'm having a bit of trouble connecting right now. Please try again!" }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(inputValue);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl z-[9999] flex flex-col transform transition-transform duration-300 ease-in-out border-l border-gray-200">
            {/* Header - Green Style from Orion */}
            <div className="p-4 flex items-center justify-between" style={{ backgroundColor: '#10b981' }}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                        <img src="/ninjasface.png" alt="Nova" className="w-8 h-8 object-contain" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg">Nova Copilot</h3>
                        <p className="text-xs text-emerald-50 opacity-90 font-medium">Your AI Job Assistant</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 pr-2">
                    <Button variant="secondary" size="sm" className="bg-white text-emerald-700 hover:bg-emerald-50 border-none text-xs font-bold rounded-full px-3 h-7">
                        Quick Guide
                    </Button>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/20 text-white transition-colors focus:outline-none flex items-center justify-center"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Suggestions (Chips) - Positioned at top contextually like Orion */}
            <div className="p-3 bg-gray-50 border-b border-gray-200 overflow-x-auto no-scrollbar">
                <div className="flex flex-col gap-2">
                    <QuickActionChip
                        icon={Sparkles}
                        label="Tell me why this job is a good fit for me."
                        onClick={() => handleSendMessage("Tell me why this job is a good fit for me.")}
                    />
                    <QuickActionChip
                        icon={FileText}
                        label="Give me some resume tips if I want to apply."
                        onClick={() => handleSendMessage("Give me some resume tips if I want to apply.")}
                    />
                    <QuickActionChip
                        icon={PenTool}
                        label="Generate custom resume tailored to this job."
                        onClick={() => handleSendMessage("Generate custom resume tailored to this job.")}
                    />
                    <QuickActionChip
                        icon={Users}
                        label="Show me Connections for potential referral."
                        onClick={() => handleSendMessage("Show me Connections for potential referral.")}
                    />
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white" ref={scrollRef}>
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-2 flex-shrink-0 mt-1 overflow-hidden border border-gray-200">
                                <img src="/ninjasface.png" alt="Nova" className="w-6 h-6 object-contain" />
                            </div>
                        )}
                        <div className={`max-w-[85%] rounded-2xl p-3 shadow-none ${msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-gray-100 text-gray-800 rounded-tl-none'
                            }`}>
                            <div className="text-sm leading-relaxed whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{
                                    __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')
                                }}
                            />
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                            <Bot className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="bg-gray-100 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                            <span className="text-sm text-gray-500">Nova is thinking...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t">
                <div className="relative flex items-center">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask me anything..."
                        className="pr-12 py-6 rounded-2xl border-gray-200 focus:ring-emerald-500 focus:border-emerald-500 bg-white shadow-sm"
                    />
                    <Button
                        size="icon"
                        onClick={() => handleSendMessage(inputValue)}
                        className={`absolute right-1.5 h-9 w-9 rounded-xl transition-all ${inputValue.trim()
                            ? 'bg-black hover:bg-gray-800 text-white'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                        disabled={!inputValue.trim() || isLoading}
                    >
                        <Send className="w-4 h-4 ml-0.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default NovaChatPanel;
