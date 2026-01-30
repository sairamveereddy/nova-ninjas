import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  X,
  Home,
  Briefcase,
  Bot,
  UserCheck,
  ClipboardList,
  Mic,
  CreditCard,
  User,
  LogOut,
  FileText,
  ScanLine,
  Sparkles,
  MousePointerClick
} from 'lucide-react';
import { BRAND } from '../config/branding';

const SideMenu = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();

  const handleNavigation = (path) => {
    navigate(path);
    window.scrollTo(0, 0);
    onClose();
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    onClose();
  };

  const menuItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: ScanLine, label: 'Resume Scanner', path: '/scanner', highlight: true },
    { icon: Briefcase, label: 'Jobs / Job Search', path: '/jobs' },
    { icon: Bot, label: 'AI Ninja', path: '/ai-ninja' },
    { icon: UserCheck, label: 'Human Ninja', path: '/human-ninja' },
    { icon: ClipboardList, label: 'Application Tracker', path: '/dashboard', requiresAuth: true },
    { icon: FileText, label: 'My Resumes', path: '/resumes', requiresAuth: true },
    { icon: Mic, label: 'Interview Prep', path: '/interview-prep' },
    { icon: Sparkles, label: 'Free Tools', path: '/free-tools', highlight: true },
    { icon: MousePointerClick, label: 'Auto-Fill Applications', path: '/dashboard?tab=profile', requiresAuth: true },
    { icon: CreditCard, label: 'Pricing', path: '/pricing' },
  ];

  const accountItems = [
    { icon: User, label: 'My Profile', path: '/dashboard?tab=profile', requiresAuth: true },
    { icon: Bot, label: 'AI Settings (BYOK)', path: '/dashboard?tab=settings', requiresAuth: true },
  ];

  return (
    <>
      {/* Overlay */}
      <div
        className={`side-menu-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />

      {/* Side Menu */}
      <div className={`side-menu ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="side-menu-header">
          <button onClick={() => handleNavigation('/')} className="side-menu-logo">
            <img src={BRAND.logoPath} alt={BRAND.logoAlt} className="side-menu-logo-img" />
            <span className="side-menu-logo-text">{BRAND.name}</span>
          </button>
          <button onClick={onClose} className="side-menu-close">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="side-menu-nav">
          <div className="side-menu-section">
            <span className="side-menu-section-title">Navigation</span>
            {menuItems.map((item) => {
              if (item.requiresAuth && !isAuthenticated) return null;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`side-menu-item ${isActive ? 'active' : ''}`}
                >
                  {typeof item.icon === 'string' ? (
                    <img src={item.icon} alt={item.label} className="side-menu-icon object-contain transform scale-150" style={{ width: '28px', height: '28px' }} />
                  ) : (
                    <item.icon className="side-menu-icon" />
                  )}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>



          {isAuthenticated && (
            <div className="side-menu-section">
              <span className="side-menu-section-title">Account</span>
              {accountItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className="side-menu-item"
                  >
                    <Icon className="side-menu-icon" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              <button onClick={handleLogout} className="side-menu-item side-menu-logout">
                <LogOut className="side-menu-icon" />
                <span>Logout</span>
              </button>
            </div>
          )}

          {!isAuthenticated && (
            <div className="side-menu-section">
              <span className="side-menu-section-title">Account</span>
              <button
                onClick={() => handleNavigation('/login')}
                className="side-menu-item"
              >
                <User className="side-menu-icon" />
                <span>Login</span>
              </button>
              <button
                onClick={() => handleNavigation('/signup')}
                className="side-menu-item side-menu-signup"
              >
                <span>Sign Up Free</span>
              </button>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="side-menu-footer">
          <button
            onClick={() => handleNavigation('/refund-policy')}
            className="text-xs text-gray-400 hover:text-primary mb-2 transition-colors block"
          >
            Refund Policy
          </button>
          <p>{BRAND.tagline}</p>
        </div>
      </div>
    </>
  );
};

export default SideMenu;

