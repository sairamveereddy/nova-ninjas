import React, { useState, useEffect } from 'react';
import { BRAND } from '../config/branding';
import './BrandLogo.css';

const BrandLogo = ({ className = "" }) => {
    const [suffixIndex, setSuffixIndex] = useState(0);
    const suffixes = ['show-org', 'show-ai', 'show-io'];

    useEffect(() => {
        const interval = setInterval(() => {
            setSuffixIndex((prev) => (prev + 1) % suffixes.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={`brand-logo-container ${className}`}>
            <span className="brand-name-static">jobNinjas</span>
            <div className="tld-roller-window">
                <div className={`tld-roller-track ${suffixes[suffixIndex]}`}>
                    <span className="tld-item">.org</span>
                    <span className="tld-item">.ai</span>
                    <span className="tld-item">.io</span>
                </div>
            </div>
        </div>
    );
};

export default BrandLogo;
