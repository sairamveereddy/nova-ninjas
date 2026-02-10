import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { API_URL, apiCall } from '../config/api';
import { Mail, User, Calendar, MessageSquare, Loader2 } from 'lucide-react';

const ContactMessagesTable = () => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const data = await apiCall('/api/admin/contact-messages');
            setMessages(data.messages || []);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching contact messages:', err);
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
                Error loading contact messages: {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Contact Form Messages</h3>
                <Badge variant="secondary">{messages.length} Total</Badge>
            </div>

            {messages.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                        No contact messages yet
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {messages.map((message) => (
                        <Card key={message._id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-gray-500" />
                                            <span className="font-semibold">
                                                {message.firstName} {message.lastName}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-gray-500" />
                                            <span className="text-sm text-gray-600">{message.email}</span>
                                        </div>
                                    </div>
                                    <Badge variant={message.status === 'read' ? 'secondary' : 'default'}>
                                        {message.status || 'unread'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <MessageSquare className="h-4 w-4 text-gray-500" />
                                            <span className="text-sm font-medium">Subject:</span>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900">{message.subject}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{message.message}</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <Calendar className="h-3 w-3" />
                                        {message.created_at ? new Date(message.created_at).toLocaleString() : 'N/A'}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ContactMessagesTable;
