import React from 'react';
import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthLayout } from '../shared/components/layouts/AuthLayout';
import { DashboardLayout } from '../shared/components/layouts/DashboardLayout';
import { ProtectedRoute } from '../shared/components/ProtectedRoute';
import { useAuth } from '../entities/user/hooks/useAuth';
import { Role } from '../entities/user/types';

// Auth Components
import { LoginForm } from '../features/auth/components/LoginForm';
import { RegisterForm } from '../features/auth/components/RegisterForm';
import { VerifyEmail } from '../features/auth/components/VerifyEmail';
import { ForgotPasswordForm } from '../features/auth/components/ForgotPasswordForm';
import { ResetPasswordForm } from '../features/auth/components/ResetPasswordForm';
import { OAuthCallbackPage } from '../features/auth/pages/OAuthCallbackPage';

// Dashboard Components
import { AdminDashboard } from '../features/dashboard/components/AdminDashboard';
import { ClientDashboard } from '../features/dashboard/components/ClientDashboard';
import { FieldTeamDashboard } from '../features/dashboard/components/FieldTeamDashboard';
import { WalletPage } from '../features/dashboard/components/WalletPage';
import { WorkerReviewsPage } from '../features/dashboard/components/WorkerReviewsPage';

// Work Orders Components
import { WorkOrderList } from '../features/work-orders/components/WorkOrderList';
import { ServiceRequestForm } from '../features/work-orders/components/ServiceRequestForm';
import { WorkOrderDetail } from '../features/work-orders/components/WorkOrderDetail';

// Admin Domain Components
import { CategoryManagement } from '../features/categories/components/CategoryManagement';
import { InvoiceManagement } from '../features/invoices/components/InvoiceManagement';
import { OperationsManagement } from '../features/operations/components/OperationsManagement';
import { LiveTrackingMap } from '../features/tracking/components/LiveTrackingMap';
import { ChatWindow } from '../features/chat/components/ChatWindow';
import { AnalyticsDashboard } from '../features/analytics/components/AnalyticsDashboard';
import { TeamList } from '../features/teams/components/TeamList';
import { NotificationList } from '../features/notifications/components/NotificationList';
import { ProfilePage } from '../features/profile/components/ProfilePage';
import { SettingsPage } from '../features/settings/components/SettingsPage';
import { HelpSupportPage } from '../features/help/components/HelpSupportPage';
import { ReportViewer } from '../features/reports/components/ReportViewer';
import { NotFound } from '../shared/components/NotFound';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';

const RoleDashboard = () => {
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();

  if (role === 'admin') {
    return <AdminDashboard />;
  }
  if (
    role === 'fieldteam' ||
    role === 'field_team' ||
    role === 'field-team' ||
    role === 'worker' ||
    role === 'field' ||
    role === 'crew' ||
    role === 'technician'
  ) {
    return <FieldTeamDashboard />;
  }
  return <ClientDashboard />;
};

const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <ErrorBoundary />,
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    errorElement: <ErrorBoundary />,
    element: <LoginForm />,
  },
  {
    path: '/register',
    errorElement: <ErrorBoundary />,
    element: <RegisterForm />,
  },
  {
    path: '/auth/callback/google',
    errorElement: <ErrorBoundary />,
    element: <OAuthCallbackPage providerOverride="google" />,
  },
  {
    path: '/auth/callback/apple',
    errorElement: <ErrorBoundary />,
    element: <OAuthCallbackPage providerOverride="apple" />,
  },
  {
    element: <AuthLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      { path: '/forgot-password', element: <ForgotPasswordForm /> },
      { path: '/reset-password/:token', element: <ResetPasswordForm /> },
      { path: '/verify-email', element: <VerifyEmail /> },
      { path: '/verify-email/:token', element: <VerifyEmail /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          // General Authenticated Routes (accessible across all roles)
          { path: '/dashboard', element: <RoleDashboard /> },
          { path: '/wallet', element: <WalletPage /> },
          { path: '/work-orders', element: <WorkOrderList /> },
          { path: '/work-history', element: <Navigate to="/work-orders" replace /> },
          { path: '/work-orders/:id', element: <WorkOrderDetail /> },
          { path: '/tracking', element: <LiveTrackingMap /> },
          { path: '/invoices', element: <InvoiceManagement /> },
          { path: '/payments', element: <InvoiceManagement /> },
          { path: '/service-history', element: <Navigate to="/work-orders" replace /> },
          { path: '/chat', element: <ChatWindow /> },
          { path: '/chat/:workOrderId', element: <ChatWindow /> },
          { path: '/notifications', element: <NotificationList /> },
          { path: '/reviews', element: <WorkerReviewsPage /> },
          { path: '/ratings-and-reviews', element: <WorkerReviewsPage /> },
          { path: '/profile', element: <ProfilePage /> },
          { path: '/settings', element: <SettingsPage /> },
          { path: '/help', element: <HelpSupportPage /> },
          { path: '/support', element: <HelpSupportPage /> },
          { path: '/reports/:id', element: <ReportViewer /> },
          { path: '/reports', element: <ReportViewer /> },

          // Client-accessible Routes
          {
            element: <ProtectedRoute allowedRoles={[Role.CLIENT, Role.ADMIN]} />,
            children: [
              { path: '/work-orders/new', element: <ServiceRequestForm /> },
              { path: '/client/dashboard', element: <Navigate to="/dashboard" replace /> },
              { path: '/client/requests', element: <WorkOrderList /> },
              { path: '/client/requests/new', element: <ServiceRequestForm /> },
              { path: '/client/requests/:id', element: <WorkOrderDetail /> },
            ],
          },

          // Field Team Routes
          {
            element: <ProtectedRoute allowedRoles={[Role.FIELD_TEAM, Role.ADMIN]} />,
            children: [
              { path: '/team/dashboard', element: <Navigate to="/dashboard" replace /> },
              { path: '/team/assignments/:id', element: <WorkOrderDetail /> },
              { path: '/team/upload/:id', element: <FieldTeamDashboard /> },
            ],
          },

          // Admin-only Protected Routes
          {
            element: <ProtectedRoute allowedRoles={[Role.ADMIN]} />,
            children: [
              { path: '/categories', element: <CategoryManagement /> },
              { path: '/operations', element: <OperationsManagement /> },
              { path: '/analytics', element: <Navigate to="/dashboard" replace /> },
              { path: '/teams', element: <Navigate to="/operations" replace /> },
              { path: '/admin/dashboard', element: <Navigate to="/dashboard" replace /> },
              { path: '/admin/operations', element: <OperationsManagement /> },
              { path: '/admin/map', element: <LiveTrackingMap /> },
              { path: '/admin/work-orders', element: <WorkOrderList /> },
              { path: '/admin/teams', element: <Navigate to="/operations" replace /> },
              { path: '/admin/categories', element: <CategoryManagement /> },
              { path: '/admin/invoices', element: <InvoiceManagement /> },
              { path: '/admin/analytics', element: <Navigate to="/dashboard" replace /> },
              { path: '/admin/settings', element: <SettingsPage /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

export const AppRouter = () => {
  return <RouterProvider router={router} />;
};
