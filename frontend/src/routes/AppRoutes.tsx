import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoutes';
import { Login } from '../pages/auth/Login';
import { Dashboard } from '../pages/Dashboard';
import { Cases } from '../pages/Cases';
import { CaseDetails } from '../pages/CaseDetails';
// import { Documents } from '../pages/Documents';
// import { DocumentDetails } from '../pages/DocumentDetails';
// import { Evidence } from '../pages/Evidence';
// import { AuditLog } from '../pages/AuditLog';
// import { Security } from '../pages/Security';
// import { Users } from '../pages/Users';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<Login />} />

      {/* Authenticated Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cases"
        element={
          <ProtectedRoute>
            <Cases />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cases/:id"
        element={
          <ProtectedRoute>
            <CaseDetails />
          </ProtectedRoute>
        }
      />

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
