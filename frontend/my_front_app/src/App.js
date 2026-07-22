import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Layout from "./components/layout/Layout";
import LoginPage from "./pages/LoginPage";
import UpdateUserInfo from "./pages/UpdateUserInfo";
import DashboardPage from "./pages/DashboardPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AProposPage from "./pages/AProposPage";
import AdminRoute from "./components/auth/AdminRoute";
import AdminDashboard from "./pages/AdminDashboard";
import { getUserRoleFromStorage } from "./utils/tokenUtils";
import ChatMediaPage from "./pages/ChatMediaPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile" element={<UpdateUserInfo />} />
          {/* <Route path="/dashboard" element={<DashboardPage />} /> */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                {getUserRoleFromStorage() === "admin" ? (
                  <Navigate to="/admin" replace />
                ) : (
                  <DashboardPage />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          {/* <Route path="/chat" element={<ChatPage />} /> */}
          <Route
            path="/a-propos"
            element={
              <ProtectedRoute>
                <AProposPage />
              </ProtectedRoute>
            }
          />
          {/* medias chats */}
          <Route path="/chats/:userId" element={<ChatMediaPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
