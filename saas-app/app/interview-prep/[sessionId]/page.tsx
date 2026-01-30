'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Mic, MicOff, Send, Loader2, Play, CheckCircle, AlertCircle, User, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function InterviewRoom() {
    const { sessionId } = useParams();
    const router = useRouter();

    const [status, setStatus] = useState<'loading' | 'active' | 'completed' | 'error'>('loading');
    const [currentQuestion, setCurrentQuestion] = useState<string>('');
    const [transcript, setTranscript] = useState<{ role: 'ai' | 'user'; text: string }[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [questionCount, setQuestionCount] = useState(1);
    const [targetQuestions, setTargetQuestions] = useState(10);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [useWebSpeech, setUseWebSpeech] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            setVoices(availableVoices);
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }, []);

    // Initial load: start interview
    useEffect(() => {
        const startInterview = async () => {
            try {
                const res = await fetch('/api/interview/start', {
                    method: 'POST',
                    body: JSON.stringify({ sessionId }),
                });
                const data = await res.json();
                if (data.success) {
                    setCurrentQuestion(data.question);
                    setTranscript([{ role: 'ai', text: data.question }]);
                    setStatus('active');
                    playTTS(data.question);
                } else {
                    setStatus('error');
                }
            } catch (err) {
                setStatus('error');
            }
        };
        startInterview();
    }, [sessionId]);

    const playTTS = async (text: string) => {
        if (useWebSpeech) {
            const utterance = new SpeechSynthesisUtterance(text);
            // Try to find a good English voice
            const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha')) || voices[0];
            if (preferredVoice) utterance.voice = preferredVoice;
            window.speechSynthesis.speak(utterance);
            return;
        }

        try {
            const res = await fetch('/api/interview/tts', {
                method: 'POST',
                body: JSON.stringify({ text }),
            });
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            if (audioRef.current) {
                audioRef.current.src = url;
                audioRef.current.play();
            }
        } catch (err) {
            console.error('TTS error:', err);
            // Fallback to browser speech if API fails
            const utterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(utterance);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                submitAnswer(audioBlob);
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            alert('Microphone access denied or not available.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            // Stop all tracks in the stream
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const submitAnswer = async (audioBlob: Blob) => {
        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append('sessionId', sessionId as string);
            formData.append('audio', audioBlob, 'answer.webm');

            const res = await fetch('/api/interview/answer', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (data.success) {
                setTranscript(prev => [
                    ...prev,
                    { role: 'user' as const, text: data.answerTranscript },
                    ...(data.status === 'active' ? [{ role: 'ai' as const, text: data.question }] : [])
                ]);

                if (data.status === 'active') {
                    setCurrentQuestion(data.question);
                    setQuestionCount(prev => prev + 1);
                    playTTS(data.question);
                } else {
                    handleFinalize();
                }
            }
        } catch (err) {
            console.error('Submit answer error:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFinalize = async () => {
        setStatus('loading');
        try {
            const res = await fetch('/api/interview/finalize', {
                method: 'POST',
                body: JSON.stringify({ sessionId }),
            });
            const data = await res.json();
            if (data.success) {
                router.push(`/interview-prep/${sessionId}/report`);
            }
        } catch (err) {
            setStatus('error');
        }
    };

    if (status === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <p className="text-slate-600 font-medium">Analyzing previous turn...</p>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
                <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col">
            <audio ref={audioRef} className="hidden" />

            {/* Header */}
            <header className="p-6 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-semibold text-lg">Live Interview</span>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Zero-Cost Voice</span>
                        <button
                            onClick={() => setUseWebSpeech(!useWebSpeech)}
                            className={`w-10 h-5 rounded-full transition-colors relative ${useWebSpeech ? 'bg-green-500' : 'bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${useWebSpeech ? 'left-6' : 'left-1'}`} />
                        </button>
                    </div>
                    <div className="bg-white/10 px-4 py-2 rounded-full text-sm font-medium">
                        Question {questionCount} of {targetQuestions}
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
                {/* Left: Avatar area */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
                    <div className={`w-64 h-64 rounded-full border-4 ${isRecording ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)]' : 'border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.3)]'} transition-all duration-500 flex items-center justify-center bg-slate-800 overflow-hidden`}>
                        {/* Replace with a premium ninja/recruiter image */}
                        <User size={120} className="text-slate-600" />

                        {/* Pulsing rings when speaking or recording */}
                        {isRecording && (
                            <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-25" />
                        )}
                    </div>

                    <div className="mt-12 text-center max-w-2xl px-4">
                        <h2 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300">
                            Interviewer
                        </h2>
                        <p className="text-xl text-slate-300 leading-relaxed italic">
                            "{currentQuestion}"
                        </p>
                    </div>
                </div>

                {/* Right: Transcript */}
                <div className="w-full lg:w-96 bg-slate-800/50 border-l border-white/10 flex flex-col">
                    <div className="p-4 border-b border-white/10 flex items-center gap-2 text-slate-400 text-sm font-medium">
                        <MessageSquare size={16} />
                        LIVE TRANSCRIPT
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {transcript.map((line, idx) => (
                            <div key={idx} className={`flex gap-3 ${line.role === 'user' ? 'flex-row-reverse text-right' : ''}`}>
                                <div className={`flex-1 ${line.role === 'user' ? 'bg-blue-600/20 text-blue-100' : 'bg-slate-700/50 text-slate-200'} p-3 rounded-2xl text-sm leading-relaxed`}>
                                    <span className="block text-[10px] uppercase font-bold tracking-widest opacity-50 mb-1">
                                        {line.role === 'ai' ? 'Interviewer' : 'You'}
                                    </span>
                                    {line.text}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Footer controls */}
            <footer className="p-8 border-t border-white/10 bg-slate-900">
                <div className="max-w-md mx-auto flex items-center gap-6">
                    {!isRecording ? (
                        <Button
                            className={`flex-1 h-20 rounded-full bg-blue-600 hover:bg-blue-700 transition-all text-xl font-bold flex items-center justify-center gap-4 ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'shadow-xl shadow-blue-500/20'}`}
                            onClick={startRecording}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Mic size={28} />
                                    Click to Speak
                                </>
                            )}
                        </Button>
                    ) : (
                        <Button
                            className="flex-1 h-20 rounded-full bg-red-600 hover:bg-red-700 animate-pulse text-xl font-bold flex items-center justify-center gap-4 shadow-xl shadow-red-500/20 transition-all"
                            onClick={stopRecording}
                        >
                            <MicOff size={28} />
                            Stop Recording
                        </Button>
                    )}

                    <Button
                        variant="outline"
                        className="h-20 w-20 rounded-full border-white/20 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                        onClick={handleFinalize}
                    >
                        End
                    </Button>
                </div>
            </footer>
        </div>
    );
}
