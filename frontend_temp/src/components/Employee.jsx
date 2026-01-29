import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardContent, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { API_URL } from '../config/api';
import { 
  Users, LogOut, Briefcase, Plus, Search, ChevronRight, 
  Loader2, Target, Mail, Phone, MapPin, 
  ExternalLink, Trash2, X, Check, Clock, User
} from 'lucide-react';

const Employee = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState('customers');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add Application Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newApplication, setNewApplication] = useState({
    company_name: '',
    job_title: '',
    job_url: '',
    status: 'found',
    notes: '',
    job_description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch assigned customers
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!user?.email) return;
      
      try {
        setIsLoading(true);
        const response = await fetch(`${API_URL}/api/employee/customers/${encodeURIComponent(user.email)}`);
        
        if (response.ok) {
          const data = await response.json();
          setCustomers(data.customers || []);
        }
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCustomers();
  }, [user?.email, API_URL]);

  // Fetch customer details when selected
  const fetchCustomerDetails = async (customerEmail) => {
    try {
      setIsLoadingDetails(true);
      const response = await fetch(`${API_URL}/api/employee/customer/${encodeURIComponent(customerEmail)}`);
      
      if (response.ok) {
        const data = await response.json();
        setCustomerDetails(data);
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    fetchCustomerDetails(customer.user.email);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleAddApplication = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/employee/application?employee_email=${encodeURIComponent(user.email)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_email: selectedCustomer.user.email,
          ...newApplication
        })
      });
      
      if (response.ok) {
        // Refresh customer details
        fetchCustomerDetails(selectedCustomer.user.email);
        setShowAddModal(false);
        setNewApplication({
          company_name: '',
          job_title: '',
          job_url: '',
          status: 'found',
          notes: '',
          job_description: ''
        });
      }
    } catch (error) {
      console.error('Error adding application:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (applicationId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/employee/application/${applicationId}?status=${newStatus}`, {
        method: 'PATCH'
      });
      
      if (response.ok && selectedCustomer) {
        fetchCustomerDetails(selectedCustomer.user.email);
      }
    } catch (error) {
      console.error('Error updating application:', error);
    }
  };

  const handleDeleteApplication = async (applicationId) => {
    if (!window.confirm('Are you sure you want to delete this application?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/employee/application/${applicationId}`, {
        method: 'DELETE'
      });
      
      if (response.ok && selectedCustomer) {
        fetchCustomerDetails(selectedCustomer.user.email);
      }
    } catch (error) {
      console.error('Error deleting application:', error);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      found: { variant: 'secondary', label: 'Found' },
      prepared: { variant: 'default', label: 'Prepared' },
      submitted: { variant: 'success', label: 'Submitted' },
      interview: { variant: 'warning', label: 'Interview' },
      offer: { variant: 'success', label: 'Offer!' },
      rejected: { variant: 'destructive', label: 'Rejected' }
    };
    const config = variants[status] || variants.found;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredCustomers = customers.filter(c => 
    c.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const totalApplications = customers.reduce((sum, c) => sum + (c.application_count || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/')} className="flex items-center gap-2">
                <img src="/logo.png" alt="Nova Ninjas" className="h-8" />
                <span className="text-xl font-bold text-primary">Nova Ninjas</span>
              </button>
              <Badge variant="outline">Employee Portal</Badge>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Assigned Customers</p>
                  <p className="text-3xl font-bold mt-1">{customers.length}</p>
                </div>
                <Users className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Applications</p>
                  <p className="text-3xl font-bold mt-1">{totalApplications}</p>
                </div>
                <Target className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Hours Saved</p>
                  <p className="text-3xl font-bold mt-1">{Math.round(totalApplications * 0.5)}h</p>
                </div>
                <Clock className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-6">
          {/* Customer List Sidebar */}
          <div className="w-80 flex-shrink-0">
            <Card className="h-[calc(100vh-220px)] flex flex-col">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  My Customers
                </CardTitle>
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    placeholder="Search customers..." 
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No customers assigned yet</p>
                    <p className="text-sm mt-1">Contact admin to get customers assigned</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.user.email}
                        onClick={() => handleSelectCustomer(customer)}
                        className={`w-full p-4 text-left hover:bg-gray-50 transition flex items-center justify-between ${
                          selectedCustomer?.user.email === customer.user.email ? 'bg-primary/5 border-l-4 border-primary' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{customer.user.name}</p>
                          <p className="text-sm text-gray-500 truncate">{customer.user.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {customer.application_count || 0} apps
                            </Badge>
                            {customer.profile?.targetRole && (
                              <span className="text-xs text-gray-400 truncate">
                                {customer.profile.targetRole}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            {!selectedCustomer ? (
              <Card className="h-[calc(100vh-220px)] flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <User className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">Select a customer to view details</p>
                  <p className="text-sm mt-1">Choose from the list on the left</p>
                </div>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Customer Info Header */}
                <Card>
                  <CardContent className="pt-6">
                    {isLoadingDetails ? (
                      <div className="flex items-center justify-center h-24">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-2xl font-bold">{selectedCustomer.user.name}</h2>
                          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              {selectedCustomer.user.email}
                            </span>
                            {customerDetails?.profile?.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-4 h-4" />
                                {customerDetails.profile.phone}
                              </span>
                            )}
                            {customerDetails?.profile?.preferredLocations && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {customerDetails.profile.preferredLocations}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2 mt-3">
                            {customerDetails?.profile?.targetRole && (
                              <Badge>{customerDetails.profile.targetRole}</Badge>
                            )}
                            {customerDetails?.profile?.yearsOfExperience && (
                              <Badge variant="outline">{customerDetails.profile.yearsOfExperience} years</Badge>
                            )}
                            {customerDetails?.profile?.visaStatus && (
                              <Badge variant="secondary">{customerDetails.profile.visaStatus.toUpperCase()}</Badge>
                            )}
                          </div>
                        </div>
                        <Button onClick={() => setShowAddModal(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Application
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Customer Preferences */}
                {customerDetails?.profile && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Job Preferences</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Current Role</p>
                          <p className="font-medium">{customerDetails.profile.currentRole || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Expected Salary</p>
                          <p className="font-medium">{customerDetails.profile.expectedSalary || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Remote Preference</p>
                          <p className="font-medium capitalize">{customerDetails.profile.remotePreference || 'Flexible'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Notice Period</p>
                          <p className="font-medium">{customerDetails.profile.noticePeriod || 'Not specified'}</p>
                        </div>
                      </div>
                      {customerDetails.profile.skills && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-gray-500 text-sm mb-2">Skills</p>
                          <p className="text-sm">{customerDetails.profile.skills}</p>
                        </div>
                      )}
                      {customerDetails.profile.additionalNotes && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-gray-500 text-sm mb-2">Notes from Customer</p>
                          <p className="text-sm bg-yellow-50 p-3 rounded">{customerDetails.profile.additionalNotes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Applications Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5" />
                        Applications ({customerDetails?.applications?.length || 0})
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingDetails ? (
                      <div className="flex items-center justify-center h-32">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : !customerDetails?.applications?.length ? (
                      <div className="text-center py-8 text-gray-500">
                        <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No applications yet</p>
                        <Button variant="outline" className="mt-3" onClick={() => setShowAddModal(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add First Application
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Company</th>
                              <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Position</th>
                              <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Status</th>
                              <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Date</th>
                              <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customerDetails.applications.map((app) => (
                              <tr key={app.id} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-4">
                                  <div className="font-medium">{app.company_name}</div>
                                  {app.notes && (
                                    <div className="text-xs text-gray-500 mt-1">{app.notes}</div>
                                  )}
                                </td>
                                <td className="py-3 px-4">{app.job_title}</td>
                                <td className="py-3 px-4">
                                  <Select 
                                    value={app.status} 
                                    onValueChange={(v) => handleUpdateStatus(app.id, v)}
                                  >
                                    <SelectTrigger className="w-32 h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="found">Found</SelectItem>
                                      <SelectItem value="prepared">Prepared</SelectItem>
                                      <SelectItem value="submitted">Submitted</SelectItem>
                                      <SelectItem value="interview">Interview</SelectItem>
                                      <SelectItem value="offer">Offer</SelectItem>
                                      <SelectItem value="rejected">Rejected</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-600">
                                  {app.submitted_date || 'N/A'}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    {app.job_url && (
                                      <a 
                                        href={app.job_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                      >
                                        <ExternalLink className="w-4 h-4" />
                                      </a>
                                    )}
                                    <button 
                                      onClick={() => handleDeleteApplication(app.id)}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Application Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Add New Application</CardTitle>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddApplication} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Company Name *</Label>
                    <Input 
                      required
                      value={newApplication.company_name}
                      onChange={(e) => setNewApplication(prev => ({ ...prev, company_name: e.target.value }))}
                      placeholder="e.g., Google"
                    />
                  </div>
                  <div>
                    <Label>Job Title *</Label>
                    <Input 
                      required
                      value={newApplication.job_title}
                      onChange={(e) => setNewApplication(prev => ({ ...prev, job_title: e.target.value }))}
                      placeholder="e.g., Software Engineer"
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Job URL *</Label>
                  <Input 
                    required
                    type="url"
                    value={newApplication.job_url}
                    onChange={(e) => setNewApplication(prev => ({ ...prev, job_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                
                <div>
                  <Label>Status</Label>
                  <Select 
                    value={newApplication.status} 
                    onValueChange={(v) => setNewApplication(prev => ({ ...prev, status: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="found">Found</SelectItem>
                      <SelectItem value="prepared">Prepared</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Notes</Label>
                  <Textarea 
                    value={newApplication.notes}
                    onChange={(e) => setNewApplication(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any notes about this application..."
                    rows={2}
                  />
                </div>
                
                <div>
                  <Label>Job Description (Optional)</Label>
                  <Textarea 
                    value={newApplication.job_description}
                    onChange={(e) => setNewApplication(prev => ({ ...prev, job_description: e.target.value }))}
                    placeholder="Paste job description here..."
                    rows={3}
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Add Application
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Employee;
