import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardContent, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, Bot, UserCheck, ArrowRight, Zap } from 'lucide-react';
import { BRAND, PRICING } from '../config/branding';
import BookCallModal from './BookCallModal';
import SideMenu from './SideMenu';
import Header from './Header';
import './SideMenu.css';

const Pricing = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [isBookCallModalOpen, setIsBookCallModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ai'); // 'ai', 'human'
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  const handleSubscribe = (planId) => {
    // Navigate to checkout with plan ID
    navigate(`/checkout?plan=${planId}`);
  };

  // AI Ninja Plans from config
  const aiNinjaPlans = [
    {
      ...PRICING.AI_FREE,
      badge: 'FREE',
      featured: false,
    },
    {
      ...PRICING.AI_BEGINNER,
      badge: 'BEGINNER',
      featured: false,
    },
    {
      ...PRICING.AI_PRO,
      badge: 'PRO',
      featured: true,
    },
  ];

  // Human Ninja Plans from config (new structure)
  const humanNinjaPlans = [
    {
      ...PRICING.HUMAN_STARTER,
      badge: 'STARTER',
      featured: false,
    },
    {
      ...PRICING.HUMAN_GROWTH,
      badge: 'POPULAR',
      featured: true,
    },
    {
      ...PRICING.HUMAN_SCALE,
      badge: 'BEST VALUE',
      featured: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pricing-page">
      {/* Side Menu */}
      <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />

      {/* Navigation Header */}
      <Header onMenuClick={() => setSideMenuOpen(true)} />

      {/* Pricing Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{BRAND.name} Pricing</h1>
          <p className="text-xl text-gray-600 mb-2">
            {BRAND.tagline}
          </p>
          <p className="text-gray-500">
            Choose the plan that fits your job search needs
          </p>
        </div>

        {/* AI Ninja Section */}
        <div className="mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Bot className="w-8 h-8 text-primary" />
            <h2 className="text-2xl font-bold">AI Ninja – Self-Serve</h2>
          </div>
          <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
            AI-powered job application tools. You browse jobs, AI tailors your resume and cover letter, you submit.
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {aiNinjaPlans.map((plan) => (
              <Card key={plan.id} className={`relative ${plan.featured ? 'border-primary border-2 shadow-lg' : ''}`}>
                {plan.featured && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-white px-4 py-1">Recommended</Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{plan.badge}</Badge>
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">{plan.description}</p>

                  <div className="mt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-primary">{plan.priceDisplay}</span>
                      {plan.period && <span className="text-gray-600">{plan.period}</span>}
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-primary">
                        Up to {plan.applications} AI-tailored applications{plan.period ? '/month' : ''}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    variant={plan.featured ? 'default' : 'outline'}
                    onClick={() => {
                      if (plan.price === 0) {
                        navigate('/ai-ninja');
                      } else {
                        handleSubscribe(plan.id);
                      }
                    }}
                  >
                    {plan.price === 0 ? 'Try for Free' : 'Get Started'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Usage limit note */}
          <div className="max-w-3xl mx-auto mt-6 text-center">
            <p className="text-sm text-gray-500">
              <strong>Free:</strong> 5 total applications • <strong>Beginner:</strong> 200 applications/month • <strong>Pro:</strong> Unlimited applications
            </p>
          </div>
        </div>

        {/* Human Ninja Section */}
        <div className="mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <UserCheck className="w-8 h-8 text-orange-500" />
            <h2 className="text-2xl font-bold">Human Ninja – Done-for-You</h2>
          </div>
          <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
            Our team applies for you using AI + human judgment. You focus on interviews.
          </p>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {humanNinjaPlans.map((plan) => (
              <Card key={plan.id} className={`relative ${plan.featured ? 'border-orange-400 border-2 shadow-lg' : ''}`}>
                {plan.featured && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-orange-500 text-white px-4 py-1">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className={plan.featured ? 'border-orange-400 text-orange-600' : ''}>
                      {plan.badge}
                    </Badge>
                    <UserCheck className="w-5 h-5 text-orange-500" />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>

                  <div className="mt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-orange-500">{plan.priceDisplay}</span>
                    </div>
                    <div className="text-sm font-medium text-gray-700 mt-1">
                      for {plan.applications} applications
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${plan.featured ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                    variant={plan.featured ? 'default' : 'outline'}
                    onClick={() => setIsBookCallModalOpen(true)}
                  >
                    Get Started <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Human Ninja Disclaimer */}
          <div className="max-w-3xl mx-auto mt-8 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800 text-center italic">
              {PRICING.HUMAN_NINJA_DISCLAIMER}
            </p>
          </div>
        </div>



        {/* General Disclaimer */}
        <div className="text-center mt-12 max-w-2xl mx-auto">
          <p className="text-sm text-gray-600 mb-4">
            All plans include access to the Application Tracker. Cancel anytime.
          </p>
        </div>
      </div>

      {/* Book Call Modal */}
      <BookCallModal
        isOpen={isBookCallModalOpen}
        onClose={() => setIsBookCallModalOpen(false)}
      />
    </div>
  );
};

export default Pricing;
