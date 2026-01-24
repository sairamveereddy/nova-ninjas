import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from './ui/card';
import { Eye, EyeOff, Check, X, Loader2, Key, Trash2 } from 'lucide-react';
import Header from './Header';
import SideMenu from './SideMenu';
import './BYOKSettings.css';

const BYOKSettings = () => {
    const { user } = useAuth();
    const [sideMenuOpen, setSideMenuOpen] = useState(false);
    const [provider, setProvider] = useState('openai');
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [testing, setTesting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [saveResult, setSaveResult] = useState(null);
    const [currentConfig, setCurrentConfig] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBYOKStatus();
    }, []);

    const fetchBYOKStatus = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/byok/status`, {
                headers: { 'token': token }
            });

            if (response.ok) {
                const data = await response.json();
                setCurrentConfig(data);
                if (data.configured) {
                    setProvider(data.provider);
                }
            }
        } catch (error) {
            console.error('Error fetching BYOK status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTestKey = async () => {
        if (!apiKey.trim()) {
            setTestResult({ success: false, message: 'Please enter an API key' });
            return;
        }

        setTesting(true);
        setTestResult(null);

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/byok/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': token
                },
                body: JSON.stringify({ provider, apiKey })
            });

            const data = await response.json();

            if (response.ok) {
                setTestResult({ success: true, message: data.message });
            } else {
                setTestResult({ success: false, message: data.detail || 'Test failed' });
            }
        } catch (error) {
            setTestResult({ success: false, message: 'Network error. Please try again.' });
        } finally {
            setTesting(false);
        }
    };

    const handleSaveKey = async () => {
        if (!apiKey.trim()) {
            setSaveResult({ success: false, message: 'Please enter an API key' });
            return;
        }

        setSaving(true);
        setSaveResult(null);

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/byok/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': token
                },
                body: JSON.stringify({ provider, apiKey })
            });

            const data = await response.json();

            if (response.ok) {
                setSaveResult({ success: true, message: data.message });
                setApiKey(''); // Clear the key from state
                await fetchBYOKStatus(); // Refresh status
            } else {
                setSaveResult({ success: false, message: data.detail || 'Save failed' });
            }
        } catch (error) {
            setSaveResult({ success: false, message: 'Network error. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveKey = async () => {
        if (!window.confirm('Are you sure you want to remove your API key? This will disable BYOK mode.')) {
            return;
        }

        setRemoving(true);

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/byok/remove`, {
                method: 'DELETE',
                headers: { 'token': token }
            });

            const data = await response.json();

            if (response.ok) {
                setSaveResult({ success: true, message: data.message });
                setApiKey('');
                await fetchBYOKStatus();
            } else {
                setSaveResult({ success: false, message: data.detail || 'Remove failed' });
            }
        } catch (error) {
            setSaveResult({ success: false, message: 'Network error. Please try again.' });
        } finally {
            setRemoving(false);
        }
    };

    if (loading) {
        return (
            <div className="byok-settings-container">
                <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50 byok-page">
            <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />
            <Header onMenuClick={() => setSideMenuOpen(true)} />

            <div className="byok-settings-container pt-24 pb-20">
                <Card className="byok-card glass-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-2xl">
                            <Key className="w-8 h-8 text-blue-600" />
                            Bring Your Own API Key (BYOK)
                        </CardTitle>
                        <CardDescription className="text-gray-600 mt-2">
                            Use your own OpenAI, Google, or Anthropic API key for free unlimited access.
                            Your keys are encrypted with AES-256-GCM and never stored in plaintext.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Current Status */}
                        {currentConfig?.configured && (
                            <div className="byok-status-card">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-green-700">✓ BYOK Configured</p>
                                        <p className="text-sm text-gray-600">
                                            Provider: <span className="font-medium capitalize">{currentConfig.provider}</span>
                                        </p>
                                    </div>
                                    <Button
                                        onClick={handleRemoveKey}
                                        disabled={removing}
                                        variant="destructive"
                                        size="sm"
                                        className="flex items-center gap-2"
                                    >
                                        {removing ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                        Remove Key
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Provider Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="provider">Provider</Label>
                            <select
                                id="provider"
                                value={provider}
                                onChange={(e) => setProvider(e.target.value)}
                                className="byok-select"
                                disabled={currentConfig?.configured}
                            >
                                <option value="openai">OpenAI</option>
                                <option value="google">Google AI</option>
                                <option value="anthropic">Anthropic</option>
                            </select>
                            <p className="text-xs text-gray-500">
                                {provider === 'openai' && 'Get your API key from platform.openai.com'}
                                {provider === 'google' && 'Get your API key from ai.google.dev'}
                                {provider === 'anthropic' && 'Get your API key from console.anthropic.com'}
                            </p>
                        </div>

                        {/* API Key Input */}
                        <div className="space-y-2">
                            <Label htmlFor="apiKey">API Key</Label>
                            <div className="relative">
                                <Input
                                    id="apiKey"
                                    type={showKey ? 'text' : 'password'}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder={`Enter your ${provider} API key`}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500">
                                Your API key is encrypted with AES-256-GCM before storage. We never see your plaintext key.
                            </p>
                        </div>

                        {/* Test Result */}
                        {testResult && (
                            <div className={`byok-message ${testResult.success ? 'success' : 'error'}`}>
                                {testResult.success ? (
                                    <Check className="w-5 h-5 text-green-600" />
                                ) : (
                                    <X className="w-5 h-5 text-red-600" />
                                )}
                                <span>{testResult.message}</span>
                            </div>
                        )}

                        {/* Save Result */}
                        {saveResult && (
                            <div className={`byok-message ${saveResult.success ? 'success' : 'error'}`}>
                                {saveResult.success ? (
                                    <Check className="w-5 h-5 text-green-600" />
                                ) : (
                                    <X className="w-5 h-5 text-red-600" />
                                )}
                                <span>{saveResult.message}</span>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <Button
                                onClick={handleTestKey}
                                disabled={testing || !apiKey.trim()}
                                variant="outline"
                                className="flex-1"
                            >
                                {testing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Testing...
                                    </>
                                ) : (
                                    'Test Key'
                                )}
                            </Button>

                            <Button
                                onClick={handleSaveKey}
                                disabled={saving || !apiKey.trim()}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Key'
                                )}
                            </Button>
                        </div>

                        {/* Info Box */}
                        <div className="byok-info-box">
                            <h4 className="font-semibold mb-2">How BYOK Works:</h4>
                            <ul className="space-y-1 text-sm">
                                <li>✓ Your API key is encrypted with AES-256-GCM</li>
                                <li>✓ We test the key before saving to ensure it works</li>
                                <li>✓ Your usage is billed directly by your provider</li>
                                <li>✓ You can remove your key anytime</li>
                                <li>✓ Keys are never logged or shared</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default BYOKSettings;
