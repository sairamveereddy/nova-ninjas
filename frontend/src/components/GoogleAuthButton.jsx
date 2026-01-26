import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';

const GoogleAuthButton = ({ mode = 'login' }) => {
    const navigate = useNavigate();
    const { googleLogin } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleSuccess = async (credentialResponse) => {
        setIsLoading(true);
        try {
            // Send Google credential to backend
            const response = await fetch(`${API_URL}/api/auth/google`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    credential: credentialResponse.credential,
                    mode: mode // 'login' or 'signup'
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Set auth data and context state immediately
                googleLogin(data.user, data.token);

                // Navigate to home page
                navigate('/');
            } else {
                alert(data.detail || 'Google authentication failed');
            }
        } catch (error) {
            console.error('Google auth error:', error);
            const errorMsg = error.message || 'Failed to connect to authentication server.';
            alert(`Google Auth Error: ${errorMsg}. Please ensure the backend is running.`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleError = () => {
        console.error('Google Sign-In failed');
        alert('Google Sign-In was unsuccessful. Please try again.');
    };

    return (
        <div style={{ width: '100%', opacity: isLoading ? 0.7 : 1, pointerEvents: isLoading ? 'none' : 'auto' }}>
            <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={false}
                text={mode === 'signup' ? 'signup_with' : 'signin_with'}
                shape="rectangular"
                size="large"
                width="100%"
                logo_alignment="left"
            />
            {isLoading && (
                <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '14px', color: '#666' }}>
                    Signing in...
                </div>
            )}
        </div>
    );
};

export default GoogleAuthButton;
