import React from 'react';
import Header from './Header';
import SideMenu from './SideMenu';
import { Contact2 } from './ui/contact-2';
import { BRAND } from '../config/branding';

const ContactPage = () => {
    const [sideMenuOpen, setSideMenuOpen] = React.useState(false);

    return (
        <div className="min-h-screen bg-slate-50/50">
            <Header onMenuClick={() => setSideMenuOpen(true)} />
            <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />

            <main>
                <Contact2
                    title="Get in Touch"
                    description="Have questions about AI Ninja or Human Ninja? Our team is here to help you accelerate your job search."
                    email="veereddy@jobninjas.org"
                    phone="7707440189"
                    web={{ label: "jobNinjas.org", url: "https://jobNinjas.org" }}
                />
            </main>

            <footer className="footer-modern">
                <div className="container">
                    <div className="footer-bottom-modern">
                        <p>{BRAND.copyright}</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default ContactPage;
