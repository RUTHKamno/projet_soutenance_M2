import React from "react";
import { Navigate } from "react-router-dom";
import { hasValidToken } from "../../utils/tokenUtils.js";

const ProtectedRoute = ({ children }) => {
  if (!hasValidToken()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default ProtectedRoute;
