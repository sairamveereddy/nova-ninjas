import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Loader2, Download, Home, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { API_URL } from '../config/api';
import './InterviewReport.css';

const InterviewReport = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();

    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchReport();
    }, [sessionId]);

    const fetchReport = async () => {
        try {
            const response = await fetch(`${API_URL}/api/interview/report/${sessionId}`);

            if (!response.ok) {
                throw new Error('Failed to fetch report');
            }

            const data = await response.json();
            setReport(data);
        } catch (err) {
            console.error('Fetch report error:', err);
            setError('Failed to load report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="report-container">
                <div className="loading-state">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                    <p className="mt-4 text-lg">Loading your report...</p>
                </div>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="report-container">
                <Card className="error-card">
                    <CardContent className="p-8 text-center">
                        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Error</h2>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <Button onClick={() => navigate('/interview-prep')}>
                            Back to Interview Prep
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const scores = report.scores || {};
    const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length || 0;

    return (
        <div className="report-container">
            <div className="report-content">
                {/* Header */}
                <div className="report-header">
                    <h1 className="report-title">Interview Evaluation Report</h1>
                    <div className="report-actions">
                        <Button variant="outline" onClick={() => navigate('/interview-prep')}>
                            <Home className="w-4 h-4 mr-2" />
                            Dashboard
                        </Button>
                        <Button className="btn-primary" onClick={() => navigate('/interview-prep')}>
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Answer more questions and get better
                        </Button>
                    </div>
                </div>

                {/* Role Fit Score */}
                <Card className="score-card">
                    <CardContent className="p-6">
                        <div className="score-display">
                            <div className="score-circle">
                                <div className="score-value">{report.roleFitScore}</div>
                                <div className="score-label">Role Fit Score</div>
                            </div>
                            <div className="score-breakdown">
                                <h3 className="score-breakdown-title">Performance Breakdown</h3>
                                <div className="score-items">
                                    {Object.entries(scores).map(([key, value]) => (
                                        <div key={key} className="score-item">
                                            <span className="score-item-label">{key}</span>
                                            <div className="score-item-bar">
                                                <div
                                                    className="score-item-fill"
                                                    style={{ width: `${(value / 10) * 100}%` }}
                                                />
                                            </div>
                                            <span className="score-item-value">{value}/10</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary */}
                <Card className="section-card">
                    <CardContent className="p-6">
                        <h2 className="section-title">
                            <TrendingUp className="w-5 h-5 mr-2" />
                            Overall Summary
                        </h2>
                        <p className="section-text">{report.summary}</p>
                    </CardContent>
                </Card>

                {/* Strengths */}
                <Card className="section-card">
                    <CardContent className="p-6">
                        <h2 className="section-title">
                            <CheckCircle2 className="w-5 h-5 mr-2 text-green-500" />
                            Key Strengths
                        </h2>
                        <ul className="strength-list">
                            {report.strengths?.map((strength, idx) => (
                                <li key={idx} className="strength-item">{strength}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                {/* Gaps */}
                {report.gaps && report.gaps.length > 0 && (
                    <Card className="section-card">
                        <CardContent className="p-6">
                            <h2 className="section-title">
                                <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
                                Areas for Improvement
                            </h2>
                            <ul className="gap-list">
                                {report.gaps.map((gap, idx) => (
                                    <li key={idx} className="gap-item">{gap}</li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}

                {/* Actionable Fixes */}
                <Card className="section-card">
                    <CardContent className="p-6">
                        <h2 className="section-title">Top 10 Actionable Fixes</h2>
                        <ol className="fix-list">
                            {report.actionableFixes?.map((fix, idx) => (
                                <li key={idx} className="fix-item">{fix}</li>
                            ))}
                        </ol>
                    </CardContent>
                </Card>

                {/* Rewritten Answers */}
                {report.rewrittenAnswers && report.rewrittenAnswers.length > 0 && (
                    <Card className="section-card">
                        <CardContent className="p-6">
                            <h2 className="section-title">Answer Improvements</h2>
                            {report.rewrittenAnswers.map((item, idx) => (
                                <div key={idx} className="rewrite-block">
                                    <div className="rewrite-section">
                                        <h4 className="rewrite-label">Your Answer:</h4>
                                        <p className="rewrite-text original">{item.original}</p>
                                    </div>
                                    <div className="rewrite-section">
                                        <h4 className="rewrite-label">Improved Version:</h4>
                                        <p className="rewrite-text improved">{item.improved}</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Repetition Patterns */}
                {report.repetition && (
                    <Card className="section-card">
                        <CardContent className="p-6">
                            <h2 className="section-title">Communication Patterns</h2>
                            <p className="section-text">{report.repetition}</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default InterviewReport;
