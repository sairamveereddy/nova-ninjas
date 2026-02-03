import React, { useState, useEffect } from 'react';
import { API_URL } from '../config/api';
import { Download, Users, Mail, Phone, Briefcase } from 'lucide-react';

const AllUsersExport = () => {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAllUsers();
    }, []);

    const fetchAllUsers = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/admin/all-users-export`);
            if (!response.ok) throw new Error('Failed to fetch user data');
            const data = await response.json();
            setUserData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const downloadCSV = () => {
        if (!userData || !userData.users) return;

        const headers = [
            'Name', 'Email', 'Phone', 'Role', 'Target Role', 'Years Exp',
            'Visa Status', 'Remote Pref', 'Has Resume', 'Latest Job Title',
            'Employment Count', 'Highest Education', 'Created At'
        ];

        const csvContent = [
            headers.join(','),
            ...userData.users.map(user => [
                `"${user.name}"`,
                user.email,
                user.phone,
                user.role,
                `"${user.target_role}"`,
                user.years_experience,
                user.visa_status,
                user.remote_preference,
                user.has_resume,
                `"${user.latest_job_title}"`,
                user.employment_count,
                `"${user.highest_education}"`,
                user.created_at
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jobninjas_users_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading user data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
                    <h3 className="text-red-800 font-semibold mb-2">Error Loading Data</h3>
                    <p className="text-red-600">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Users className="w-6 h-6 text-primary" />
                                All Users Export
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Total: <strong>{userData?.total_users || 0}</strong> users |
                                Generated: {userData?.generated_at ? new Date(userData.generated_at).toLocaleString() : 'N/A'}
                            </p>
                        </div>
                        <button
                            onClick={downloadCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                        >
                            <Download className="w-4 h-4" />
                            Download CSV
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Users</p>
                                <p className="text-2xl font-bold">{userData?.total_users || 0}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <Briefcase className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">With Resumes</p>
                                <p className="text-2xl font-bold">
                                    {userData?.users?.filter(u => u.has_resume === 'Yes').length || 0}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <Phone className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">With Phone</p>
                                <p className="text-2xl font-bold">
                                    {userData?.users?.filter(u => u.phone !== 'N/A').length || 0}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                <Mail className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Customers</p>
                                <p className="text-2xl font-bold">
                                    {userData?.users?.filter(u => u.role === 'customer').length || 0}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* User Table */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Email</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Phone</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Target Role</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Experience</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Resume</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Latest Job</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {userData?.users?.map((user, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">{user.name}</div>
                                            <div className="text-xs text-gray-500">{user.role}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <a href={`mailto:${user.email}`} className="text-primary hover:underline text-sm">
                                                {user.email}
                                            </a>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {user.phone !== 'N/A' ? (
                                                <a href={`tel:${user.phone}`} className="text-gray-900 hover:text-primary">
                                                    {user.phone}
                                                </a>
                                            ) : (
                                                <span className="text-gray-400">N/A</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">{user.target_role}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900">{user.years_experience}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${user.has_resume === 'Yes'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {user.has_resume}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{user.latest_job_title}</td>
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

export default AllUsersExport;
