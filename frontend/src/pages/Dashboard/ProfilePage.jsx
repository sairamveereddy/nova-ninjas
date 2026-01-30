import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { User, Mail, Shield, Zap, Settings, CreditCard } from 'lucide-react';

const ProfilePage = () => {
    const { user } = useAuth();

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8">
            <div className="flex items-center gap-6 mb-12">
                <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                    <User className="w-12 h-12 text-green-600" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{user?.name || 'User Profile'}</h1>
                    <p className="text-gray-500 flex items-center gap-1.5 mt-1">
                        <Mail className="w-4 h-4" /> {user?.email}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 border-none shadow-sm flex flex-col items-center text-center">
                    <div className="p-3 bg-blue-50 rounded-xl mb-4 text-blue-600">
                        <Shield className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-gray-900">Current Plan</h3>
                    <p className="text-sm text-gray-500 mb-4">You are on the Free tier</p>
                    <Badge className="bg-blue-100 text-blue-600 border-none mb-6">Beginner</Badge>
                    <Button variant="outline" className="w-full">Upgrade</Button>
                </Card>

                <Card className="p-6 border-none shadow-sm flex flex-col items-center text-center text-green-600">
                    <div className="p-3 bg-green-50 rounded-xl mb-4">
                        <Zap className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-gray-900">AI Tokens</h3>
                    <p className="text-sm text-gray-500 mb-4">Monthly limit usage</p>
                    <div className="text-2xl font-black mb-1">45/100</div>
                    <p className="text-xs text-gray-400">Resets in 12 days</p>
                </Card>

                <Card className="p-6 border-none shadow-sm flex flex-col items-center text-center">
                    <div className="p-3 bg-gray-50 rounded-xl mb-4 text-gray-600">
                        <Settings className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-gray-900">Account Security</h3>
                    <p className="text-sm text-gray-500 mb-6">Last login: Today</p>
                    <Button variant="outline" className="w-full">Change Password</Button>
                </Card>
            </div>

            <Card className="border-none shadow-sm">
                <CardHeader className="border-b border-gray-50">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <CreditCard className="w-5 h-5" /> Billing History
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="p-12 text-center text-gray-400">
                        No transactions found.
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ProfilePage;
