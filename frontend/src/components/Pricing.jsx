import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Check, Bot, UserCheck, ArrowRight, Zap, Briefcase, Database, Server, CheckCheck } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { BRAND, PRICING } from '../config/branding';
import BookCallModal from './BookCallModal';
import SideMenu from './SideMenu';
import Header from './Header';
import { TimelineContent } from "./ui/timeline-animation";
import { VerticalCutReveal } from "./ui/vertical-cut-reveal";
import NumberFlow from "@number-flow/react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import './SideMenu.css';
import { API_URL } from '../config/api';

const PricingSwitch = ({
  selected,
  onSwitch,
  className,
}) => {
  return (
    <div className={cn("flex justify-start", className)}>
      <div className="relative z-10 flex w-fit rounded-xl bg-neutral-100 border border-gray-200 p-1">
        <button
          onClick={() => onSwitch("0")}
          className={cn(
            "relative z-10 w-fit cursor-pointer h-12 rounded-xl sm:px-6 px-3 sm:py-2 py-1 font-medium transition-colors sm:text-base text-sm",
            selected === "0" ? "text-white" : "text-muted-foreground hover:text-black",
          )}
        >
          {selected === "0" && (
            <motion.span
              layoutId={"switch"}
              className="absolute top-0 left-0 h-10 w-full rounded-xl border-4 shadow-sm shadow-blue-600 border-blue-600 bg-gradient-to-t from-blue-500 via-blue-400 to-blue-600 my-1"
              style={{ top: '1px' }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative">AI Ninja (SaaS)</span>
        </button>

        <button
          onClick={() => onSwitch("1")}
          className={cn(
            "relative z-10 w-fit cursor-pointer h-12 flex-shrink-0 rounded-xl sm:px-6 px-3 sm:py-2 py-1 font-medium transition-colors sm:text-base text-sm",
            selected === "1" ? "text-white" : "text-muted-foreground hover:text-black",
          )}
        >
          {selected === "1" && (
            <motion.span
              layoutId={"switch"}
              className="absolute top-0 left-0 h-10 w-full rounded-xl border-4 shadow-sm shadow-blue-600 border-blue-600 bg-gradient-to-t from-blue-500 via-blue-400 to-blue-600 my-1"
              style={{ top: '1px' }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative flex items-center gap-2">
            Human Ninja (Service)
          </span>
        </button>
      </div>
    </div>
  );
};

const Pricing = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, refreshUser } = useAuth();
  const [isBookCallModalOpen, setIsBookCallModalOpen] = useState(false);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [switchValue, setSwitchValue] = useState("0"); // "0" for ai, "1" for human
  const pricingRef = useRef(null);

  const planType = switchValue === "0" ? 'ai' : 'human';

  const revealVariants = {
    visible: (i) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.2,
        duration: 0.5,
      },
    }),
    hidden: {
      filter: "blur(10px)",
      y: -20,
      opacity: 0,
    },
  };

  const aiNinjaPlans = [
    { ...PRICING.AI_YEARLY, popular: true, buttonVariant: 'default', description: PRICING.AI_YEARLY.description },
  ];

  const humanNinjaPlans = [
    { ...PRICING.HUMAN_STARTER, popular: false, buttonVariant: 'outline', description: 'We manually apply to 50 roles for you.' },
    { ...PRICING.HUMAN_GROWTH, popular: true, buttonVariant: 'default', description: 'Higher-volume campaign for serious seekers.' },
    { ...PRICING.HUMAN_SCALE, popular: false, buttonVariant: 'outline', description: 'Aggressive outreach while staying targeted.' },
    { ...PRICING.HUMAN_ENTERPRISE, popular: false, buttonVariant: 'outline', description: 'For high-volume or custom requirements.' },
  ];

  const currentPlans = planType === 'ai' ? aiNinjaPlans : humanNinjaPlans;

  const handleActivateTrial = async () => {
    if (!isAuthenticated) {
      navigate('/signup');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/api/subscription/activate-trial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': token
        },
        body: JSON.stringify({ plan_id: 'ai-yearly' })
      });

      const data = await response.json();

      if (response.ok) {
        alert("You have unlocked 2 weeks access without any payment!");
        await refreshUser();
        navigate('/dashboard'); // Or wherever appropriate
      } else {
        alert(data.detail || "Failed to activate trial.");
      }
    } catch (error) {
      console.error("Trial activation error:", error);
      alert("An error occurred. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-white pricing-page">
      <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />
      <Header onMenuClick={() => setSideMenuOpen(true)} />

      <div className="px-4 pt-20 pb-32 max-w-7xl mx-auto relative" ref={pricingRef}>
        <article className="text-left mb-6 space-y-4 max-w-2xl">
          <h2 className="md:text-6xl text-4xl capitalize font-medium text-gray-900 mb-4">
            <VerticalCutReveal
              splitBy="words"
              staggerDuration={0.15}
              staggerFrom="first"
              reverse={true}
              containerClassName="justify-start"
              transition={{
                type: "spring",
                stiffness: 250,
                damping: 40,
                delay: 0,
              }}
            >
              We've got a plan that's perfect for you
            </VerticalCutReveal>
          </h2>

          <TimelineContent
            as="p"
            animationNum={0}
            timelineRef={pricingRef}
            customVariants={revealVariants}
            className="md:text-base text-sm text-gray-600 w-[80%]"
          >
            Trusted by candidates worldwide. {planType === 'ai' ? 'Automate your search with AI. You only need this once—land your dream job during your trial or first year.' : 'Let our human Ninjas handle everything.'} Choose your path.
          </TimelineContent>

          <TimelineContent
            as="div"
            animationNum={1}
            timelineRef={pricingRef}
            customVariants={revealVariants}
          >
            <PricingSwitch
              selected={switchValue}
              onSwitch={setSwitchValue}
              className="w-fit"
            />
          </TimelineContent>
        </article>

        <div className={`grid gap-4 py-6 ${planType === 'ai' ? 'max-w-md mx-auto' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
          {currentPlans.map((plan, index) => (
            <TimelineContent
              key={plan.id}
              as="div"
              animationNum={2 + index}
              timelineRef={pricingRef}
              customVariants={revealVariants}
            >
              <Card
                className={`relative border border-neutral-200 h-full flex flex-col ${plan.popular ? "ring-2 ring-blue-500 bg-blue-50 shadow-xl" : "bg-white shadow-sm"
                  }`}
              >
                <CardHeader className="text-left">
                  <div className="flex justify-between items-start">
                    <h3 className="xl:text-3xl md:text-2xl text-2xl font-semibold text-gray-900 mb-2">
                      {plan.name}
                    </h3>
                    <div className="flex gap-2">
                      {plan.popular && (
                        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                          Popular
                        </span>
                      )}
                      {plan.discountPercent && (
                        <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                          {plan.discountPercent}% OFF
                        </span>
                      )}
                      {plan.isBeta && (
                        <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider">
                          Beta
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="xl:text-sm md:text-xs text-sm text-gray-600 mb-4">
                    {plan.description}
                  </p>

                  {/* Free Trial Badge - Only for AI Ninja */}
                  {planType === 'ai' && (
                    <div className="mb-3">
                      <span className="inline-block bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                        ✨ 2 Weeks Free Trial
                      </span>
                    </div>
                  )}

                  {plan.originalPrice && (
                    <div className="mb-2">
                      <span className="text-lg text-gray-400 line-through">
                        ${plan.originalPrice}
                      </span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-semibold text-gray-900">
                      {plan.price !== null ? (
                        <>
                          $
                          <NumberFlow
                            format={{ minimumFractionDigits: plan.price % 1 === 0 ? 0 : 2 }}
                            value={plan.price}
                            className="text-4xl font-semibold"
                          />
                        </>
                      ) : (
                        "Contact Us"
                      )}
                    </span>
                    {plan.price !== null && (
                      <div className="flex flex-col">
                        <span className="text-gray-600">
                          {planType === 'ai' ? 'USD ' : ''}/{plan.period ? plan.period.replace('/', '') : (planType === 'human' ? 'package' : 'total')}
                        </span>
                        {planType === 'ai' && (
                          <span className="text-xs text-gray-400 line-through italic">
                            not /month
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0 flex-1 flex flex-col">
                  <button
                    className={`w-full mb-4 p-3 text-lg font-semibold rounded-xl transition-all ${plan.popular
                      ? "bg-gradient-to-t from-blue-600 to-blue-700 shadow-lg shadow-blue-500 border border-blue-400 text-white"
                      : "bg-gradient-to-t from-neutral-900 to-neutral-700 shadow-lg shadow-neutral-900 border border-neutral-700 text-white"
                      }`}
                    onClick={() => {
                      if (plan.id === 'human-enterprise') {
                        setIsBookCallModalOpen(true);
                      } else if (planType === 'human') {
                        setIsBookCallModalOpen(true);
                      } else if (planType === 'ai') {
                        handleActivateTrial();
                      } else if (plan.price === 0) {
                        navigate('/ai-ninja');
                      } else {
                        navigate(`/checkout?plan=${plan.id}&auto=true`);
                      }
                    }}
                  >
                    {planType === 'ai' ? 'Start 2 Weeks Free' : (plan.price === 0 ? 'Try Free' : (plan.id === 'human-enterprise' ? 'Contact Us' : 'Get Started'))}
                  </button>

                  <div className="space-y-4 pt-4 border-t border-neutral-200">
                    <h4 className="font-semibold text-sm uppercase text-gray-400 tracking-wider">
                      Includes:
                    </h4>
                    <ul className="space-y-3">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start">
                          <span className="h-5 w-5 bg-white border border-blue-500 rounded-full flex items-center justify-center mt-0.5 mr-3 shrink-0">
                            <CheckCheck className="h-3 w-3 text-blue-600" />
                          </span>
                          <span className="text-sm text-gray-600">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {plan.byokNote && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-xs text-green-700 italic">
                          {plan.byokNote}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TimelineContent>
          ))}
        </div>

        {planType === 'ai' && (
          <TimelineContent
            animationNum={3}
            className="text-center mt-6 max-w-2xl mx-auto"
          >
            <p className="text-sm text-gray-500 italic">
              * Most users land a job within the trial period or first month. We designed this so you won't need to renew!
            </p>
          </TimelineContent>
        )}

        {planType === 'human' && (
          <TimelineContent
            animationNum={currentPlans.length + 2}
            className="text-center mt-12 max-w-2xl mx-auto"
          >
            <p className="text-sm text-gray-500 italic">
              {PRICING.HUMAN_NINJA_DISCLAIMER}
            </p>
          </TimelineContent>
        )}
      </div>

      <BookCallModal
        isOpen={isBookCallModalOpen}
        onClose={() => setIsBookCallModalOpen(false)}
      />
    </div>
  );
};

export default Pricing;
