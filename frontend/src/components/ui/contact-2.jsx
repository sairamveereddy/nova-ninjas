import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { API_URL, apiCall } from '../../config/api';
import { CheckCircle, Loader2 } from 'lucide-react';

export const Contact2 = ({
    title = "Contact Us",
    description = "We are available for questions, feedback, or collaboration opportunities. Let us know how we can help!",
    phone = "+1 (770) 744-0189",
    email = "veereddy@jobninjas.org",
    web = { label: "jobNinjas.org", url: "https://jobNinjas.org" },
}) => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        subject: '',
        message: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.id]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/api/contact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            const data = await response.json();

            // Show success message
            setSuccess(true);

            // Reset form
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                subject: '',
                message: ''
            });

            // Hide success message after 5 seconds
            setTimeout(() => {
                setSuccess(false);
            }, 5000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="py-32">
            <div className="container">
                <div className="mx-auto flex max-w-screen-xl flex-col justify-between gap-10 lg:flex-row lg:gap-20">
                    <div className="mx-auto flex max-w-sm flex-col justify-between gap-10">
                        <div className="text-center lg:text-left">
                            <h1 className="mb-2 text-5xl font-semibold lg:mb-1 lg:text-6xl">
                                {title}
                            </h1>
                            <p className="text-muted-foreground">{description}</p>
                        </div>
                        <div className="mx-auto w-fit lg:mx-0">
                            <h3 className="mb-6 text-center text-2xl font-semibold lg:text-left">
                                Contact Details
                            </h3>
                            <ul className="ml-4 list-disc">
                                <li>
                                    <span className="font-bold">Phone: </span>
                                    {phone}
                                </li>
                                <li>
                                    <span className="font-bold">Email: </span>
                                    <a href={`mailto:${email}`} className="underline">
                                        {email}
                                    </a>
                                </li>
                                <li>
                                    <span className="font-bold">Web: </span>
                                    <a href={web.url} target="_blank" className="underline">
                                        {web.label}
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <form onSubmit={handleSubmit} className="mx-auto flex max-w-screen-md flex-col gap-6 rounded-lg border p-10 bg-white shadow-sm">
                        {success && (
                            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <p className="text-green-800 font-medium">Message sent to team successfully!</p>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-800">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input
                                    type="text"
                                    id="firstName"
                                    placeholder="First Name"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input
                                    type="text"
                                    id="lastName"
                                    placeholder="Last Name"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                type="email"
                                id="email"
                                placeholder="Email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="subject">Subject</Label>
                            <Input
                                type="text"
                                id="subject"
                                placeholder="Subject"
                                value={formData.subject}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="grid w-full gap-1.5">
                            <Label htmlFor="message">Message</Label>
                            <Textarea
                                placeholder="Type your message here."
                                id="message"
                                value={formData.message}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                'Send Message'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </section>
    );
};
