import React, { useState, useEffect } from 'react';

const LiveDashboard = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('');

    // Hardcoded production URL
    const API_ENDPOINT = "https://nova-ninjas-production.up.railway.app/api/admin/all-users-export?admin_key=jobninjas2025admin";

    useEffect(() => {
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

        fetchData();

        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const filteredUsers = users.filter(u =>
        (u.name && u.name.toLowerCase().includes(filter.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(filter.toLowerCase()))
    );

    const StatCard = ({ title, value, color }) => (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
            <span className="text-gray-500 text-sm font-medium uppercase tracking-wider">{title}</span>
            <span className={`text-3xl font-bold mt-2 ${color}`}>{value}</span>
        </div>
    );

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <div className="text-slate-400 text-sm">Loading Dashboard...</div>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen p-8 bg-slate-50 flex justify-center">
            <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg text-center">
                <h2 className="text-xl font-bold text-gray-800 mb-2">Connection Issue</h2>
                <p className="text-gray-600 mb-6">{error}</p>
                <a
                    href={API_ENDPOINT}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                >
                    Open Raw Data (Backup)
                </a>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Live User Dashboard</h1>
                        <p className="text-slate-500 mt-1">Real-time database view • Auto-refreshes every 30s</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            System Online
                        </span>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard title="Total Users" value={users.length} color="text-slate-900" />
                    <StatCard title="Resumes Uploaded" value={users.filter(u => u.has_resume === 'Yes').length} color="text-blue-600" />
                    <StatCard title="Phone Numbers" value={users.filter(u => u.phone !== 'N/A').length} color="text-purple-600" />
                    <StatCard title="Customers" value={users.filter(u => u.role === 'customer').length} color="text-green-600" />
                </div>

                {/* Search & List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            className="w-full max-w-md px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 text-left">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Target</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.map((user, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                                    {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{user.name || 'Unknown'}</div>
                                                    <div className="text-xs text-gray-500">Joined: {new Date(user.created_at).toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <a href={`mailto:${user.email}`} className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2">
                                                    ✉️ {user.email}
                                                </a>
                                                {user.phone !== 'N/A' && (
                                                    <a href={`tel:${user.phone}`} className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2">
                                                        📞 {user.phone}
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-2">
                                                {user.has_resume === 'Yes' ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 w-fit">
                                                        📄 Resume
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 w-fit">
                                                        No Resume
                                                    </span>
                                                )}
                                                <span className="text-xs text-gray-500 capitalize">{user.role}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{user.target_role !== 'N/A' ? user.target_role : '-'}</div>
                                            <div className="text-xs text-gray-500">{user.years_experience !== 'N/A' ? `${user.years_experience} YOE` : ''}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveDashboard;
