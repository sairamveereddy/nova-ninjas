import React from 'react';
import { useNavigate } from 'react-router-dom';
import SideMenu from './SideMenu';
import AINinjaChat from './AINinjaChat';
import MegaMenu from './MegaMenu';
import { BRAND } from '../config/branding';
import BrandLogo from './BrandLogo';
import './DashboardLayout.css';

const DashboardLayout = ({ children, activePage = 'jobs' }) => {
    const navigate = useNavigate();

    return (
        <div className="dashboard-wrapper">
            <header className="dashboard-top-nav">
                <div className="dashboard-nav-container">
                    <button onClick={() => { navigate('/'); window.scrollTo(0, 0); }} className="nav-logo mr-8">
                        <img src={BRAND.logoPath} alt={BRAND.logoAlt} className="logo-image" />
                        <span className="logo-text-static">{BRAND.name}</span>
                    </button>
                    <MegaMenu />
                </div>
            </header>
            <div className="dashboard-layout">
                {/* Left Sidebar - Navigation */}
                <aside className="dashboard-sidebar-left">
                    {/* We pass a specific prop 'mode="static"' to SideMenu to ensure it renders inline 
                instead of as an overlay. If SideMenu doesn't support it yet, we'll wrapper it or maintain 
                its internal state to 'open' and hide the close button via CSS in this scope. 
                For now, we'll try to use it as is but force it relative.
            */}
                    <div className="static-sidemenu-wrapper">
                        <SideMenu isOpen={true} isStatic={true} onClose={() => { }} />
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="dashboard-main">
                    {children}
                </main>

                {/* Right Sidebar - Chat */}
                <aside className="dashboard-sidebar-right">
                    <AINinjaChat isOpen={true} />
                </aside>
            </div>
        </div>
    );
};

export default DashboardLayout;
