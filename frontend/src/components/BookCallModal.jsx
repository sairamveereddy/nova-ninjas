import React, { useState } from 'react';
import { X, Phone, User, Mail, Calendar, Loader2, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { API_URL } from '../config/api';
import './BookCallModal.css';

const BookCallModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    years_of_experience: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleExperienceChange = (value) => {
    setFormData(prev => ({ ...prev, years_of_experience: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.email || !formData.mobile || !formData.years_of_experience) {
      setError('Please fill in all fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Phone validation (basic)
    const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
    if (!phoneRegex.test(formData.mobile)) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsSubmitting(true);

    setError('');

    try {
      const response = await fetch(`${API_URL}/api/book-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to book call');
      }

      setIsSuccess(true);

      // Reset form after 3 seconds and close modal
      setTimeout(() => {
        setFormData({ name: '', email: '', mobile: '', years_of_experience: '' });
        setIsSuccess(false);
        onClose();
      }, 3000);

    } catch (err) {
      console.error('Booking error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>

        {isSuccess ? (
          <div className="success-state">
            <div className="success-icon">
              <CheckCircle size={64} />
            </div>
            <h2>Call Booked Successfully!</h2>
            <p>We'll reach out to you within 24 hours to schedule your consultation.</p>
          </div>
        ) : (
          <>
            <div className="modal-header">
              <div className="modal-header-content">
                <div className="modal-icon">
                  <Phone size={32} />
                </div>
                <div className="modal-text">
                  <h2>Book a 15-Minute Call</h2>
                  <p>Let's discuss how we can help you land your dream job faster</p>
                </div>
              </div>
              <button className="modal-close" onClick={onClose}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <Label htmlFor="name" className="form-label">
                  <User size={16} />
                  Full Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <Label htmlFor="email" className="form-label">
                  <Mail size={16} />
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <Label htmlFor="mobile" className="form-label">
                  <Phone size={16} />
                  Mobile Number
                </Label>
                <Input
                  id="mobile"
                  name="mobile"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.mobile}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <Label htmlFor="experience" className="form-label">
                  <Calendar size={16} />
                  Years of Experience
                </Label>
                <Select onValueChange={handleExperienceChange} value={formData.years_of_experience}>
                  <SelectTrigger className="form-select">
                    <SelectValue placeholder="Select your experience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0-5">0-5 years</SelectItem>
                    <SelectItem value="5-10">5-10 years</SelectItem>
                    <SelectItem value="10-15">10-15 years</SelectItem>
                    <SelectItem value="15-20">15-20 years</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="form-error">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Booking...
                  </>
                ) : (
                  <>
                    <Phone size={20} />
                    Book My Call
                  </>
                )}
              </Button>

              <p className="form-disclaimer">
                We'll contact you within 24 hours to schedule your call. No spam, ever.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default BookCallModal;


