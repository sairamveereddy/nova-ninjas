import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, User, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './DashboardNavbar.css';

const DashboardNavbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="dashboard-navbar">
            <div className="navbar-search">
                <Search size={20} />
                <input type="text" placeholder="Search jobs, tools, or resumes..." />
            </div>

            <div className="navbar-actions">
                <button className="navbar-icon-btn">
                    <Bell size={20} />
                </button>

                <div className="navbar-user">
                    <div className="user-avatar">
                        <User size={20} />
                    </div>
                    <div className="user-info">
                        <div className="user-name">{user?.name || 'User'}</div>
                        <div className="user-email">{user?.email}</div>
                    </div>
                </div>

                <button className="navbar-icon-btn" onClick={handleLogout}>
                    <LogOut size={20} />
                </button>
            </div>
        </div>
    );
};

export default DashboardNavbar;
