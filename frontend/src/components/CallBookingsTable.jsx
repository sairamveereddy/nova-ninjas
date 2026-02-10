import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { API_URL, apiCall } from '../config/api';
import { Calendar, Clock, User, Mail, Phone, Loader2 } from 'lucide-react';

const CallBookingsTable = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const data = await apiCall('/api/admin/call-bookings');
            setBookings(data.bookings || []);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching call bookings:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                Error loading call bookings: {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Human Ninja Call Bookings</h3>
                <Badge variant="secondary">{bookings.length} Total</Badge>
            </div>

            {bookings.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                        No call bookings yet
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {bookings.map((booking) => (
                        <Card key={booking._id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-gray-500" />
                                            <span className="font-semibold">{booking.name || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-gray-500" />
                                            <span className="text-sm text-gray-600">{booking.email || 'N/A'}</span>
                                        </div>
                                        {booking.phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-gray-500" />
                                                <span className="text-sm text-gray-600">{booking.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-gray-500" />
                                            <span className="text-sm">
                                                {booking.date ? new Date(booking.date).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-gray-500" />
                                            <span className="text-sm">{booking.time || 'N/A'}</span>
                                        </div>
                                        <Badge variant={booking.status === 'confirmed' ? 'success' : 'secondary'}>
                                            {booking.status || 'pending'}
                                        </Badge>
                                    </div>
                                </div>
                                {booking.notes && (
                                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-700">{booking.notes}</p>
                                    </div>
                                )}
                                <div className="mt-2 text-xs text-gray-400">
                                    Booked: {booking.created_at ? new Date(booking.created_at).toLocaleString() : 'N/A'}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CallBookingsTable;
