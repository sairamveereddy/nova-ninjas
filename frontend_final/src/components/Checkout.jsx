import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { 
  CreditCard, 
  Check, 
  Shield, 
  Loader2, 
  ArrowLeft,
  Bot,
  UserCheck,
  Sparkles,
  Menu
} from 'lucide-react';
import { BRAND, PRICING } from '../config/branding';
import { API_URL } from '../config/api';
import SideMenu from './SideMenu';
import './SideMenu.css';

// Razorpay Key (loaded from environment or hardcoded for test)
const RAZORPAY_KEY_ID = process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_S0Eqy9YzsfDlZh';

const Checkout = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'success' | 'failed' | null
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  // Get plan from URL params
  const planId = searchParams.get('plan') || 'ai-pro';
  
  // Plan details mapping
  const planDetails = {
    'ai-free': {
      ...PRICING.AI_FREE,
      icon: Bot,
      color: 'green'
    },
    'ai-pro': {
      ...PRICING.AI_PRO,
      icon: Bot,
      color: 'green'
    },
    'human-starter': {
      ...PRICING.HUMAN_STARTER,
      icon: UserCheck,
      color: 'blue'
    },
    'human-growth': {
      ...PRICING.HUMAN_GROWTH,
      icon: UserCheck,
      color: 'blue'
    },
    'human-scale': {
      ...PRICING.HUMAN_SCALE,
      icon: UserCheck,
      color: 'blue'
    }
  };

  const selectedPlan = planDetails[planId] || planDetails['ai-pro'];
  const PlanIcon = selectedPlan.icon;

  // Load Razorpay script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Handle payment
  const handlePayment = async () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout?plan=' + planId);
      return;
    }

    // Free plan - just activate
    if (selectedPlan.price === 0) {
      setPaymentStatus('success');
      setTimeout(() => navigate('/dashboard'), 2000);
      return;
    }

    setIsLoading(true);

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert('Failed to load payment gateway. Please try again.');
        setIsLoading(false);
        return;
      }

      // Create order on backend (use INR for Razorpay test mode)
      const response = await fetch(`${API_URL}/api/razorpay/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: planId,
          user_email: user?.email || 'test@example.com',
          currency: 'INR'
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error('Failed to create order');
      }

      if (data.free) {
        setPaymentStatus('success');
        setIsLoading(false);
        return;
      }

      // Open Razorpay checkout
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: data.order.currency,
        name: BRAND.name,
        description: data.order.plan_description,
        order_id: data.order.order_id,
        handler: async function (response) {
          // Verify payment on backend
          try {
            const verifyResponse = await fetch(`${API_URL}/api/razorpay/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan_id: planId,
                user_email: user?.email || 'test@example.com'
              })
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              setPaymentStatus('success');
              setTimeout(() => navigate('/dashboard'), 3000);
            } else {
              setPaymentStatus('failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            setPaymentStatus('failed');
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#22c55e' // Job Ninjas green
        },
        modal: {
          ondismiss: function () {
            setIsLoading(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      setIsLoading(false);

    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
      setIsLoading(false);
    }
  };

  // Success screen
  if (paymentStatus === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-6">
              Your {selectedPlan.name} plan is now active. Redirecting to dashboard...
            </p>
            <Button onClick={() => navigate('/dashboard')} className="w-full bg-green-600 hover:bg-green-700">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Failed screen
  if (paymentStatus === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">❌</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
            <p className="text-gray-600 mb-6">
              Something went wrong with your payment. Please try again.
            </p>
            <div className="space-y-3">
              <Button onClick={() => setPaymentStatus(null)} className="w-full bg-green-600 hover:bg-green-700">
                Try Again
              </Button>
              <Button variant="outline" onClick={() => navigate('/pricing')} className="w-full">
                Back to Pricing
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Side Menu */}
      <SideMenu isOpen={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />

      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSideMenuOpen(true)} 
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <button onClick={() => navigate('/')} className="flex items-center gap-2">
              <img src={BRAND.logoPath} alt={BRAND.logoAlt} className="h-8" />
              <span className="text-xl font-bold text-green-600">{BRAND.name}</span>
            </button>
          </div>
          <Button variant="ghost" onClick={() => navigate('/pricing')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Pricing
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Order Summary */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Complete Your Purchase</h1>
            
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedPlan.color === 'green' ? 'bg-green-100' : 'bg-blue-100'
                  }`}>
                    <PlanIcon className={`w-6 h-6 ${
                      selectedPlan.color === 'green' ? 'text-green-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <CardTitle>{selectedPlan.name}</CardTitle>
                    <CardDescription>{selectedPlan.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {selectedPlan.features?.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Test Mode Badge */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-yellow-800">
                <Sparkles className="w-5 h-5" />
                <span className="font-semibold">Test Mode</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                This is a test payment. Use card number <code className="bg-yellow-100 px-1 rounded">4111 1111 1111 1111</code> with any future expiry and CVV.
              </p>
            </div>
          </div>

          {/* Payment Section */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Price Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">{selectedPlan.name}</span>
                    <span className="font-semibold">{selectedPlan.priceDisplay}{selectedPlan.period}</span>
                  </div>
                  {selectedPlan.period && (
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>Billing</span>
                      <span>{selectedPlan.period === '/month' ? 'Monthly' : 'One-time'}</span>
                    </div>
                  )}
                  <hr className="my-3" />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-green-600">
                      {selectedPlan.price === 0 ? 'Free' : selectedPlan.priceDisplay}
                    </span>
                  </div>
                </div>

                {/* Pay Button */}
                <Button 
                  onClick={handlePayment} 
                  disabled={isLoading}
                  className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : selectedPlan.price === 0 ? (
                    'Activate Free Plan'
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Pay with Razorpay
                    </>
                  )}
                </Button>

                {/* Security Note */}
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Shield className="w-4 h-4" />
                  <span>Secured by Razorpay</span>
                </div>

                {/* Trust Badges */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl">🔒</div>
                    <p className="text-xs text-gray-500">Secure Payment</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl">💳</div>
                    <p className="text-xs text-gray-500">All Cards Accepted</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl">🇮🇳</div>
                    <p className="text-xs text-gray-500">UPI & Netbanking</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Disclaimer */}
            <p className="text-xs text-gray-500 mt-4 text-center">
              By completing this purchase, you agree to our Terms of Service and Privacy Policy.
              {selectedPlan.period === '/month' && ' You can cancel anytime from your dashboard.'}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Checkout;

