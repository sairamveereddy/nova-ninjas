import React from 'react';
import './FeatureCard.css';

const FeatureCard = ({ icon, title, description, onClick }) => {
    return (
        <div className="feature-card" onClick={onClick}>
            <div className="feature-icon">
                {icon}
            </div>
            <h3 className="feature-title">{title}</h3>
            <p className="feature-description">{description}</p>
        </div>
    );
};

export default FeatureCard;
