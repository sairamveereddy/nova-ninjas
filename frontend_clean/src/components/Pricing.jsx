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
import Navbar from './Navbar';

const Pricing = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [isBookCallModalOpen, setIsBookCallModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'ai', 'human'
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
    <div className="min-h-screen bg-gray-50">
      {/* Side Menu */}
      <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />

      {/* Navigation */}
      <Navbar onOpenSideMenu={() => setSideMenuOpen(true)} />

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

        {/* Tab Navigation */}
        <div className="flex justify-center gap-2 mb-12">
          <Button
            variant={activeTab === 'all' ? 'default' : 'outline'}
            onClick={() => setActiveTab('all')}
          >
            All Plans
          </Button>
          <Button
            variant={activeTab === 'ai' ? 'default' : 'outline'}
            onClick={() => setActiveTab('ai')}
            className="flex items-center gap-2"
          >
            <Bot className="w-4 h-4" /> AI Ninja
          </Button>
          <Button
            variant={activeTab === 'human' ? 'default' : 'outline'}
            onClick={() => setActiveTab('human')}
            className="flex items-center gap-2"
          >
            <UserCheck className="w-4 h-4" /> Human Ninja
          </Button>
        </div>

        {/* AI Ninja Section */}
        {(activeTab === 'all' || activeTab === 'ai') && (
          <div className="mb-16">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Bot className="w-8 h-8 text-primary" />
              <h2 className="text-2xl font-bold">AI Ninja – Self-Serve</h2>
            </div>
            <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
              AI-powered job application tools. You browse jobs, AI tailors your resume and cover letter, you submit.
            </p>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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
                      className="w-full"
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
            <div className="max-w-2xl mx-auto mt-6 text-center">
              <p className="text-sm text-gray-500">
                <strong>Free:</strong> 5 total applications • <strong>Pro:</strong> 200 applications per month
              </p>
            </div>
          </div>
        )}

        {/* Human Ninja Section */}
        {(activeTab === 'all' || activeTab === 'human') && (
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
        )}

        {/* Quick Comparison */}
        {activeTab === 'all' && (
          <div className="mt-12 max-w-4xl mx-auto">
            <h3 className="text-xl font-bold text-center mb-6">Quick Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Plan</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Price</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Applications</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Who Applies</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 flex items-center gap-2">
                      <Bot className="w-4 h-4 text-primary" />
                      <span className="font-medium">AI Ninja – Free</span>
                    </td>
                    <td className="text-center py-3 px-4 font-bold text-primary">$0</td>
                    <td className="text-center py-3 px-4">5 total</td>
                    <td className="text-center py-3 px-4 text-gray-600">You</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 bg-primary/5">
                    <td className="py-3 px-4 flex items-center gap-2">
                      <Bot className="w-4 h-4 text-primary" />
                      <span className="font-medium">AI Ninja Pro</span>
                      <Badge className="bg-primary text-white text-xs">PRO</Badge>
                    </td>
                    <td className="text-center py-3 px-4 font-bold text-primary">$29.99/mo</td>
                    <td className="text-center py-3 px-4">200/month</td>
                    <td className="text-center py-3 px-4 text-gray-600">You</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-orange-500" />
                      <span className="font-medium">Human Ninja Starter</span>
                    </td>
                    <td className="text-center py-3 px-4 font-bold text-orange-500">$50</td>
                    <td className="text-center py-3 px-4">25</td>
                    <td className="text-center py-3 px-4 text-gray-600">Our Team</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 bg-orange-50/50">
                    <td className="py-3 px-4 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-orange-500" />
                      <span className="font-medium">Human Ninja Growth</span>
                      <Badge className="bg-orange-500 text-white text-xs">POPULAR</Badge>
                    </td>
                    <td className="text-center py-3 px-4 font-bold text-orange-500">$199</td>
                    <td className="text-center py-3 px-4">100</td>
                    <td className="text-center py-3 px-4 text-gray-600">Our Team</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-orange-500" />
                      <span className="font-medium">Human Ninja Scale</span>
                    </td>
                    <td className="text-center py-3 px-4 font-bold text-orange-500">$399</td>
                    <td className="text-center py-3 px-4">250</td>
                    <td className="text-center py-3 px-4 text-gray-600">Our Team</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

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
