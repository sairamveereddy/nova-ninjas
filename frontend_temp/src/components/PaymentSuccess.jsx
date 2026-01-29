import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { CheckCircle } from 'lucide-react';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Log successful payment for analytics
    console.log('Payment successful, session ID:', sessionId);
  }, [sessionId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Thank you for subscribing to Nova Ninjas! Your subscription is now active.
          </p>
          <p className="text-sm text-gray-500">
            You'll receive a confirmation email shortly with your subscription details.
          </p>
          <div className="pt-4">
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </div>
          <p className="text-xs text-gray-400">
            Session ID: {sessionId}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
