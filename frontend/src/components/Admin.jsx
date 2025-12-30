import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardContent, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { API_URL } from '../config/api';
import { 
  Shield, LogOut, Users, Target, CreditCard, Phone, Mail,
  TrendingUp, Clock, Search, ChevronDown, ChevronUp, Loader2,
  UserPlus, Briefcase, RefreshCw
} from 'lucide-react';

const Admin = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCustomer, setExpandedCustomer] = useState(null);

  // Fetch all data
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, customersRes, employeesRes, bookingsRes, waitlistRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/stats`),
        fetch(`${API_URL}/api/admin/customers`),
        fetch(`${API_URL}/api/admin/employees`),
        fetch(`${API_URL}/api/admin/bookings`),
        fetch(`${API_URL}/api/waitlist`)
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (customersRes.ok) {
        const data = await customersRes.json();
        setCustomers(data.customers || []);
      }
      if (employeesRes.ok) {
        const data = await employeesRes.json();
        setEmployees(data.employees || []);
      }
      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        setBookings(data.bookings || []);
      }
      if (waitlistRes.ok) {
        const data = await waitlistRes.json();
        setWaitlist(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleAssignCustomer = async (customerEmail, employeeEmail) => {
    try {
      const response = await fetch(
        `${API_URL}/api/admin/assign-customer?customer_email=${encodeURIComponent(customerEmail)}&employee_email=${encodeURIComponent(employeeEmail)}`,
        { method: 'POST' }
      );
      
      if (response.ok) {
        fetchAllData(); // Refresh data
      }
    } catch (error) {
      console.error('Error assigning customer:', error);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const response = await fetch(
        `${API_URL}/api/admin/user/${userId}/role?role=${newRole}`,
        { method: 'PATCH' }
      );
      
      if (response.ok) {
        fetchAllData(); // Refresh data
      }
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const handleUpdateBookingStatus = async (bookingId, newStatus) => {
    try {
      const response = await fetch(
        `${API_URL}/api/call-bookings/${bookingId}?status=${newStatus}`,
        { method: 'PATCH' }
      );
      
      if (response.ok) {
        fetchAllData(); // Refresh data
      }
    } catch (error) {
      console.error('Error updating booking:', error);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBookings = bookings.filter(b => 
    b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-gradient-to-r from-primary to-primary/80 text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/')} className="flex items-center gap-2">
                <img src="/logo.png" alt="Nova Ninjas" className="h-8" />
                <span className="text-xl font-bold">Nova Ninjas</span>
              </button>
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                <Shield className="w-3 h-3 mr-1" />
                Admin Console
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={fetchAllData} className="text-white hover:bg-white/20">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <span className="text-sm opacity-80">Admin: {user?.name}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-white/20">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'customers', label: 'Customers', icon: Users },
              { id: 'employees', label: 'Employees', icon: Briefcase },
              { id: 'bookings', label: 'Call Bookings', icon: Phone },
              { id: 'waitlist', label: 'Waitlist', icon: UserPlus }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.id 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && stats && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Customers</p>
                          <p className="text-3xl font-bold mt-1">{stats.users?.customers || 0}</p>
                        </div>
                        <Users className="w-10 h-10 text-primary opacity-50" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Employees</p>
                          <p className="text-3xl font-bold mt-1">{stats.users?.employees || 0}</p>
                        </div>
                        <Briefcase className="w-10 h-10 text-blue-500 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Applications</p>
                          <p className="text-3xl font-bold mt-1">{stats.applications?.total || 0}</p>
                        </div>
                        <Target className="w-10 h-10 text-green-500 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Active Subscriptions</p>
                          <p className="text-3xl font-bold mt-1">{stats.subscriptions?.active || 0}</p>
                        </div>
                        <CreditCard className="w-10 h-10 text-purple-500 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                          <Phone className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-orange-800">Pending Bookings</p>
                          <p className="text-2xl font-bold text-orange-900">{stats.bookings?.pending || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                          <UserPlus className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-blue-800">Waitlist Entries</p>
                          <p className="text-2xl font-bold text-blue-900">{stats.waitlist || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                          <Clock className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-green-800">Hours Saved</p>
                          <p className="text-2xl font-bold text-green-900">{Math.round((stats.applications?.total || 0) * 0.5)}h</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Recent Bookings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {bookings.slice(0, 5).length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No bookings yet</p>
                      ) : (
                        <div className="space-y-3">
                          {bookings.slice(0, 5).map((booking) => (
                            <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium">{booking.name}</p>
                                <p className="text-sm text-gray-500">{booking.email}</p>
                              </div>
                              <Badge variant={booking.status === 'pending' ? 'warning' : 'success'}>
                                {booking.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Employee Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {employees.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No employees yet</p>
                      ) : (
                        <div className="space-y-3">
                          {employees.map((emp) => (
                            <div key={emp.user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium">{emp.user.name}</p>
                                <p className="text-sm text-gray-500">{emp.user.email}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">{emp.customer_count} customers</p>
                                <p className="text-xs text-gray-500">{emp.total_applications} apps</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Customers Tab */}
            {activeTab === 'customers' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>All Customers ({customers.length})</CardTitle>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input 
                        placeholder="Search customers..." 
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredCustomers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No customers found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Customer</th>
                            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Target Role</th>
                            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Applications</th>
                            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Assigned To</th>
                            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Subscription</th>
                            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCustomers.map((customer) => (
                            <React.Fragment key={customer.user.id}>
                              <tr className="border-b hover:bg-gray-50">
                                <td className="py-3 px-4">
                                  <div className="font-medium">{customer.user.name}</div>
                                  <div className="text-sm text-gray-500">{customer.user.email}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-sm">{customer.profile?.targetRole || 'Not set'}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <Badge variant="outline">{customer.application_count || 0}</Badge>
                                </td>
                                <td className="py-3 px-4">
                                  <Select 
                                    value={customer.assigned_employee || 'unassigned'}
                                    onValueChange={(v) => v !== 'unassigned' && handleAssignCustomer(customer.user.email, v)}
                                  >
                                    <SelectTrigger className="w-40 h-8">
                                      <SelectValue placeholder="Assign..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unassigned" disabled>Unassigned</SelectItem>
                                      {employees.map(emp => (
                                        <SelectItem key={emp.user.email} value={emp.user.email}>
                                          {emp.user.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="py-3 px-4">
                                  {customer.subscription ? (
                                    <Badge variant={customer.subscription.status === 'active' ? 'success' : 'secondary'}>
                                      {customer.subscription.status}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline">No Plan</Badge>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <button
                                    onClick={() => setExpandedCustomer(
                                      expandedCustomer === customer.user.id ? null : customer.user.id
                                    )}
                                    className="text-primary hover:underline text-sm flex items-center gap-1"
                                  >
                                    Details
                                    {expandedCustomer === customer.user.id ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </button>
                                </td>
                              </tr>
                              {expandedCustomer === customer.user.id && customer.profile && (
                                <tr className="bg-gray-50">
                                  <td colSpan="6" className="p-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                      <div>
                                        <p className="text-gray-500">Phone</p>
                                        <p>{customer.profile.phone || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-gray-500">Experience</p>
                                        <p>{customer.profile.yearsOfExperience || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-gray-500">Visa Status</p>
                                        <p>{customer.profile.visaStatus || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-gray-500">Remote</p>
                                        <p className="capitalize">{customer.profile.remotePreference || 'N/A'}</p>
                                      </div>
                                    </div>
                                    {customer.profile.skills && (
                                      <div className="mt-3 pt-3 border-t">
                                        <p className="text-gray-500 text-sm">Skills</p>
                                        <p className="text-sm">{customer.profile.skills}</p>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Employees Tab */}
            {activeTab === 'employees' && (
              <Card>
                <CardHeader>
                  <CardTitle>All Employees ({employees.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {employees.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No employees yet</p>
                      <p className="text-sm mt-1">Update a user's role to "employee" to add them here</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {employees.map((emp) => (
                        <Card key={emp.user.id} className="border-2">
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-lg">{emp.user.name}</h3>
                                <p className="text-sm text-gray-500">{emp.user.email}</p>
                              </div>
                              <Badge>Employee</Badge>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-4">
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <p className="text-2xl font-bold">{emp.customer_count}</p>
                                <p className="text-xs text-gray-500">Customers</p>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <p className="text-2xl font-bold">{emp.total_applications}</p>
                                <p className="text-xs text-gray-500">Applications</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Bookings Tab */}
            {activeTab === 'bookings' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Call Bookings ({bookings.length})</CardTitle>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input 
                        placeholder="Search bookings..." 
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredBookings.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Phone className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No bookings found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Name</th>
                            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Contact</th>
                            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Experience</th>
                            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Status</th>
                            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredBookings.map((booking) => (
                            <tr key={booking.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium">{booking.name}</td>
                              <td className="py-3 px-4">
                                <div className="flex flex-col gap-1">
                                  <a href={`mailto:${booking.email}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {booking.email}
                                  </a>
                                  <a href={`tel:${booking.mobile}`} className="text-sm text-gray-600 flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {booking.mobile}
                                  </a>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant="outline">{booking.years_of_experience}</Badge>
                              </td>
                              <td className="py-3 px-4">
                                <Select 
                                  value={booking.status}
                                  onValueChange={(v) => handleUpdateBookingStatus(booking.id, v)}
                                >
                                  <SelectTrigger className="w-32 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="contacted">Contacted</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex gap-2">
                                  <a 
                                    href={`mailto:${booking.email}`}
                                    className="text-primary hover:underline text-sm"
                                  >
                                    Send Email
                                  </a>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Waitlist Tab */}
            {activeTab === 'waitlist' && (
              <Card>
                <CardHeader>
                  <CardTitle>Waitlist ({waitlist.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {waitlist.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No waitlist entries yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Name</th>
                            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Email</th>
                            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Phone</th>
                            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Target Role</th>
                            <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Urgency</th>
                          </tr>
                        </thead>
                        <tbody>
                          {waitlist.map((entry) => (
                            <tr key={entry.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium">{entry.name}</td>
                              <td className="py-3 px-4">
                                <a href={`mailto:${entry.email}`} className="text-primary hover:underline">
                                  {entry.email}
                                </a>
                              </td>
                              <td className="py-3 px-4">{entry.phone || 'N/A'}</td>
                              <td className="py-3 px-4">{entry.target_role || 'N/A'}</td>
                              <td className="py-3 px-4">
                                {entry.urgency && (
                                  <Badge variant={entry.urgency === 'urgent' ? 'destructive' : 'secondary'}>
                                    {entry.urgency}
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;
