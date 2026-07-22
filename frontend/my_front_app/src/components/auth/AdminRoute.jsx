import React from "react";
import { Navigate } from "react-router-dom";
import { getToken, getUserRoleFromToken } from "../../utils/tokenUtils.js";

/**
 * Protège une route : redirige vers /login si non connecté,
 * vers /dashboard si connecté mais pas admin.
 */
const AdminRoute = ({ children }) => {
  const token = getToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const role = getUserRoleFromToken(token);
  if (role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default AdminRoute;
