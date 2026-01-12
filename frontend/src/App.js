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
import RefundPolicy from "./components/RefundPolicy";
// Phase 1 Tools
import OneClickOptimize from "./components/OneClickOptimize";
import BulletPointsGenerator from "./components/BulletPointsGenerator";
import SummaryGenerator from "./components/SummaryGenerator";
import LinkedInOptimizer from "./components/LinkedInOptimizer";
import CareerChangeTool from "./components/CareerChangeTool";
// Phase 2 Tools
import ChatGPTResume from "./components/ChatGPTResume";
import ChatGPTCoverLetter from "./components/ChatGPTCoverLetter";
import LinkedInExamples from "./components/LinkedInExamples";
// Phase 3 Tools
import ResumeTemplates from "./components/ResumeTemplates";
import CoverLetterTemplates from "./components/CoverLetterTemplates";
import ATSGuides from "./components/ATSGuides";
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
            <Route path="/refund-policy" element={<RefundPolicy />} />

            {/* AI Ninja Routes */}
            <Route path="/ai-ninja" element={<AINinja />} />
            <Route path="/ai-ninja/jobs/:id" element={<JobDetail />} />
            <Route path="/ai-ninja/apply/:id" element={<AIApply />} />
            <Route
              path="/ai-apply"
              element={
                <ProtectedRoute allowedRoles={['customer']}>
                  <AIApplyFlow />
                </ProtectedRoute>
              }
            />

            {/* Human Ninja Route */}
            <Route path="/human-ninja" element={<HumanNinja />} />

            {/* Jobs Route */}
            <Route path="/jobs" element={<Jobs />} />

            {/* Interview Prep Route */}
            <Route path="/interview-prep" element={<InterviewPrep />} />

            {/* Phase 1 Tools Routes */}
            <Route path="/one-click-optimize" element={<OneClickOptimize />} />
            <Route path="/bullet-points" element={<BulletPointsGenerator />} />
            <Route path="/summary-generator" element={<SummaryGenerator />} />
            <Route path="/linkedin-optimizer" element={<LinkedInOptimizer />} />
            <Route path="/career-change" element={<CareerChangeTool />} />

            {/* Phase 2 Tools Routes */}
            <Route path="/chatgpt-resume" element={<ChatGPTResume />} />
            <Route path="/chatgpt-cover-letter" element={<ChatGPTCoverLetter />} />
            <Route path="/linkedin-examples" element={<LinkedInExamples />} />

            {/* Phase 3 Tools Routes */}
            <Route path="/resume-templates" element={<ResumeTemplates />} />
            <Route path="/cover-letter-templates" element={<CoverLetterTemplates />} />
            <Route path="/ats-guides" element={<ATSGuides />} />

            {/* Resume Scanner Route */}
            <Route
              path="/scanner"
              element={
                <ProtectedRoute allowedRoles={['customer']}>
                  <ResumeScanner />
                </ProtectedRoute>
              }
            />

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
