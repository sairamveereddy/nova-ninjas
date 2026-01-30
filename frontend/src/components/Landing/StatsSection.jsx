import React from 'react';
import './StatsSection.css';

const StatsSection = ({ stats }) => {
    return (
        <div className="stats-section">
            <div className="stats-container">
                {stats.map((stat, index) => (
                    <div key={index} className="stat-item">
                        <div className="stat-value">{stat.value}</div>
                        <div className="stat-label">{stat.label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StatsSection;
