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
import MegaMenu from './MegaMenu';
import VerificationBanner from './VerificationBanner';
import BrandLogo from './BrandLogo';

const Header = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();

  // Check if current path matches
  const isActive = (path) => location.pathname === path;

  return (
    <>
      <VerificationBanner />
      <header className="nav-header">
        <div className="nav-left">
          <button className="hamburger-btn" onClick={onMenuClick}>
            <Menu className="w-5 h-5" />
          </button>
          <button onClick={() => navigate('/')} className="nav-logo">
            <img src={BRAND.logoPath} alt={BRAND.logoAlt} className="logo-image" />
            <BrandLogo className="logo-text" />
          </button>
        </div>

        {/* Mega Menu Navigation */}
        <MegaMenu />

        <nav className="nav-links">
          <button
            onClick={() => navigate('/pricing')}
            className={`nav-link ${isActive('/pricing') ? 'nav-link-active' : ''}`}
          >
            Pricing
          </button>
          <button
            onClick={() => navigate('/contact')}
            className={`nav-link ${isActive('/contact') ? 'nav-link-active' : ''}`}
          >
            Contact
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
    </>
  );
};

export default Header;
