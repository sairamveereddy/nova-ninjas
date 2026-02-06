import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { API_URL, apiCall } from '../config/api';
import {
    Users, UserPlus, FileText, Send, Search, CheckCircle, XCircle, Edit, Save, Loader2
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        total_users: 0,
        new_users_24h: 0,
        total_resumes_tailored: 0,
        total_jobs_applied: 0
    });
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [statsData, usersData] = await Promise.all([
                apiCall('/api/admin/stats'),
                apiCall('/api/admin/users?limit=100')
            ]);
            setStats(statsData);
            setUsers(usersData);
        } catch (error) {
            console.error("Failed to fetch admin data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleUpdateUser = async () => {
        if (!editingUser) return;

        try {
            await apiCall(`/api/admin/users/${editingUser.email}`, {
                method: 'PUT',
                body: JSON.stringify({
                    plan: editingUser.plan,
                    is_verified: editingUser.is_verified,
                    role: editingUser.role
                })
            });

            // Refresh local state
            setUsers(users.map(u => u.email === editingUser.email ? editingUser : u));
            setEditingUser(null);
        } catch (error) {
            alert("Failed to update user: " + error.message);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Derived recent activity from users list
    const recentActivity = users.slice(0, 5).map(u => ({
        id: u.id,
        user: u.name,
        action: "Joined Platform",
        time: new Date(u.created_at).toLocaleDateString()
    }));

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Admin Overview</h2>
                    <p className="text-muted-foreground mt-1">Manage users, track growth, and monitor platform usage.</p>
                </div>
                <Button onClick={fetchData} variant="outline" size="sm" className="gap-2">
                    <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Data
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <Users className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total_users}</div>
                        <p className="text-xs text-muted-foreground mt-1">Lifetime registrations</p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">New Users (24h)</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                            <UserPlus className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.new_users_24h}</div>
                        <p className="text-xs text-muted-foreground mt-1">Since yesterday</p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Resumes Tailored</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                            <FileText className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total_resumes_tailored}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total documents generated</p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Jobs Applied</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                            <Send className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total_jobs_applied}</div>
                        <p className="text-xs text-muted-foreground mt-1">Applications tracked</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Users Table */}
                <Card className="col-span-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>User Management</CardTitle>
                                <DialogDescription className="mt-1">
                                    View and manage user accounts and permissions.
                                </DialogDescription>
                            </div>
                            <div className="relative w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or email..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground">
                                    <tr>
                                        <th className="p-4 font-medium">User</th>
                                        <th className="p-4 font-medium">Plan</th>
                                        <th className="p-4 font-medium">Status</th>
                                        <th className="p-4 font-medium">Activity</th>
                                        <th className="p-4 font-medium">Joined</th>
                                        <th className="p-4 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                    <p className="text-muted-foreground">Loading users...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                                No users found matching your search.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((user) => (
                                            <tr key={user.id} className="border-t hover:bg-muted/50 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-medium text-gray-900">{user.name}</div>
                                                    <div className="text-xs text-muted-foreground">{user.email}</div>
                                                    <div className="flex gap-1 mt-1">
                                                        <Badge variant="outline" className="text-[10px] uppercase">{user.role}</Badge>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <Badge className={user.plan === 'pro' || user.plan === 'unlimited' ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'}>
                                                        {user.plan || 'Free'}
                                                    </Badge>
                                                </td>
                                                <td className="p-4">
                                                    {user.is_verified ? (
                                                        <div className="flex items-center text-green-600 gap-1.5 bg-green-50 w-fit px-2 py-1 rounded-full text-xs font-medium">
                                                            <CheckCircle className="h-3.5 w-3.5" /> Verified
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center text-yellow-600 gap-1.5 bg-yellow-50 w-fit px-2 py-1 rounded-full text-xs font-medium">
                                                            <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" /> Pending
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-xs space-y-1">
                                                        <div className="flex items-center gap-2 text-gray-600">
                                                            <FileText className="h-3 w-3" /> {user.resumes_count} Resumes
                                                        </div>
                                                        <div className="flex items-center gap-2 text-gray-600">
                                                            <Send className="h-3 w-3" /> {user.applications_count} Apps
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">
                                                    {new Date(user.created_at).toLocaleDateString()}
                                                    <div className="text-[10px]">{new Date(user.created_at).toLocaleTimeString()}</div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setEditingUser(user)}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity / Side Panel */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Recent Registration</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-8">
                                {recentActivity.map((activity, i) => (
                                    <div key={i} className="flex items-center">
                                        <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                            <UserPlus className="h-4 w-4 text-slate-500" />
                                        </div>
                                        <div className="ml-4 space-y-1">
                                            <p className="text-sm font-medium leading-none">{activity.user}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {activity.action} • {activity.time}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {recentActivity.length === 0 && (
                                    <div className="text-center text-muted-foreground text-sm py-4">No recent activity</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
                        <CardHeader>
                            <CardTitle className="text-indigo-900">Admin Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button variant="outline" className="w-full justify-start bg-white hover:bg-indigo-50 border-indigo-200 text-indigo-700">
                                <FileText className="mr-2 h-4 w-4" /> Export All Users CSV
                            </Button>
                            <Button variant="outline" className="w-full justify-start bg-white hover:bg-indigo-50 border-indigo-200 text-indigo-700">
                                <Send className="mr-2 h-4 w-4" /> Send Bulk Email
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Edit User Modal */}
            <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User: {editingUser?.name}</DialogTitle>
                        <DialogDescription>
                            Manage subscription plan and account status.
                        </DialogDescription>
                    </DialogHeader>

                    {editingUser && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Plan</Label>
                                <Select
                                    value={editingUser.plan}
                                    onValueChange={(val) => setEditingUser({ ...editingUser, plan: val })}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select plan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="free">Free</SelectItem>
                                        <SelectItem value="pro">Pro</SelectItem>
                                        <SelectItem value="unlimited">Unlimited</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Verified</Label>
                                <div className="col-span-3">
                                    <Switch
                                        checked={editingUser.is_verified}
                                        onCheckedChange={(checked) => setEditingUser({ ...editingUser, is_verified: checked })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Role</Label>
                                <Select
                                    value={editingUser.role}
                                    onValueChange={(val) => setEditingUser({ ...editingUser, role: val })}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="customer">Customer</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
                        <Button onClick={handleUpdateUser}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminDashboard;
