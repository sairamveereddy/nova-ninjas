import React from "react";
import "./App.css";
import "./LandingPage.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import LandingPage from "./components/LandingPage";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Dashboard from "./components/Dashboard";
import Pricing from "./components/Pricing";
import Employee from "./components/Employee";
import Admin from "./components/Admin";
import ProtectedRoute from "./components/ProtectedRoute";
import PaymentSuccess from "./components/PaymentSuccess";
import PaymentCanceled from "./components/PaymentCanceled";
// AI Ninja and Human Ninja components
import AINinja from "./components/AINinja";
import JobDetail from "./components/JobDetail";
import AIApply from "./components/AIApply";
import HumanNinja from "./components/HumanNinja";
// New components
import Jobs from "./components/Jobs";
import MyResumes from "./components/MyResumes";
import InterviewPrep from "./components/InterviewPrep";
import Checkout from "./components/Checkout";
import ResumeScanner from "./components/ResumeScanner";
import AIApplyFlow from "./components/AIApplyFlow";
import "./components/Jobs.css";
import "./components/InterviewPrep.css";
import "./components/ResumeScanner.css";
import "./components/AIApplyFlow.css";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/canceled" element={<PaymentCanceled />} />
            <Route path="/checkout" element={<Checkout />} />
            
            {/* AI Ninja Routes */}
            <Route path="/ai-ninja" element={<AINinja />} />
            <Route path="/ai-ninja/jobs/:id" element={<JobDetail />} />
            <Route path="/ai-ninja/apply/:id" element={<AIApply />} />
            <Route path="/ai-apply" element={<AIApplyFlow />} />
            
            {/* Human Ninja Route */}
            <Route path="/human-ninja" element={<HumanNinja />} />
            
            {/* Jobs Route */}
            <Route path="/jobs" element={<Jobs />} />
            
            {/* Interview Prep Route */}
            <Route path="/interview-prep" element={<InterviewPrep />} />
            
            {/* Resume Scanner Route */}
            <Route path="/scanner" element={<ResumeScanner />} />
            
            {/* My Resumes - Protected */}
            <Route
              path="/resumes"
              element={
                <ProtectedRoute allowedRoles={['customer']}>
                  <MyResumes />
                </ProtectedRoute>
              }
            />
            
            {/* Protected Routes - Customer */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['customer']}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Protected Routes - Employee */}
            <Route
              path="/employee"
              element={
                <ProtectedRoute allowedRoles={['employee']}>
                  <Employee />
                </ProtectedRoute>
              }
            />
            
            {/* Protected Routes - Admin */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Admin />
                </ProtectedRoute>
              }
            />
            
            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
