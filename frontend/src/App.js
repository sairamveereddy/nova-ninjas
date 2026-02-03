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
import AllUsersExport from "./components/AllUsersExport";
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
import InterviewRoom from "./components/InterviewRoom";
import InterviewReport from "./components/InterviewReport";
import AdminAnalytics from "./components/AdminAnalytics";
import Checkout from "./components/Checkout";
import ResumeScanner from "./components/ResumeScanner";
import AIApplyFlow from "./components/AIApplyFlow";
import RefundPolicy from "./components/RefundPolicy";
import VerifyEmail from "./components/VerifyEmail";
import ScrollToTop from "./components/ScrollToTop";
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
import FreeTools from "./components/FreeTools";
// Free Tools Components
import NetworkingTemplates from "./components/NetworkingTemplates";
import InterviewFramework from "./components/InterviewFramework";
import ReferenceCheckPrep from "./components/ReferenceCheckPrep";
import SalaryNegotiator from "./components/SalaryNegotiator";
import LinkedInHeadlineOptimizer from "./components/LinkedInHeadlineOptimizer";
import CareerGapExplainer from "./components/CareerGapExplainer";
import JobDescriptionDecoder from "./components/JobDescriptionDecoder";
import OfferComparator from "./components/OfferComparator";
import ContactPage from "./components/ContactPage";
import "./components/Jobs.css";
import "./components/InterviewPrep.css";
import "./components/ResumeScanner.css";
import "./components/AIApplyFlow.css";
import LinkedInMockup from "./components/LinkedInMockup";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
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
            <Route path="/verify-email" element={<VerifyEmail />} />

            {/* AI Ninja Routes */}
            <Route path="/ai-ninja" element={<AINinja />} />
            <Route path="/ai-ninja/jobs/:id" element={<JobDetail />} />
            <Route path="/ai-ninja/apply/:id" element={<AIApply />} />
            <Route
              path="/ai-apply"
              element={
                <ProtectedRoute allowedRoles={['customer']} requireVerification={false}>
                  <AIApplyFlow />
                </ProtectedRoute>
              }
            />

            {/* Human Ninja Route */}
            <Route path="/human-ninja" element={<HumanNinja />} />

            {/* Jobs Route */}
            <Route path="/jobs" element={<Jobs />} />

            {/* Free Tools Route */}
            <Route path="/free-tools" element={<FreeTools />} />
            <Route path="/networking-templates" element={<NetworkingTemplates />} />
            <Route path="/interview-framework" element={<InterviewFramework />} />
            <Route path="/reference-prep" element={<ReferenceCheckPrep />} />
            <Route path="/salary-negotiator" element={<SalaryNegotiator />} />
            <Route path="/linkedin-headline" element={<LinkedInHeadlineOptimizer />} />
            <Route path="/career-gap" element={<CareerGapExplainer />} />
            <Route path="/job-decoder" element={<JobDescriptionDecoder />} />
            <Route path="/offer-comparator" element={<OfferComparator />} />


            {/* Interview Prep Route */}
            <Route path="/interview-prep" element={<InterviewPrep />} />
            <Route path="/interview-prep/:sessionId" element={<InterviewRoom />} />
            <Route path="/interview-prep/:sessionId/report" element={<InterviewReport />} />

            {/* Admin Analytics Route */}
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute allowedRoles={['customer']} requireVerification={false}>
                  <AdminAnalytics />
                </ProtectedRoute>
              }
            />

            {/* Phase 1 Tools Routes */}
            <Route
              path="/one-click-optimize"
              element={
                <ProtectedRoute allowedRoles={['customer']} requireVerification={false}>
                  <OneClickOptimize />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bullet-points"
              element={
                <ProtectedRoute allowedRoles={['customer']} requireVerification={false}>
                  <BulletPointsGenerator />
                </ProtectedRoute>
              }
            />
            <Route
              path="/summary-generator"
              element={
                <ProtectedRoute allowedRoles={['customer']} requireVerification={false}>
                  <SummaryGenerator />
                </ProtectedRoute>
              }
            />
            <Route
              path="/linkedin-optimizer"
              element={
                <ProtectedRoute allowedRoles={['customer']} requireVerification={false}>
                  <LinkedInOptimizer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/career-change"
              element={
                <ProtectedRoute allowedRoles={['customer']} requireVerification={false}>
                  <CareerChangeTool />
                </ProtectedRoute>
              }
            />

            {/* Phase 2 Tools Routes */}
            <Route
              path="/chatgpt-resume"
              element={
                <ProtectedRoute allowedRoles={['customer']} requireVerification={false}>
                  <ChatGPTResume />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chatgpt-cover-letter"
              element={
                <ProtectedRoute allowedRoles={['customer']} requireVerification={false}>
                  <ChatGPTCoverLetter />
                </ProtectedRoute>
              }
            />
            <Route path="/linkedin-examples" element={<LinkedInExamples />} />
            <Route path="/resume-examples" element={<LinkedInExamples />} />
            <Route path="/linkedin-mockup" element={<LinkedInMockup />} />

            {/* Phase 3 Tools Routes */}
            <Route path="/resume-templates" element={<ResumeTemplates />} />
            <Route path="/cover-letter-templates" element={<CoverLetterTemplates />} />
            <Route path="/ats-guides" element={<ATSGuides />} />

            {/* Resume Scanner Route */}
            <Route
              path="/scanner"
              element={
                <ProtectedRoute allowedRoles={['customer']} requireVerification={false}>
                  <ResumeScanner />
                </ProtectedRoute>
              }
            />

            {/* My Resumes - Protected */}
            <Route
              path="/resumes"
              element={
                <ProtectedRoute allowedRoles={['customer']} requireVerification={false}>
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

            {/* Admin User Export Route */}
            <Route
              path="/admin/users-export"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AllUsersExport />
                </ProtectedRoute>
              }
            />

            {/* Contact Route */}
            <Route path="/contact" element={<ContactPage />} />

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
