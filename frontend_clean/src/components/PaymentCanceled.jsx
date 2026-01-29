import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { XCircle } from 'lucide-react';

const PaymentCanceled = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Payment Canceled</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Your payment was canceled. No charges were made.
          </p>
          <p className="text-sm text-gray-500">
            You can try again anytime or contact support if you need help.
          </p>
          <div className="pt-4 space-y-2">
            <Button onClick={() => navigate('/pricing')} className="w-full">
              View Plans Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')} 
              className="w-full"
            >
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCanceled;
