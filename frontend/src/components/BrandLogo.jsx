import React, { useState, useEffect } from 'react';
import { BRAND } from '../config/branding';
import './BrandLogo.css';

const BrandLogo = ({ className = "" }) => {
    const [isAi, setIsAi] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsAi((prev) => !prev);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={`brand-logo-container ${className}`}>
            <span className="brand-name-static">jobNinjas</span>
            <div className="tld-roller-window">
                <div className={`tld-roller-track ${isAi ? 'show-ai' : 'show-org'}`}>
                    <span className="tld-item">.org</span>
                    <span className="tld-item">.ai</span>
                </div>
            </div>
        </div>
    );
};

export default BrandLogo;
