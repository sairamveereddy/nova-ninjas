import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  UserCheck,
  ClipboardList,
  Search,
  Sparkles,
  Send,
  Check,
  Clock,
  Shield,
  Users,
  Target,
  TrendingUp,
  FileText,
  MessageSquare,
  Calendar,
  BarChart3,
  Zap,
  Award,
  Globe,
  Phone
} from 'lucide-react';
import { BRAND } from '../config/branding';
import BookCallModal from './BookCallModal';
import SideMenu from './SideMenu';
import Header from './Header';
import './SideMenu.css';

const HumanNinja = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isBookCallModalOpen, setIsBookCallModalOpen] = useState(false);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  const processSteps = [
    {
      icon: <ClipboardList className="w-8 h-8" />,
      title: "Intake & Strategy",
      description: "Share your resume, LinkedIn, target roles, locations, salary expectations, and visa situation. We create a personalized job search strategy tailored to your goals.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Search className="w-8 h-8" />,
      title: "Targeted Role Search",
      description: "We shortlist relevant roles (visa-friendly, remote, higher-paying) from our 5M+ job database and other premium sources that match your profile perfectly.",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: "AI + Human Tailoring",
      description: "We use AI to draft application materials quickly, then our human specialists review, edit, and perfect every detail. Quality over quantity, always.",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: <Send className="w-8 h-8" />,
      title: "Apply & Track",
      description: "We submit applications for you and log everything into your Application Tracker. You focus on preparing for interviews while we handle the grind.",
      color: "from-green-500 to-emerald-500"
    }
  ];

  const benefits = [
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Save 20+ Hours/Week",
      description: "Stop spending evenings and weekends on tedious job applications. We handle the entire process while you focus on what matters.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Protected Reputation",
      description: "We never spam. One smart, targeted application per company – protecting your professional image and maximizing response rates.",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Real Human Judgment",
      description: "AI helps us work faster, but every decision and submission is made by experienced human specialists who understand your career.",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "Higher Success Rate",
      description: "Professionally crafted applications with human oversight lead to 3x more interview callbacks than generic applications.",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Full Transparency",
      description: "Track every application in real-time. See exactly where we've applied, status updates, and interview invitations as they come in.",
      color: "from-indigo-500 to-purple-500"
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: "Dedicated Support",
      description: "Your assigned specialist knows your story and goals. Get personalized guidance and strategy adjustments throughout your search.",
      color: "from-pink-500 to-rose-500"
    }
  ];

  const whatYouGet = [
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Tailored Resumes",
      description: "Custom resume for each application"
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: "Cover Letters",
      description: "Personalized cover letters that stand out"
    },
    {
      icon: <Search className="w-6 h-6" />,
      title: "Job Research",
      description: "We find the best opportunities for you"
    },
    {
      icon: <Send className="w-6 h-6" />,
      title: "Application Submission",
      description: "We apply on your behalf"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Application Tracker",
      description: "Real-time dashboard of all applications"
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Weekly Updates",
      description: "Regular progress reports and strategy calls"
    }
  ];

  return (
    <div className="human-ninja-page" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />
      <Header onMenuClick={() => setSideMenuOpen(true)} />

      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        padding: '5rem 0',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', position: 'relative', zIndex: 10 }}>
          <div style={{ textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(249, 115, 22, 0.1)',
              border: '1px solid rgba(249, 115, 22, 0.3)',
              padding: '0.5rem 1rem',
              borderRadius: '50px',
              marginBottom: '1.5rem'
            }}>
              <UserCheck className="w-5 h-5" style={{ color: '#fb923c' }} />
              <span style={{ color: '#fdba74', fontSize: '0.875rem', fontWeight: 600 }}>Human Ninja – Done-For-You Service</span>
            </div>

            <h1 style={{
              fontSize: '3.5rem',
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: '1.5rem',
              color: 'white',
              letterSpacing: '-0.02em'
            }}>
              No Time to Apply? <span style={{
                background: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>Let Us Run Your Job Search</span>
            </h1>

            <p style={{
              fontSize: '1.25rem',
              lineHeight: 1.7,
              color: '#cbd5e1',
              marginBottom: '2.5rem',
              fontWeight: 400,
              maxWidth: '700px',
              margin: '0 auto 2.5rem'
            }}>
              Our team handles the grind: shortlisting roles, crafting applications, and keeping your pipeline updated – while you focus on interviews and landing offers.
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                className="btn-primary"
                onClick={() => setIsBookCallModalOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  padding: '1rem 2rem',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Phone className="w-5 h-5" />
                Book Free Consultation
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/pricing')}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  padding: '1rem 2rem',
                  fontSize: '1.1rem',
                  fontWeight: 600
                }}
              >
                View Pricing
              </Button>
            </div>

            {/* Quick Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '2rem',
              marginTop: '4rem',
              padding: '2rem',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f97316', marginBottom: '0.5rem' }}>20+</div>
                <div style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>Hours Saved/Week</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f97316', marginBottom: '0.5rem' }}>3x</div>
                <div style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>More Interviews</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f97316', marginBottom: '0.5rem' }}>100%</div>
                <div style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>Personalized Service</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ padding: '5rem 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              marginBottom: '1rem',
              color: '#0f172a',
              letterSpacing: '-0.02em'
            }}>
              How Human Ninja Works
            </h2>
            <p style={{
              fontSize: '1.125rem',
              color: '#64748b',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              We handle your entire job application process in 4 simple steps
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2rem'
          }}>
            {processSteps.map((step, index) => (
              <Card
                key={index}
                style={{
                  padding: '2rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  position: 'relative',
                  background: 'white'
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${step.color})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: 700
                }}>
                  {index + 1}
                </div>

                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: `linear-gradient(135deg, ${step.color})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  marginBottom: '1.5rem'
                }}>
                  {step.icon}
                </div>

                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  marginBottom: '0.75rem',
                  color: '#0f172a'
                }}>
                  {step.title}
                </h3>

                <p style={{
                  fontSize: '0.875rem',
                  color: '#64748b',
                  lineHeight: 1.6
                }}>
                  {step.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section style={{ padding: '5rem 0', background: '#f8fafc' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              marginBottom: '1rem',
              color: '#0f172a',
              letterSpacing: '-0.02em'
            }}>
              What's Included
            </h2>
            <p style={{
              fontSize: '1.125rem',
              color: '#64748b'
            }}>
              Everything you need for a successful job search
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem'
          }}>
            {whatYouGet.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: '1.5rem',
                  background: 'white',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  textAlign: 'center'
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  margin: '0 auto 1rem'
                }}>
                  {item.icon}
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0f172a' }}>
                  {item.title}
                </h4>
                <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section style={{ padding: '5rem 0', background: 'white' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              marginBottom: '1rem',
              color: '#0f172a',
              letterSpacing: '-0.02em'
            }}>
              Why Choose Human Ninja?
            </h2>
            <p style={{
              fontSize: '1.125rem',
              color: '#64748b'
            }}>
              The advantages of having a dedicated team on your side
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem'
          }}>
            {benefits.map((benefit, idx) => (
              <Card
                key={idx}
                style={{
                  padding: '2rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  background: 'white'
                }}
              >
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '14px',
                  background: `linear-gradient(135deg, ${benefit.color})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  marginBottom: '1.5rem'
                }}>
                  {benefit.icon}
                </div>

                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  marginBottom: '0.75rem',
                  color: '#0f172a'
                }}>
                  {benefit.title}
                </h3>

                <p style={{
                  fontSize: '0.875rem',
                  color: '#64748b',
                  lineHeight: 1.6
                }}>
                  {benefit.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: '5rem 0',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
      }}>
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 2rem', textAlign: 'center' }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            marginBottom: '1.5rem',
            color: 'white',
            letterSpacing: '-0.02em'
          }}>
            Ready to Let a Ninja Handle Your Job Search?
          </h2>
          <p style={{
            fontSize: '1.25rem',
            color: '#cbd5e1',
            marginBottom: '2rem',
            lineHeight: 1.7
          }}>
            Book a free consultation to discuss your goals and get started with a personalized job search strategy
          </p>
          <Button
            className="btn-primary"
            onClick={() => setIsBookCallModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              padding: '1rem 2.5rem',
              fontSize: '1.1rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Phone className="w-5 h-5" />
            Book Free Consultation
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#0f172a', padding: '3rem 0', color: '#94a3b8' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.875rem' }}>{BRAND.copyright}</p>
        </div>
      </footer>

      {/* Book Call Modal */}
      <BookCallModal
        isOpen={isBookCallModalOpen}
        onClose={() => setIsBookCallModalOpen(false)}
      />
    </div>
  );
};

export default HumanNinja;
