import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  Bot,
  FileText,
  Sparkles,
  Search,
  Zap,
  MessageSquare,
  Briefcase,
  Target,
  TrendingUp,
  Globe,
  BookOpen,
  FileCheck,
  Lightbulb,
  Pen,
  Users,
  ArrowRight,
  Check,
  ChevronRight
} from 'lucide-react';
import { BRAND } from '../config/branding';
import SideMenu from './SideMenu';
import Header from './Header';
import './SideMenu.css';

const AINinja = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  // All available tools organized by category
  const toolCategories = [
    {
      name: "Resume Tools",
      tools: [
        {
          icon: "/tool-icons/resume-scanner.png",
          name: "Resume Scanner",
          description: "Get ATS match score & tailored resume",
          path: "/scanner",
          color: "bg-blue-50"
        },
        {
          icon: "/tool-icons/one-click-optimize.png",
          name: "One-Click Optimize",
          description: "Instantly optimize your resume for any job",
          path: "/one-click-optimize",
          color: "bg-purple-50"
        },
        {
          icon: "/tool-icons/bullet-points.png",
          name: "Bullet Points Generator",
          description: "Create powerful achievement bullets",
          path: "/bullet-points",
          color: "bg-pink-50"
        },
        {
          icon: "/tool-icons/summary-generator.png",
          name: "Summary Generator",
          description: "Craft compelling professional summaries",
          path: "/summary-generator",
          color: "bg-orange-50"
        },
        {
          icon: "/tool-icons/chatgpt-resume.png",
          name: "ChatGPT Resume",
          description: "AI-powered resume writing assistant",
          path: "/chatgpt-resume",
          color: "bg-indigo-50"
        }
      ]
    },
    {
      name: "Cover Letter & LinkedIn",
      tools: [
        {
          icon: "/tool-icons/chatgpt-cover-letter.png",
          name: "ChatGPT Cover Letter",
          description: "Generate personalized cover letters",
          path: "/chatgpt-cover-letter",
          color: "bg-emerald-50"
        },
        {
          icon: "/tool-icons/linkedin-optimizer.png",
          name: "LinkedIn Optimizer",
          description: "Optimize your LinkedIn profile",
          path: "/linkedin-optimizer",
          color: "bg-blue-50"
        },
        {
          icon: "/tool-icons/linkedin-examples.png",
          name: "LinkedIn Examples",
          description: "Browse professional LinkedIn examples",
          path: "/linkedin-examples",
          color: "bg-teal-50"
        }
      ]
    },
    {
      name: "Job Search & Career",
      tools: [
        {
          icon: "/tool-icons/job-board.png",
          name: "Job Board",
          description: "Browse 5M+ visa-friendly jobs",
          path: "/jobs",
          color: "bg-teal-50"
        },
        {
          icon: "/tool-icons/ai-apply-flow.png",
          name: "AI Apply Flow",
          description: "Complete AI-powered application flow",
          path: "/ai-apply",
          color: "bg-violet-50"
        },
        {
          icon: "/tool-icons/career-change.png",
          name: "Career Change Tool",
          description: "Transition to a new career path",
          path: "/career-change",
          color: "bg-indigo-50"
        },
        {
          icon: "/tool-icons/interview-prep.png",
          name: "Interview Prep",
          description: "Practice common interview questions",
          path: "/interview-prep",
          color: "bg-red-50"
        }
      ]
    },
    {
      name: "Templates & Resources",
      tools: [
        {
          icon: "/tool-icons/resume-templates.png",
          name: "Resume Templates",
          description: "Professional ATS-friendly templates",
          path: "/resume-templates",
          color: "bg-cyan-50"
        },
        {
          icon: "/tool-icons/cover-letter-templates.png",
          name: "Cover Letter Templates",
          description: "Ready-to-use cover letter formats",
          path: "/cover-letter-templates",
          color: "bg-fuchsia-50"
        },
        {
          icon: "/tool-icons/ats-guides.png",
          name: "ATS Guides",
          description: "Learn how to beat applicant tracking systems",
          path: "/ats-guides",
          color: "bg-amber-50"
        }
      ]
    }
  ];

  const totalTools = toolCategories.reduce((sum, cat) => sum + cat.tools.length, 0);

  return (
    <div className="ai-ninja-page" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />
      <Header onMenuClick={() => setSideMenuOpen(true)} />

      {/* Hero Section with Ninja Image */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        padding: '5rem 0',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
            {/* Left: Text Content */}
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                padding: '0.5rem 1rem',
                borderRadius: '50px',
                marginBottom: '1.5rem'
              }}>
                <Bot className="w-5 h-5" style={{ color: '#a78bfa' }} />
                <span style={{ color: '#c4b5fd', fontSize: '0.875rem', fontWeight: 600 }}>AI-Powered Tools</span>
              </div>

              <h1 style={{
                fontSize: '3.5rem',
                fontWeight: 800,
                lineHeight: 1.1,
                marginBottom: '1.5rem',
                color: 'white',
                letterSpacing: '-0.02em'
              }}>
                {totalTools}+ Tools to <span style={{
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>Land Your Dream Job</span>
              </h1>

              <p style={{
                fontSize: '1.25rem',
                lineHeight: 1.7,
                color: '#cbd5e1',
                marginBottom: '2rem',
                fontWeight: 400
              }}>
                From resume optimization to interview prep, we've got everything you need to stand out and get hired faster.
              </p>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Button
                  className="btn-primary"
                  onClick={() => navigate('/scanner')}
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    padding: '1rem 2rem',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Sparkles className="w-5 h-5" />
                  Start with Resume Scanner
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
            </div>

            {/* Right: Ninja Hero Image */}
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '400px',
                height: '400px',
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
                filter: 'blur(60px)',
                zIndex: 0
              }}></div>
              <img
                src="/ninja-hero.jpg"
                alt="AI Ninja Tools"
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: '20px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                  position: 'relative',
                  zIndex: 1
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div style={{
                display: 'none',
                width: '100%',
                height: '400px',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)',
                borderRadius: '20px',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                zIndex: 1
              }}>
                <Bot className="w-48 h-48" style={{ color: 'rgba(139, 92, 246, 0.3)' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* All Tools Grid */}
      <section style={{ padding: '5rem 0', background: '#f8fafc' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              marginBottom: '1rem',
              color: '#0f172a',
              letterSpacing: '-0.02em'
            }}>
              Complete AI Toolkit
            </h2>
            <p style={{
              fontSize: '1.125rem',
              color: '#64748b',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Everything you need to optimize your job search, all in one place
            </p>
          </div>

          {toolCategories.map((category, idx) => (
            <div key={idx} style={{ marginBottom: '4rem' }}>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                marginBottom: '1.5rem',
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <div style={{
                  width: '4px',
                  height: '24px',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                  borderRadius: '2px'
                }}></div>
                {category.name}
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1.5rem'
              }}>
                {category.tools.map((tool, toolIdx) => (
                  <Card
                    key={toolIdx}
                    onClick={() => navigate(tool.path)}
                    style={{
                      padding: '1.5rem',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      border: '1px solid #e2e8f0',
                      background: 'white',
                      borderRadius: '12px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div className={tool.color} style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1.25rem'
                    }}>
                      <img src={tool.icon} alt={tool.name} style={{ width: '54px', height: '54px', objectFit: 'contain', transform: 'scale(1.3)' }} />
                    </div>

                    <h4 style={{
                      fontSize: '1.125rem',
                      fontWeight: 700,
                      marginBottom: '0.5rem',
                      color: '#0f172a'
                    }}>
                      {tool.name}
                    </h4>

                    <p style={{
                      fontSize: '0.875rem',
                      color: '#64748b',
                      lineHeight: 1.6,
                      marginBottom: '1rem'
                    }}>
                      {tool.description}
                    </p>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: '#8b5cf6',
                      fontSize: '0.875rem',
                      fontWeight: 600
                    }}>
                      Try it now
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: '5rem 0',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        position: 'relative'
      }}>
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 2rem', textAlign: 'center' }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            marginBottom: '1.5rem',
            color: 'white',
            letterSpacing: '-0.02em'
          }}>
            Ready to Transform Your Job Search?
          </h2>
          <p style={{
            fontSize: '1.25rem',
            color: '#cbd5e1',
            marginBottom: '2rem',
            lineHeight: 1.7
          }}>
            Join thousands of job seekers who are landing interviews faster with our AI-powered tools
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              className="btn-primary"
              onClick={() => navigate('/signup')}
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                fontWeight: 600
              }}
            >
              Get Started Free
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/pricing')}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'white',
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                fontWeight: 600
              }}
            >
              View All Plans
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#0f172a', padding: '3rem 0', color: '#94a3b8' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.875rem' }}>{BRAND.copyright}</p>
        </div>
      </footer>
    </div>
  );
};

export default AINinja;
