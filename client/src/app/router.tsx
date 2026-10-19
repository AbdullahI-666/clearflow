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

// Dashboard Components
import { AdminDashboard } from '../features/dashboard/components/AdminDashboard';
import { ClientDashboard } from '../features/dashboard/components/ClientDashboard';
import { FieldTeamDashboard } from '../features/dashboard/components/FieldTeamDashboard';

// Work Orders Components
import { WorkOrderList } from '../features/work-orders/components/WorkOrderList';
import { ServiceRequestForm } from '../features/work-orders/components/ServiceRequestForm';
import { WorkOrderDetail } from '../features/work-orders/components/WorkOrderDetail';

// Admin Domain Components
import { CategoryManagement } from '../features/categories/components/CategoryManagement';
import { InvoiceManagement } from '../features/invoices/components/InvoiceManagement';
import { LiveTrackingMap } from '../features/tracking/components/LiveTrackingMap';
import { ChatWindow } from '../features/chat/components/ChatWindow';
import { AnalyticsDashboard } from '../features/analytics/components/AnalyticsDashboard';
import { TeamList } from '../features/teams/components/TeamList';
import { NotificationList } from '../features/notifications/components/NotificationList';
import { ProfilePage } from '../features/profile/components/ProfilePage';
import { SettingsPage } from '../features/settings/components/SettingsPage';
import { ReportViewer } from '../features/reports/components/ReportViewer';
import { NotFound } from '../shared/components/NotFound';

const RoleDashboard = () => {
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();

  if (role === 'admin') {
    return <AdminDashboard />;
  }
  if (role === 'fieldteam' || role === 'field_team' || role === 'field-team') {
    return <FieldTeamDashboard />;
  }
  return <ClientDashboard />;
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginForm /> },
      { path: '/register', element: <RegisterForm /> },
      { path: '/forgot-password', element: <ForgotPasswordForm /> },
      { path: '/reset-password/:token', element: <ResetPasswordForm /> },
      { path: '/verify-email/:token', element: <VerifyEmail /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          // General Authenticated Routes (all roles)
          { path: '/dashboard', element: <RoleDashboard /> },
          { path: '/work-orders', element: <WorkOrderList /> },
          { path: '/work-orders/:id', element: <WorkOrderDetail /> },
          { path: '/chat', element: <ChatWindow /> },
          { path: '/chat/:workOrderId', element: <ChatWindow /> },
          { path: '/notifications', element: <NotificationList /> },
          { path: '/profile', element: <ProfilePage /> },
          { path: '/reports/:id', element: <ReportViewer /> },
          { path: '/reports', element: <ReportViewer /> },

          // Client-accessible Routes
          {
            element: <ProtectedRoute allowedRoles={[Role.CLIENT, Role.ADMIN]} />,
            children: [
              { path: '/work-orders/new', element: <ServiceRequestForm /> },
              { path: '/client/dashboard', element: <ClientDashboard /> },
              { path: '/client/requests', element: <WorkOrderList /> },
              { path: '/client/requests/new', element: <ServiceRequestForm /> },
              { path: '/client/requests/:id', element: <WorkOrderDetail /> },
            ],
          },

          // Field Team Routes
          {
            element: <ProtectedRoute allowedRoles={[Role.FIELD_TEAM, Role.ADMIN]} />,
            children: [
              { path: '/team/dashboard', element: <FieldTeamDashboard /> },
              { path: '/team/assignments/:id', element: <WorkOrderDetail /> },
              { path: '/team/upload/:id', element: <FieldTeamDashboard /> },
            ],
          },

          // Admin-only Protected Routes
          {
            element: <ProtectedRoute allowedRoles={[Role.ADMIN]} />,
            children: [
              { path: '/categories', element: <CategoryManagement /> },
              { path: '/invoices', element: <InvoiceManagement /> },
              { path: '/tracking', element: <LiveTrackingMap /> },
              { path: '/analytics', element: <AnalyticsDashboard /> },
              { path: '/teams', element: <TeamList /> },
              { path: '/settings', element: <SettingsPage /> },
              { path: '/admin/dashboard', element: <AdminDashboard /> },
              { path: '/admin/map', element: <LiveTrackingMap /> },
              { path: '/admin/work-orders', element: <WorkOrderList /> },
              { path: '/admin/teams', element: <TeamList /> },
              { path: '/admin/categories', element: <CategoryManagement /> },
              { path: '/admin/invoices', element: <InvoiceManagement /> },
              { path: '/admin/analytics', element: <AnalyticsDashboard /> },
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
