import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Bot, Send, User, Sparkles, X } from 'lucide-react';
import './AINinjaChat.css';

const AINinjaChat = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState([
        {
            id: 1,
            role: 'assistant',
            content: "Hi! I'm AI Ninja, your career copilot. I can help you tailor your resume, write cover letters, or answer questions about these jobs. How can I help you today?"
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = { id: Date.now(), role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        // Simulate AI response for now
        setTimeout(() => {
            const aiResponse = {
                id: Date.now() + 1,
                role: 'assistant',
                content: "I'm currently in demo mode, but fully functional chat is coming soon! Any specific job you'd like me to analyze?"
            };
            setMessages(prev => [...prev, aiResponse]);
            setIsLoading(false);
        }, 1000);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) return null; // Or handle visibility via CSS class if preferred

    return (
        <div className="ai-ninja-chat-sidebar">
            <div className="chat-header">
                <div className="flex items-center gap-2">
                    <div className="chat-avatar-container">
                        {/* Use your branding here */}
                        <img src="/ninjasface.png" alt="AI Ninja" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">AI Ninjas</h3>
                        <p className="text-xs text-green-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                            Online
                        </p>
                    </div>
                </div>
                {onClose && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </div>

            <div className="chat-messages" ref={scrollRef}>
                {messages.map((msg) => (
                    <div key={msg.id} className={`chat-message ${msg.role}`}>
                        {msg.role === 'assistant' && (
                            <div className="message-avatar">
                                <img src="/ninjasface.png" alt="AI" className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div className="message-bubble">
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="chat-message assistant">
                        <div className="message-avatar">
                            <img src="/ninjasface.png" alt="AI" className="w-full h-full object-cover" />
                        </div>
                        <div className="message-bubble typing-indicator">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                )}
            </div>

            <div className="chat-input-area">
                <div className="chat-input-wrapper">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Ask anything..."
                        className="chat-input"
                    />
                    <Button
                        size="icon"
                        className="chat-send-btn"
                        onClick={handleSend}
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
