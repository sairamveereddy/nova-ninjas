import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Loader2, CheckCircle, AlertCircle, Mic, Square, Volume2 } from 'lucide-react';
import { API_URL } from '../config/api';
import './InterviewRoom.css';

const InterviewRoom = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();

    const [status, setStatus] = useState('loading');
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [answer, setAnswer] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [totalQuestions] = useState(5);

    // Audio recording states
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    useEffect(() => {
        startInterview();
    }, [sessionId]);

    const startInterview = async () => {
        try {
            const response = await fetch(`${API_URL}/api/interview/start/${sessionId}`, {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error('Failed to start interview');
            }

            const data = await response.json();
            setCurrentQuestion(data);
            setQuestionNumber(1);
            setStatus('active');
        } catch (err) {
            console.error('Start interview error:', err);
            setError('Failed to start interview. Please try again.');
            setStatus('error');
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

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await transcribeAudio(audioBlob);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error('Microphone access error:', err);
            alert('Unable to access microphone. Please check your permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsTranscribing(true);
        }
    };

    const transcribeAudio = async (audioBlob) => {
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const response = await fetch(`${API_URL}/api/interview/transcribe`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Transcription failed');
            }

            const data = await response.json();
            setAnswer(data.text);
        } catch (err) {
            console.error('Transcription error:', err);
            alert('Failed to transcribe audio. Please try recording again.');
        } finally {
            setIsTranscribing(false);
        }
    };

    const handleSubmitAnswer = async () => {
        if (!answer.trim()) {
            alert('Please record your answer before continuing.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_URL}/api/interview/answer/${sessionId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ answerText: answer }),
            });

            if (!response.ok) {
                throw new Error('Failed to submit answer');
            }

            const data = await response.json();

            if (data.status === 'completed') {
                await finalizeInterview();
            } else {
                setCurrentQuestion(data);
                setQuestionNumber(prev => prev + 1);
                setAnswer('');
            }
        } catch (err) {
            console.error('Submit answer error:', err);
            setError('Failed to submit answer. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const finalizeInterview = async () => {
        setStatus('loading');
        try {
            const response = await fetch(`${API_URL}/api/interview/finalize/${sessionId}`, {
                method: 'POST',
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

                {/* Voice Recording Card */}
                <Card className="answer-card">
                    <CardContent className="p-6">
                        <label className="answer-label">
                            <Volume2 className="w-4 h-4 inline mr-2" />
                            Voice Answer
                        </label>

                        {/* Recording Controls */}
                        <div className="recording-controls">
                            {!isRecording && !answer && (
                                <Button
                                    onClick={startRecording}
                                    className="record-button"
                                    disabled={isTranscribing}
                                >
                                    <Mic className="w-5 h-5 mr-2" />
                                    Start Recording
                                </Button>
                            )}

                            {isRecording && (
                                <Button
                                    onClick={stopRecording}
                                    className="stop-button"
                                >
                                    <Square className="w-5 h-5 mr-2" />
                                    Stop Recording
                                </Button>
                            )}

                            {isTranscribing && (
                                <div className="transcribing-state">
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                    Transcribing your answer...
                                </div>
                            )}
                        </div>

                        {/* Transcript Display (Read-only) */}
                        {answer && (
                            <div className="transcript-container">
                                <div className="transcript-label">Your Transcript (Read-only)</div>
                                <div className="transcript-text">{answer}</div>
                                {!isSubmitting && (
                                    <Button
                                        onClick={() => setAnswer('')}
                                        variant="outline"
                                        className="re-record-button"
                                    >
                                        Re-record Answer
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* Submit Button */}
                        {answer && (
                            <div className="answer-actions">
                                <Button
                                    onClick={handleSubmitAnswer}
                                    disabled={isSubmitting}
                                    className="btn-primary"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        'Submit Answer'
                                    )}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default InterviewRoom;
