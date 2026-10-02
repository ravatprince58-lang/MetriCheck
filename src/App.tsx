import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { AdminAuthProvider } from '@/context/AdminAuthContext';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { VerifiedRoute } from '@/components/layout/VerifiedRoute';
import { AdminRoute } from '@/components/layout/AdminRoute';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { NewInspectionPage } from '@/pages/NewInspectionPage';
import { ImageUploadPage } from '@/pages/ImageUploadPage';
import { ResultsPage } from '@/pages/ResultsPage';
import { ReportPage } from '@/pages/ReportPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { VerificationPage } from '@/pages/VerificationPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { CompliancePage } from '@/pages/CompliancePage';
import { InspectionVerificationPage } from '@/pages/InspectionVerificationPage';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';
import { AdminAccountsPage } from '@/pages/AdminAccountPage';
import { RuleManagementPage } from '@/pages/RuleManagementPage';
import { LandingPage } from '@/pages/LandingPage';
import { RequestDemoPage } from '@/pages/RequestDemoPage';
import { ConsumerGrievancePage } from '@/pages/ConsumerGrievancePage';
import { AdminLoginPage } from '@/pages/AdminLoginPage';
import { AboutPage } from '@/pages/AboutPage';
import { ContactPage } from '@/pages/ContactPage';

function App() {
  return (
    <AuthProvider>
      <AdminAuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/request-demo" element={<RequestDemoPage />} />
            <Route path="/consumer-grievance" element={<ConsumerGrievancePage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inspections/new"
              element={
                <ProtectedRoute>
                  <NewInspectionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inspections/:id/upload"
              element={
                <ProtectedRoute>
                  <ImageUploadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inspections/:id/results"
              element={
                <ProtectedRoute>
                  <ResultsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inspections/:id/compliance"
              element={
                <ProtectedRoute>
                  <CompliancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inspections/:id/verify"
              element={
                <ProtectedRoute>
                  <InspectionVerificationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inspections/:id/report"
              element={
                <ProtectedRoute>
                  <ReportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inspections"
              element={
                <ProtectedRoute>
                  <HistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/verification"
              element={
                <ProtectedRoute>
                  <VerificationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboardPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/rules"
              element={
                <AdminRoute>
                  <RuleManagementPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/accounts"
              element={
                <AdminRoute>
                  <AdminAccountsPage />
                </AdminRoute>
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AdminAuthProvider>
    </AuthProvider>
  );
}

export default App;
