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
                        <span className="search-preview-url">jobninjas.io</span>
                    </div>
                </div>

                <h3 className="search-preview-main-link">
                    jobNinjas.ai - AI-Powered Job Search & Application Tools
                </h3>

                <p className="search-preview-description">
                    jobNinjas.ai - AI-Powered Job Search & Application Tools. Smart resume optimization, automated applications, and career advancement for serious job seekers.
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
                        <p className="sitelink-desc">Explore our AI-powered tools and premium services for job application success.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SearchPreview;
