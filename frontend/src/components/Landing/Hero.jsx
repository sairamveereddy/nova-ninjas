import React from 'react';
import { Button } from '../ui/button';
import './Hero.css';

const Hero = ({
    title,
    subtitle,
    ctaText = "Try For Free",
    ctaAction,
    image,
    badge,
    gradient = "default"
}) => {
    const gradientClasses = {
        default: 'hero-gradient-default',
        green: 'hero-gradient-green',
        blue: 'hero-gradient-blue',
        purple: 'hero-gradient-purple'
    };

    return (
        <div className={`hero-container ${gradientClasses[gradient]}`}>
            <div className="hero-content">
                <div className="hero-text">
                    {badge && (
                        <div className="hero-badge">
                            {badge}
                        </div>
                    )}
                    <h1 className="hero-title">{title}</h1>
                    <p className="hero-subtitle">{subtitle}</p>
                    <Button
                        onClick={ctaAction}
                        className="hero-cta"
                        size="lg"
                    >
                        {ctaText}
                    </Button>
                </div>
                {image && (
                    <div className="hero-image">
                        {image}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Hero;
