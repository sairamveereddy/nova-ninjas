import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import {
  Bot,
  UserCheck,
  Briefcase,
  Menu
} from 'lucide-react';
import { BRAND } from '../config/branding';

const Header = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();

  // Check if current path matches
  const isActive = (path) => location.pathname === path;

  return (
    <header className="nav-header">
      <div className="nav-left">
        <button className="hamburger-btn" onClick={onMenuClick}>
          <Menu className="w-5 h-5" />
        </button>
        <button onClick={() => navigate('/')} className="nav-logo">
          <img src={BRAND.logoPath} alt={BRAND.logoAlt} className="logo-image" />
          <span className="logo-text">{BRAND.name}</span>
        </button>
      </div>
      <nav className="nav-links">
        <button
          onClick={() => navigate('/ai-ninja')}
          className={`nav-link nav-link-highlight ${isActive('/ai-ninja') ? 'nav-link-active' : ''}`}
        >
          <Bot className="w-4 h-4" /> AI Ninja
        </button>
        <button
          onClick={() => navigate('/human-ninja')}
          className={`nav-link nav-link-highlight ${isActive('/human-ninja') ? 'nav-link-active' : ''}`}
        >
          <UserCheck className="w-4 h-4" /> Human Ninja
        </button>
        <button
          onClick={() => navigate('/jobs')}
          className={`nav-link ${isActive('/jobs') ? 'nav-link-active' : ''}`}
        >
          Job Board
        </button>
        <button
          onClick={() => navigate('/pricing')}
          className={`nav-link ${isActive('/pricing') ? 'nav-link-active' : ''}`}
        >
          Pricing
        </button>
      </nav>
      <div className="nav-actions">
        {loading ? (
          <div style={{ width: '150px' }} /> /* Placeholder while loading */
        ) : !isAuthenticated && (
          <>
            <Button variant="secondary" className="btn-secondary" onClick={() => navigate('/login')}>
              Login
            </Button>
            <Button className="btn-primary" onClick={() => navigate('/signup')}>
              Get Started
            </Button>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;

