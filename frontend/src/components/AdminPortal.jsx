import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { API_URL, apiCall } from '../config/api';
import {
    Users, UserPlus, FileText, Send, Search, CheckCircle, XCircle, Edit, Save, Loader2, Phone, MessageSquare, Briefcase, TrendingUp, Shield, Lock, LayoutDashboard
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminPortal = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const [stats, setStats] = useState(null);
    const [jobStats, setJobStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('overview');

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === '1010') {
            setIsAuthenticated(true);
            setError('');
        } else {
            setError('Incorrect password');
        }
    };

    const fetchData = async () => {
        if (!isAuthenticated) return;

        try {
            setLoading(true);
            const [statsData, usersData, bookingsData, messagesData, jStatsData] = await Promise.all([
                apiCall('/api/admin/stats'),
                apiCall('/api/admin/users?limit=200'),
                apiCall('/api/admin/call-bookings'),
                apiCall('/api/admin/contact-messages'),
                apiCall('/api/admin/job-stats')
            ]);

            setStats(statsData);
            setUsers(usersData);
            setBookings(bookingsData);
            setMessages(messagesData);
            setJobStats(jStatsData);
        } catch (error) {
            console.error("Failed to fetch admin data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchData();
        }
    }, [isAuthenticated]);

    const handleUpdatePlan = async (userEmail, newPlan) => {
        try {
            await apiCall(`/api/admin/users/${userEmail}`, {
                method: 'PUT',
                body: JSON.stringify({ plan: newPlan })
            });
            // Refresh users
            setUsers(users.map(u => u.email === userEmail ? { ...u, plan: newPlan } : u));
        } catch (error) {
            alert("Failed to update plan");
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const today = new Date().toISOString().split('T')[0];
    const todayUsers = users.filter(u => u.created_at && u.created_at.startsWith(today));

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-indigo-600">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                            <Shield className="h-8 w-8 text-indigo-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Admin Secure Gate</CardTitle>
                        <CardDescription>Enter password to access the portal</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    type="password"
                                    placeholder="Enter Admin Password"
                                    className="text-center text-lg tracking-widest"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoFocus
                                />
                                {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}
                            </div>
                            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-lg py-6 h-auto">
                                <Lock className="mr-2 h-5 w-5" /> Unlock Portal
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-lg">
                            <LayoutDashboard className="h-5 w-5 text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Admin<span className="text-indigo-600">Portal</span></h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading} className="text-slate-600">
                            <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <div className="h-6 w-px bg-slate-200"></div>
                        <span className="text-sm font-medium text-slate-600">{user?.name} (Admin)</span>
                        <Button variant="outline" size="sm" onClick={() => logout()} className="text-red-600 border-red-100 hover:bg-red-50">
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                <Tabs defaultValue="overview" onValueChange={setActiveTab}>
                    <TabsList className="bg-white border p-1 mb-8 shadow-sm rounded-xl h-auto">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 px-6 py-2.5 rounded-lg font-semibold">Overview</TabsTrigger>
                        <TabsTrigger value="users" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 px-6 py-2.5 rounded-lg font-semibold">All Users</TabsTrigger>
                        <TabsTrigger value="today" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 px-6 py-2.5 rounded-lg font-semibold">Today's Users</TabsTrigger>
                        <TabsTrigger value="requests" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 px-6 py-2.5 rounded-lg font-semibold">Call Requests</TabsTrigger>
                        <TabsTrigger value="messages" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 px-6 py-2.5 rounded-lg font-semibold">Messages</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <Card className="border-none shadow-sm bg-white overflow-hidden">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-slate-500">Total Users</p>
                                        <Users className="h-5 w-5 text-indigo-500" />
                                    </div>
                                    <h3 className="text-3xl font-bold">{stats?.total_users || 0}</h3>
                                </CardHeader>
                                <div className="h-1 bg-indigo-500 w-full opacity-20"></div>
                            </Card>

                            <Card className="border-none shadow-sm bg-white overflow-hidden">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-slate-500">Last 24h Reg</p>
                                        <UserPlus className="h-5 w-5 text-green-500" />
                                    </div>
                                    <h3 className="text-3xl font-bold">+{stats?.new_users_24h || 0}</h3>
                                </CardHeader>
                                <div className="h-1 bg-green-500 w-full opacity-20"></div>
                            </Card>

                            <Card className="border-none shadow-sm bg-white overflow-hidden">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-slate-500">Resumes/Apps</p>
                                        <FileText className="h-5 w-5 text-orange-500" />
                                    </div>
                                    <h3 className="text-3xl font-bold">{stats?.total_resumes_tailored || 0} / {stats?.total_jobs_applied || 0}</h3>
                                </CardHeader>
                                <div className="h-1 bg-orange-500 w-full opacity-20"></div>
                            </Card>

                            <Card className="border-none shadow-sm bg-white overflow-hidden">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-slate-500">Call Success</p>
                                        <Phone className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <h3 className="text-3xl font-bold">{bookings.length}</h3>
                                </CardHeader>
                                <div className="h-1 bg-blue-500 w-full opacity-20"></div>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* User Visualization */}
                            <Card className="border-none shadow-sm bg-white">
                                <CardHeader>
                                    <CardTitle className="text-lg">Subscription Mix</CardTitle>
                                    <CardDescription>Free vs Paid users distribution</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between text-sm mb-1">
                                            <span className="font-medium">User Distribution</span>
                                            <span className="text-slate-500">
                                                {stats?.subscription_stats?.pro || 0} Paid • {stats?.subscription_stats?.free || 0} Free
                                            </span>
                                        </div>
                                        <div className="h-10 w-full bg-slate-100 rounded-full flex overflow-hidden border">
                                            <div
                                                className="bg-indigo-600 h-full flex items-center justify-center text-white text-xs font-bold transition-all duration-1000"
                                                style={{ width: `${(stats?.subscription_stats?.pro / stats?.total_users) * 100 || 0}%` }}
                                            >
                                                {Math.round((stats?.subscription_stats?.pro / stats?.total_users) * 100) || 0}% PRO
                                            </div>
                                            <div
                                                className="bg-slate-300 h-full flex items-center justify-center text-slate-700 text-xs font-bold"
                                                style={{ width: `${(stats?.subscription_stats?.free / stats?.total_users) * 100 || 100}%` }}
                                            >
                                                FREE
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mt-8">
                                            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                                                <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-1">Conversion Rate</p>
                                                <p className="text-2xl font-black text-indigo-900">
                                                    {((stats?.subscription_stats?.pro / stats?.total_users) * 100).toFixed(1)}%
                                                </p>
                                            </div>
                                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">New Today</p>
                                                <p className="text-2xl font-black text-slate-900">{todayUsers.length}</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Job Stats */}
                            <Card className="border-none shadow-sm bg-white">
                                <CardHeader>
                                    <CardTitle className="text-lg">Job Engine (24h)</CardTitle>
                                    <CardDescription>New jobs pulled automatically</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-100 rounded-xl">
                                            <div className="bg-green-500 p-3 rounded-xl shadow-lg shadow-green-200">
                                                <TrendingUp className="h-6 w-6 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-green-800">Total New Jobs</p>
                                                <p className="text-3xl font-black text-green-900">{jobStats?.total_24h || 0}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="border border-slate-100 p-4 rounded-xl hover:bg-slate-50 transition-colors">
                                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Adzuna</p>
                                                <p className="text-xl font-bold">{jobStats?.sources?.adzuna || 0}</p>
                                            </div>
                                            <div className="border border-slate-100 p-4 rounded-xl hover:bg-slate-50 transition-colors">
                                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">JSearch</p>
                                                <p className="text-xl font-bold">{jobStats?.sources?.jsearch || 0}</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="users">
                        <Card className="border-none shadow-sm bg-white">
                            <CardHeader className="border-b">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <CardTitle>User Management</CardTitle>
                                        <CardDescription>Manage subscriptions and check user activity</CardDescription>
                                    </div>
                                    <div className="relative w-full md:w-80">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input
                                            placeholder="Filter by name or email..."
                                            className="pl-10"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                                            <tr>
                                                <th className="px-6 py-4">User Details</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4 text-center">Applications</th>
                                                <th className="px-6 py-4">Subscription</th>
                                                <th className="px-6 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredUsers.map((u) => (
                                                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold text-slate-900">{u.name}</p>
                                                        <p className="text-xs text-slate-500">{u.email}</p>
                                                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tight">Joined {new Date(u.created_at).toLocaleDateString()}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {u.is_verified ? (
                                                            <Badge className="bg-green-100 text-green-700 border-none shadow-none">Verified</Badge>
                                                        ) : (
                                                            <Badge className="bg-yellow-100 text-yellow-700 border-none shadow-none">Unverified</Badge>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold text-slate-700">{u.applications_count || 0}</td>
                                                    <td className="px-6 py-4">
                                                        <Badge className={u.plan === 'pro' || u.plan === 'unlimited' ? 'bg-indigo-600 text-white border-none' : 'bg-slate-200 text-slate-700 border-none'}>
                                                            {u.plan?.toUpperCase() || 'FREE'}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant={u.plan === 'pro' ? 'outline' : 'default'}
                                                                className={u.plan !== 'pro' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
                                                                onClick={() => handleUpdatePlan(u.email, u.plan === 'pro' ? 'free' : 'pro')}
                                                            >
                                                                Set {u.plan === 'pro' ? 'Free' : 'Pro'}
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="today">
                        <Card className="border-none shadow-sm bg-white">
                            <CardHeader>
                                <CardTitle>New Registrations (Today)</CardTitle>
                                <CardDescription>{todayUsers.length} users signed up today</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                                            <tr>
                                                <th className="px-6 py-4">Name</th>
                                                <th className="px-6 py-4">Email</th>
                                                <th className="px-6 py-4">Time</th>
                                                <th className="px-6 py-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {todayUsers.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" className="p-12 text-center text-slate-400 italic">No new users today yet.</td>
                                                </tr>
                                            ) : (
                                                todayUsers.map((u) => (
                                                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                                                        <td className="px-6 py-4 font-bold">{u.name}</td>
                                                        <td className="px-6 py-4 text-slate-600">{u.email}</td>
                                                        <td className="px-6 py-4">{new Date(u.created_at).toLocaleTimeString()}</td>
                                                        <td className="px-6 py-4">
                                                            <Badge className="bg-green-100 text-green-700 border-none">NEW</Badge>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="requests">
                        <Card className="border-none shadow-sm bg-white">
                            <CardHeader>
                                <CardTitle>Call Consultations</CardTitle>
                                <CardDescription>Users who requested a 1:1 call</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                                            <tr>
                                                <th className="px-6 py-4">Contact</th>
                                                <th className="px-6 py-4">Phone</th>
                                                <th className="px-6 py-4">Experience</th>
                                                <th className="px-6 py-4">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {bookings.map((b) => (
                                                <tr key={b._id} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold">{b.name}</p>
                                                        <p className="text-xs text-slate-500">{b.email}</p>
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-slate-700">{b.mobile}</td>
                                                    <td className="px-6 py-4"><Badge variant="outline">{b.years_of_experience}y Exp</Badge></td>
                                                    <td className="px-6 py-4 text-slate-500">{new Date(b.created_at).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="messages">
                        <Card className="border-none shadow-sm bg-white">
                            <CardHeader>
                                <CardTitle>Contact Form Messages</CardTitle>
                                <CardDescription>Inquiries from the contact page</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {messages.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400 italic">No messages found.</div>
                                ) : (
                                    messages.map((m) => (
                                        <div key={m._id} className="p-6 border rounded-2xl hover:border-indigo-200 transition-colors bg-white">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h4 className="font-bold text-slate-900">{m.name || 'Anonymous'}</h4>
                                                    <p className="text-sm text-slate-500">{m.email}</p>
                                                </div>
                                                <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{new Date(m.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 italic">"{m.message}"</p>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
};

export default AdminPortal;
