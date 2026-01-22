import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';

const GoogleAuthButton = ({ mode = 'login' }) => {
    const navigate = useNavigate();
    const { refreshUser } = useAuth();

    const handleGoogleSuccess = async (credentialResponse) => {
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
                // Set auth data directly
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('user_data', JSON.stringify(data.user));

                // Refresh user state in AuthContext
                await refreshUser();

                // Navigate to home page
                navigate('/');
            } else {
                alert(data.detail || 'Google authentication failed');
            }
        } catch (error) {
            console.error('Google auth error:', error);
            alert('Failed to authenticate with Google. Please try again.');
        }
    };

    const handleGoogleError = () => {
        console.error('Google Sign-In failed');
        alert('Google Sign-In was unsuccessful. Please try again.');
    };

    return (
        <div style={{ width: '100%' }}>
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
        </div>
    );
};

export default GoogleAuthButton;
