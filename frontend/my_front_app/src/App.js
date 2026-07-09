import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Layout from "./components/layout/Layout";
import LoginPage from "./pages/LoginPage";
import UpdateUserInfo from "./pages/UpdateUserInfo";
import DashboardPage from "./pages/DashboardPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AProposPage from "./pages/AProposPage";

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
                <DashboardPage />
              </ProtectedRoute>
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
