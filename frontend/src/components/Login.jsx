import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from './ui/card';
import { Menu } from 'lucide-react';
import SideMenu from './SideMenu';
import GoogleAuthButton from './GoogleAuthButton';
import './SideMenu.css';
import { BRAND } from '../config/branding';

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, loading: authLoading } = useAuth();


  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        // Redirect based on user role
        if (result.user.role === 'customer') {
          navigate('/');
        } else if (result.user.role === 'employee') {
          navigate('/employee');
        } else if (result.user.role === 'admin') {
          navigate('/admin');
        }
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9fafb] py-12 px-4">
      <Card className="w-full max-w-[440px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-4 md:p-8">
        <CardHeader className="space-y-6 pt-2 pb-8">
          <div className="flex justify-center">
            <Link to="/" className="flex items-center gap-2">
              <img src={BRAND.logoPath} alt={BRAND.logoAlt} className="h-10" />
              <span className="text-3xl font-bold tracking-tight text-[#0a0a0a]">{BRAND.name}</span>
            </Link>
          </div>
          <div className="space-y-2 text-center">
            <h1 className="text-[28px] font-bold tracking-tight text-[#1a1a1a]">Welcome back</h1>
            <p className="text-[#666666] text-[15px]">
              Sign in to your account to continue
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Google Sign-In Button */}
          <div className="space-y-4">
            <GoogleAuthButton mode="login" />

            {/* OR Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#f9fafb] px-2 text-gray-500">OR</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 text-sm font-medium text-red-800 bg-red-50 border border-red-100 rounded-xl">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[13px] font-bold text-[#4b5563] ml-1 uppercase tracking-wide">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="h-14 px-5 border-[#e5e7eb] bg-white text-base rounded-xl focus:ring-2 focus:ring-[#22c55e]/20 focus:border-[#22c55e]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" title="password" className="text-[13px] font-bold text-[#4b5563] ml-1 uppercase tracking-wide">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                className="h-14 px-5 border-[#e5e7eb] bg-white text-base rounded-xl focus:ring-2 focus:ring-[#22c55e]/20 focus:border-[#22c55e]"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-14 bg-[#22c55e] hover:bg-[#16a34a] text-white text-lg font-bold rounded-full shadow-[0_4px_14px_rgba(34,197,94,0.39)] transition-all active:scale-[0.98]"
              disabled={submitting}
            >
              {submitting ? 'Signing in...' : 'Continue'}
            </Button>
          </form>

          <div className="pt-2 text-center">
            <p className="text-[15px] text-[#666666]">
              Don't have an account?{' '}
              <Link to="/signup" className="text-[#22c55e] font-bold hover:underline ml-1">
                Sign up
              </Link>
            </p>
          </div>

          <p className="text-center text-[12px] text-[#999999] leading-relaxed px-4">
            By signing up, you agree to our{' '}
            <Link to="/terms" className="underline hover:text-[#666666]">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" className="underline hover:text-[#666666]">Privacy Policy</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
