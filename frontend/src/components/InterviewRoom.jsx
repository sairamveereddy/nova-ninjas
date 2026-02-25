import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Loader2, CheckCircle, AlertCircle, Mic, Square, Edit2, Send } from 'lucide-react';
import { API_URL } from '../config/api';
import './InterviewRoom.css';

const InterviewRoom = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();

    const [status, setStatus] = useState('loading'); // loading, active, completed, error
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [answer, setAnswer] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(5);

    // Audio State
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    const mediaRecorderRef = React.useRef(null);
    const audioChunksRef = React.useRef([]);

    useEffect(() => {
        // Guard: if sessionId is invalid (e.g. the string "None" from a failed session creation), redirect back
        if (!sessionId || sessionId === 'None') {
            navigate('/interview-prep');
            return;
        }
        startInterview();
    }, [sessionId]);

    const startInterview = async () => {
        try {
            const response = await fetch(`${API_URL}/api/interview/start/${sessionId}`, {
                method: 'POST',
                headers: {
                    'token': localStorage.getItem('auth_token')
                }
            });

            if (!response.ok) {
                throw new Error('Failed to start interview');
            }

            const data = await response.json();
            setCurrentQuestion(data);
            setQuestionNumber(1);
            setStatus('active');

            // Try to get actual total questions if available (session details)
            fetchSessionDetails();
        } catch (err) {
            console.error('Start interview error:', err);
            setError('Failed to start interview. Please try again.');
            setStatus('error');
        }
    };

    const fetchSessionDetails = async () => {
        try {
            const response = await fetch(`${API_URL}/api/interview/session/${sessionId}`, {
                headers: {
                    'token': localStorage.getItem('auth_token')
                }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.targetQuestions) {
                    setTotalQuestions(data.targetQuestions);
                }
            }
        } catch (e) {
            console.error('Failed to fetch session details:', e);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = handleRecordingStop;
            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error('Recording error:', err);
            alert('Could not access microphone.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const handleRecordingStop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsTranscribing(true);

        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const response = await fetch(`${API_URL}/api/interview/transcribe`, {
                method: 'POST',
                headers: {
                    'token': localStorage.getItem('auth_token')
                },
                body: formData,
            });

            if (!response.ok) throw new Error('Transcription failed');

            const data = await response.json();
            setAnswer(data.text || '');
            setCanEdit(true); // Allow editing ONLY after transcription
        } catch (err) {
            console.error('Transcription error:', err);
            alert('Failed to convert speech to text. Please try again.');
        } finally {
            setIsTranscribing(false);
        }
    };

    const handleSubmitAnswer = async () => {
        if (!answer.trim()) {
            alert('Please provide an answer before continuing.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_URL}/api/interview/answer/${sessionId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': localStorage.getItem('auth_token')
                },
                body: JSON.stringify({ answerText: answer }),
            });

            if (!response.ok) {
                throw new Error('Failed to submit answer');
            }

            const data = await response.json();

            if (data.status === 'completed') {
                // Interview completed, finalize and get report
                await finalizeInterview();
            } else {
                // Got next question
                setCurrentQuestion(data);
                setQuestionNumber(prev => prev + 1);
                setAnswer('');
                setCanEdit(false); // Reset edit lock for next question
            }
        } catch (err) {
            console.error('Submit answer error:', err);
            setError(`Failed to submit answer: ${err.message}`);
            alert(`Error: ${err.message}. Please try again.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const finalizeInterview = async () => {
        setStatus('loading');
        try {
            const response = await fetch(`${API_URL}/api/interview/finalize/${sessionId}`, {
                method: 'POST',
                headers: {
                    'token': localStorage.getItem('auth_token')
                }
            });

            if (!response.ok) {
                throw new Error('Failed to finalize interview');
            }

            setStatus('completed');
        } catch (err) {
            console.error('Finalize error:', err);
            setError('Failed to generate report. Please try again.');
            setStatus('error');
        }
    };

    const viewReport = () => {
        navigate(`/interview-prep/${sessionId}/report`);
    };

    if (status === 'loading') {
        return (
            <div className="interview-room-container">
                <div className="loading-state">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                    <p className="mt-4 text-lg">Loading interview...</p>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="interview-room-container">
                <Card className="error-card">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Error</h2>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <Button onClick={() => navigate('/interview-prep')}>
                            Back to Setup
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (status === 'completed') {
        return (
            <div className="interview-room-container">
                <Card className="completion-card">
                    <CardContent className="p-8 text-center">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-3xl font-bold mb-2">Interview Complete!</h2>
                        <p className="text-gray-600 mb-6">
                            Great job! Your evaluation report is ready.
                        </p>
                        <Button onClick={viewReport} className="btn-primary">
                            View Report
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="interview-room-container">
            <div className="interview-room-content">
                {/* Progress Bar */}
                <div className="progress-section">
                    <div className="progress-text">
                        Question {questionNumber} of {totalQuestions}
                    </div>
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Question Card */}
                <Card className="question-card">
                    <CardContent className="p-8">
                        {currentQuestion?.intro && (
                            <p className="intro-text mb-4">{currentQuestion.intro}</p>
                        )}
                        <h2 className="question-text">{currentQuestion?.question}</h2>
                        {currentQuestion?.hint && (
                            <p className="hint-text mt-4">
                                <strong>Hint:</strong> {currentQuestion.hint}
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Recording Button - Centered between Question and Answer */}
                <div className="recording-button-container">
                    {!isRecording ? (
                        <div className="flex flex-col items-center gap-3">
                            <Button
                                onClick={startRecording}
                                disabled={isSubmitting || isTranscribing}
                                className="mic-button-large"
                            >
                                <Mic className="w-8 h-8" />
                            </Button>
                            <span className="text-gray-400 text-sm font-medium">
                                Click to record your answer
                            </span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <Button
                                onClick={stopRecording}
                                className="mic-button-large mic-button-recording"
                            >
                                <Square className="w-8 h-8" />
                            </Button>
                            <span className="text-red-500 font-medium animate-pulse">
                                Recording... Click to stop
                            </span>
                        </div>
                    )}
                    {isTranscribing && (
                        <div className="flex items-center justify-center gap-2 text-blue-400 text-sm mt-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Converting speech to text...
                        </div>
                    )}
                </div>

                {/* Answer Input */}
                <Card className="answer-card">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <label className="answer-label m-0">Your Answer</label>
                            {canEdit && (
                                <div className="flex items-center text-xs text-blue-400 font-medium">
                                    <Edit2 className="w-3 h-3 mr-1" />
                                    Mode: Edit Only
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <textarea
                                className={`answer-textarea ${!canEdit ? 'bg-gray-900/50 cursor-not-allowed' : ''}`}
                                rows={8}
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                placeholder={isRecording ? "Listening..." : isTranscribing ? "Converting speech to text..." : "Your transcribed answer will appear here..."}
                                disabled={isSubmitting || isTranscribing}
                                readOnly={!canEdit}
                            />

                            {!canEdit && !isRecording && !isTranscribing && !answer && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <p className="text-gray-500 text-sm">Please record your answer first.</p>
                                </div>
                            )}
                        </div>

                        <div className="answer-actions flex items-center justify-end mt-4">
                            <Button
                                onClick={handleSubmitAnswer}
                                disabled={isSubmitting || !answer.trim() || isRecording || isTranscribing}
                                className="btn-primary min-w-[140px]"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        Submit Answer
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default InterviewRoom;
