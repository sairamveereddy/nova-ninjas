import React from 'react';
import './SearchPreview.css';
import { BRAND } from '../config/branding';

const SearchPreview = () => {
    return (
        <div className="search-preview-container">
            <div className="search-preview-card">
                <div className="search-preview-header">
                    <div className="search-preview-icon">
                        <img src={BRAND.logoPath} alt="jobNinjas Icon" />
                    </div>
                    <div className="search-preview-meta">
                        <span className="search-preview-title">jobNinjas</span>
                        <span className="search-preview-url">jobninjas.org</span>
                    </div>
                </div>

                <h3 className="search-preview-main-link">
                    jobNinjas.org - Human-Powered Job Applications
                </h3>

                <p className="search-preview-description">
                    jobNinjas.org - Human-powered job applications for serious job seekers. AI-powered resume optimization and personalized support.
                </p>

                <div className="search-preview-sitelinks">
                    <div className="sitelink-item">
                        <h4 className="sitelink-title">Login</h4>
                        <p className="sitelink-desc">Access your jobNinjas account and manage your applications.</p>
                    </div>
                    <div className="sitelink-item">
                        <h4 className="sitelink-title">Register</h4>
                        <p className="sitelink-desc">Create your free account today and start landing faster.</p>
                    </div>
                    <div className="sitelink-item">
                        <h4 className="sitelink-title">Our Platform</h4>
                        <p className="sitelink-desc">Discover our AI-driven tools for resume and career growth.</p>
                    </div>
                    <div className="sitelink-item">
                        <h4 className="sitelink-title">Services</h4>
                        <p className="sitelink-desc">Explore our human-powered services for job application success.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SearchPreview;
