import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Eye, Lock, Database, Mail, Globe, UserCheck, AlertTriangle } from 'lucide-react';
import { BRAND } from '../config/branding';
import { Card } from './ui/card';
import Header from './Header';
import SideMenu from './SideMenu';

const Section = ({ icon: Icon, title, children, color = 'text-blue-600' }) => (
    <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
            <Icon className={`w-6 h-6 ${color}`} />
            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        </div>
        <div className="text-gray-600 leading-relaxed space-y-3">{children}</div>
    </section>
);

const PrivacyPolicy = () => {
    const navigate = useNavigate();
    const [sideMenuOpen, setSideMenuOpen] = useState(false);
    const EFFECTIVE_DATE = 'February 24, 2026';

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />
            <Header onMenuClick={() => setSideMenuOpen(true)} />

            <main className="flex-grow container mx-auto px-4 py-12 max-w-4xl">
                <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-blue-600 mb-8 transition-colors group">
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back
                </button>

                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center p-3 bg-blue-50 rounded-2xl mb-4">
                        <Shield className="w-8 h-8 text-blue-600" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-3">Privacy Policy</h1>
                    <p className="text-gray-500 text-sm">Effective Date: {EFFECTIVE_DATE}</p>
                    <p className="text-gray-600 mt-2 text-lg">
                        {BRAND.name} is committed to protecting your personal information and your right to privacy.
                    </p>
                </div>

                <Card className="p-8 border-none shadow-xl bg-white/80 backdrop-blur-sm space-y-8">

                    <Section icon={Eye} title="1. Information We Collect">
                        <p>We collect the following types of information when you use {BRAND.name}:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Account Information:</strong> Name, email address, and password when you create an account.</li>
                            <li><strong>Resume Data:</strong> Resume text and documents you upload to use our AI tools.</li>
                            <li><strong>Job Application Data:</strong> Job descriptions, applications generated, and tracker entries.</li>
                            <li><strong>Payment Information:</strong> Processed securely through third-party providers (Razorpay/Stripe). We do not store card details.</li>
                            <li><strong>Usage Data:</strong> Pages visited, features used, and session data to improve our service.</li>
                            <li><strong>API Keys (BYOK):</strong> If you provide your own AI API keys, they are stored AES-256 encrypted and never exposed in plaintext.</li>
                        </ul>
                    </Section>

                    <Section icon={Database} title="2. How We Use Your Information" color="text-purple-600">
                        <p>We use your information to:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Provide, operate, and improve the {BRAND.name} platform.</li>
                            <li>Generate AI-tailored resumes, cover letters, and job applications on your behalf.</li>
                            <li>Track your job applications in your personal dashboard.</li>
                            <li>Send transactional emails (account verification, purchase confirmation).</li>
                            <li>Enforce usage limits (e.g., 20 job applications per day on the free plan).</li>
                            <li>Prevent fraud and ensure platform security.</li>
                        </ul>
                        <p>We do <strong>not</strong> sell your personal data to third parties.</p>
                    </Section>

                    <Section icon={Globe} title="3. Third-Party Services" color="text-green-600">
                        <p>We use trusted third-party services to operate our platform:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>OpenAI / Groq / Anthropic / Google:</strong> To power AI resume and application generation. Your resume text is sent to these services solely to generate your requested output.</li>
                            <li><strong>Razorpay / Stripe:</strong> For secure payment processing. We do not store payment card details.</li>
                            <li><strong>Supabase / MongoDB:</strong> For database storage of your account and job data.</li>
                            <li><strong>Vercel / Railway:</strong> For hosting the platform.</li>
                            <li><strong>Cloudflare Turnstile:</strong> For bot protection on sign-up.</li>
                        </ul>
                        <p>Each service operates under its own privacy policy and security standards.</p>
                    </Section>

                    <Section icon={Lock} title="4. Data Security" color="text-orange-600">
                        <p>We take the security of your data seriously:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>All data is transmitted over HTTPS (TLS encryption).</li>
                            <li>Passwords are hashed using bcrypt before storage.</li>
                            <li>BYOK API keys are encrypted with AES-256-GCM before storage.</li>
                            <li>Access tokens use JWT with short expiry windows.</li>
                            <li>We do not log or store AI API keys in plaintext.</li>
                        </ul>
                    </Section>

                    <Section icon={UserCheck} title="5. Your Rights" color="text-teal-600">
                        <p>You have the right to:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Access</strong> the personal data we hold about you.</li>
                            <li><strong>Delete</strong> your account and associated data by contacting us.</li>
                            <li><strong>Correct</strong> any inaccurate information in your profile.</li>
                            <li><strong>Export</strong> your resume and job application data.</li>
                            <li><strong>Opt out</strong> of non-transactional communications at any time.</li>
                        </ul>
                        <p>To exercise these rights, contact us at <a href={`mailto:${BRAND.supportEmail}`} className="text-blue-600 underline">{BRAND.supportEmail}</a>.</p>
                    </Section>

                    <Section icon={AlertTriangle} title="6. Children's Privacy" color="text-red-500">
                        <p>{BRAND.name} is not directed to individuals under the age of 16. We do not knowingly collect personal data from children. If you believe a child has provided us information, please contact us immediately.</p>
                    </Section>

                    <Section icon={Mail} title="7. Contact Us" color="text-blue-600">
                        <p>If you have any questions or concerns about this Privacy Policy, please contact:</p>
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mt-2">
                            <p><strong>{BRAND.name}</strong></p>
                            <p>Email: <a href={`mailto:${BRAND.supportEmail}`} className="text-blue-600 underline">{BRAND.supportEmail}</a></p>
                            <p>Website: <a href={BRAND.website} className="text-blue-600 underline">{BRAND.website}</a></p>
                        </div>
                    </Section>

                    <p className="text-sm text-gray-400 text-center pt-4 border-t border-gray-100">
                        We may update this Privacy Policy from time to time. The latest version will always be available at <a href="https://jobninjas.io/privacy-policy" className="text-blue-600 underline">jobninjas.io/privacy-policy</a>. Continued use of the platform constitutes acceptance of any updates.
                    </p>
                </Card>
            </main>

            <footer className="bg-white border-t py-8 mt-auto">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-gray-500 text-sm">{BRAND.copyright}</p>
                    <div className="flex justify-center gap-6 mt-2 text-sm">
                        <button onClick={() => navigate('/privacy-policy')} className="text-blue-600 hover:underline">Privacy Policy</button>
                        <button onClick={() => navigate('/terms')} className="text-gray-500 hover:underline">Terms & Conditions</button>
                        <button onClick={() => navigate('/refund-policy')} className="text-gray-500 hover:underline">Refund Policy</button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default PrivacyPolicy;
