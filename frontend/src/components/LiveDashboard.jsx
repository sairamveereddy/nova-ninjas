import React, { useState, useEffect } from 'react';
import {
    Users,
    FileText,
    Phone,
    Search,
    RefreshCcw,
    CheckCircle2,
    Briefcase,
    Edit2,
    X,
    Check
} from 'lucide-react';

const LiveDashboard = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('');
    const [activeTab, setActiveTab] = useState('all');

    // Edit Modal State
    const [editingUser, setEditingUser] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState('');
    const [updating, setUpdating] = useState(false);

    // Hardcoded production URL
    const API_BASE = "https://nova-ninjas-production.up.railway.app";
    const API_ENDPOINT = `${API_BASE}/api/admin/all-users-export?admin_key=jobninjas2025admin`;
    const UPDATE_ENDPOINT = `${API_BASE}/api/admin/update-user-plan`;

    const fetchData = async () => {
        try {
            const response = await fetch(API_ENDPOINT);
            if (!response.ok) throw new Error("Could not connect to database");
            const data = await response.json();
            setUsers(data.users || []);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleUpdatePlan = async () => {
        if (!editingUser || !selectedPlan) return;
        setUpdating(true);
        try {
            const response = await fetch(UPDATE_ENDPOINT, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    admin_key: "jobninjas2025admin",
                    user_id: editingUser.id,
                    plan: selectedPlan
                })
            });

            const result = await response.json();

            if (!response.ok) throw new Error(result.detail || "Failed to update plan");

            // Optimistic update
            setUsers(users.map(u =>
                u.id === editingUser.id
                    ? { ...u, plan: selectedPlan, byok_enabled: selectedPlan === 'free_byok' }
                    : u
            ));
            setEditingUser(null);
            alert(`Success: ${result.message || "User plan updated!"}`);
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setUpdating(false);
        }
    };

    const isSubscriber = (u) => u.plan && !['free', 'free_byok'].includes(u.plan);
    const isBYOK = (u) => u.plan === 'free_byok' || u.byok_enabled;
    const isFree = (u) => (!u.plan || u.plan === 'free') && !u.byok_enabled;

    const filteredUsers = users.filter(u => {
        // Text Search
        const matchesSearch = (
            (u.name && u.name.toLowerCase().includes(filter.toLowerCase())) ||
            (u.email && u.email.toLowerCase().includes(filter.toLowerCase()))
        );

        if (!matchesSearch) return false;

        // Tab Filter
        if (activeTab === 'subscribers') return isSubscriber(u);
        if (activeTab === 'byok') return isBYOK(u);
        if (activeTab === 'free') return isFree(u);
        return true;
    });

    const StatCard = ({ title, value, color, icon: Icon }) => (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-start">
                <div>
                    <span className="text-gray-500 text-sm font-medium uppercase tracking-wider">{title}</span>
                    <span className={`block text-3xl font-bold mt-2 ${color}`}>{value}</span>
                </div>
                {Icon && <Icon className={`w-8 h-8 opacity-20 ${color}`} />}
            </div>
        </div>
    );

    const getPlanBadge = (u) => {
        if (isSubscriber(u)) return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold">PRO ({u.plan})</span>;
        if (isBYOK(u)) return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold">BYOK</span>;
        return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">Free</span>;
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <div className="text-slate-400 text-sm">Loading Live Dashboard...</div>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen p-8 bg-slate-50 flex justify-center">
            <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg text-center">
                <h2 className="text-xl font-bold text-gray-800 mb-2">Connection Issue</h2>
                <p className="text-gray-600 mb-6">{error}</p>
                <button onClick={fetchData} className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Retry Connection</button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
                            JobNinjas Admin <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">v2.1</span>
                        </h1>
                        <p className="text-slate-500 mt-1">Real-time user management & analytics</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Live
                        </span>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard title="Total Users" value={users.length} color="text-slate-900" icon={Users} />
                    <StatCard title="Subscribers" value={users.filter(isSubscriber).length} color="text-purple-600" icon={CheckCircle2} />
                    <StatCard title="BYOK Users" value={users.filter(isBYOK).length} color="text-amber-600" icon={RefreshCcw} />
                    <StatCard
                        title="Applications"
                        value={users.reduce((acc, curr) => acc + (curr.jobs_applied || 0), 0)}
                        color="text-green-600"
                        icon={Briefcase}
                    />
                </div>

                {/* Main Content Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Tabs & Search Header */}
                    <div className="p-4 border-b border-gray-100 bg-white flex flex-col md:flex-row justify-between gap-4 items-center">
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            {[
                                { id: 'all', label: 'All Users' },
                                { id: 'subscribers', label: 'Subscribers' },
                                { id: 'byok', label: 'BYOK' },
                                { id: 'free', label: 'Free' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === tab.id
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-sm"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/50 text-left border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User Profile</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Resume</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Activity</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stats</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.map((user, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/80 transition group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 min-w-[2.5rem] rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 flex items-center justify-center text-slate-600 font-bold text-sm">
                                                    {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                                                </div>
                                                <div className="ml-3 overflow-hidden">
                                                    <div className="text-sm font-semibold text-gray-900 truncate max-w-[150px]">{user.name || 'Unknown'}</div>
                                                    <div className="text-xs text-gray-500 truncate max-w-[150px]">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 items-start">
                                                {getPlanBadge(user)}
                                                {user.phone !== 'N/A' && (
                                                    <span className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                                        <Phone className="w-3 h-3" /> {user.phone}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.has_resume === 'Yes' ? (
                                                <a
                                                    href={user.resume_url || '#'}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition border border-blue-100"
                                                >
                                                    <FileText className="w-3.5 h-3.5" />
                                                    View Resume
                                                </a>
                                            ) : (
                                                <span className="text-gray-400 text-sm">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className={`text-sm font-bold ${user.jobs_applied > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                                    {user.jobs_applied || 0} Apps
                                                </span>
                                                <span className="text-xs text-gray-500">Last: {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{user.target_role !== 'N/A' ? user.target_role : '-'}</div>
                                            <div className="text-xs text-gray-500">{user.years_experience !== 'N/A' ? `${user.years_experience} YOE` : ''}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => {
                                                    setEditingUser(user);
                                                    setSelectedPlan(user.plan || 'free');
                                                }}
                                                className="text-gray-400 hover:text-blue-600 transition p-2 rounded-full hover:bg-blue-50"
                                                title="Edit User Plan"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredUsers.length === 0 && (
                            <div className="p-12 text-center text-gray-500 bg-white">
                                <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p>No users found matching this filter.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Edit Modal */}
                {editingUser && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h3 className="text-lg font-bold text-gray-900">Manage User Access</h3>
                                <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6">
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-500 mb-1">User</label>
                                    <div className="text-base font-semibold text-gray-900">{editingUser.email}</div>
                                    <div className="text-sm text-gray-500">{editingUser.name}</div>
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-gray-700">Assign Plan</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {[
                                            { id: 'free', name: 'Free Tier', desc: 'Basic access' },
                                            { id: 'free_byok', name: 'BYOK (Unlocked)', desc: 'User brings own API key' },
                                            { id: 'ai-monthly', name: 'AI Ninja Pro', desc: 'Unlimited AI apps' },
                                            { id: 'human-starter', name: 'Human Starter', desc: 'Manual application service' }
                                        ].map(plan => (
                                            <button
                                                key={plan.id}
                                                onClick={() => setSelectedPlan(plan.id)}
                                                className={`flex items-center justify-between p-3 rounded-lg border transition-all text-left ${selectedPlan === plan.id
                                                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div>
                                                    <div className={`font-semibold ${selectedPlan === plan.id ? 'text-blue-700' : 'text-gray-900'}`}>{plan.name}</div>
                                                    <div className="text-xs text-gray-500">{plan.desc}</div>
                                                </div>
                                                {selectedPlan === plan.id && <Check className="w-4 h-4 text-blue-600" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end">
                                <button
                                    onClick={() => setEditingUser(null)}
                                    className="px-4 py-2 text-gray-600 font-medium hover:text-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdatePlan}
                                    disabled={updating}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {updating ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default LiveDashboard;
