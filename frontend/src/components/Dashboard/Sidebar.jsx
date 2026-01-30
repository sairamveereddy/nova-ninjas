import React from 'react';
import { NavLink } from 'react-router-dom';
import { Briefcase, FileText, Wrench, User, Settings, Menu, X } from 'lucide-react';
import { BRAND } from '../../config/branding';
import './Sidebar.css';

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const navItems = [
        { path: '/dashboard/jobs', icon: <Briefcase />, label: 'Jobs' },
        { path: '/dashboard/resumes', icon: <FileText />, label: 'Resumes' },
        { path: '/dashboard/tools', icon: <Wrench />, label: 'AI Tools' },
        { path: '/dashboard/profile', icon: <User />, label: 'Profile' },
        { path: '/dashboard/settings', icon: <Settings />, label: 'Settings' }
    ];

    return (
        <>
            <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <img src="/logo.png" alt={BRAND.name} />
                        {isOpen && <span>{BRAND.name}</span>}
                    </div>
                    <button className="sidebar-toggle" onClick={toggleSidebar}>
                        {isOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                        >
                            <div className="sidebar-icon">{item.icon}</div>
                            {isOpen && <span className="sidebar-label">{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>
            </div>

            {/* Mobile overlay */}
            {isOpen && (
                <div className="sidebar-overlay" onClick={toggleSidebar} />
            )}
        </>
    );
};

export default Sidebar;
