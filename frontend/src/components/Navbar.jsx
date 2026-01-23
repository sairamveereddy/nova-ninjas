import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Bot, UserCheck, Menu } from 'lucide-react';
import { BRAND } from '../config/branding';
import { useAuth } from '../contexts/AuthContext';
import BrandLogo from './BrandLogo';

const Navbar = ({ onOpenSideMenu, rightContent }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const currentPath = location.pathname;

  const isActive = (path) => currentPath === path;

  return (
    <header className="nav-header nav-modern">
      <div className="nav-left">
        <button className="hamburger-btn" onClick={onOpenSideMenu}>
          <Menu className="w-5 h-5" />
        </button>
        <button onClick={() => navigate('/')} className="nav-logo">
          <img src={BRAND.logoPath} alt={BRAND.logoAlt} className="logo-image" />
          <BrandLogo className="logo-text" />
        </button>
      </div>
      <nav className="nav-links-modern">
        <button
          onClick={() => navigate('/ai-ninja')}
          className={`nav-link-modern nav-ninja-btn ai ${isActive('/ai-ninja') ? 'active' : ''}`}
        >
          <Bot className="w-5 h-5" />
          <span>AI Ninja</span>
        </button>
        <button
          onClick={() => navigate('/human-ninja')}
          className={`nav-link-modern nav-ninja-btn human ${isActive('/human-ninja') ? 'active' : ''}`}
        >
          <UserCheck className="w-5 h-5" />
          <span>Human Ninja</span>
        </button>
        <button
          onClick={() => navigate('/jobs')}
          className={`nav-link-modern ${isActive('/jobs') ? 'text-primary font-semibold' : ''}`}
        >
          Job Board
        </button>
        <button
          onClick={() => navigate('/pricing')}
          className={`nav-link-modern ${isActive('/pricing') ? 'text-primary font-semibold' : ''}`}
        >
          Pricing
        </button>
      </nav>
      <div className="nav-actions">
        {rightContent ? (
          rightContent
        ) : (
          !isAuthenticated && (
            <>
              <Button variant="ghost" className="btn-ghost" onClick={() => navigate('/login')}>
                Log in
              </Button>
              <Button className="btn-primary-modern" onClick={() => navigate('/signup')}>
                Start now for free
              </Button>
            </>
          )
        )}
      </div>
    </header>
  );
};

export default Navbar;
