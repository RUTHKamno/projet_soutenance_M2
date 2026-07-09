import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";
import OceanBackground from "../components/home/OceanBackground";
import LoginCharacter from "../assets/img/auth/business_vision-1.gif";
import logo from "../assets/logo/logo_png.png";
import "../styles/Auth/AuthPages.css";
import "../styles/Navbar.css";

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimationDone(true), 1900);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await authApi.signIn(email, password);
      sessionStorage.setItem("token", result.token);
      setLoginSuccess(true);
      // navigate("/chat");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGo = (path) => {
    try {
      navigate(path);
    } catch (e) {
      // fallback to full redirect if router navigation fails
      window.location.href = path;
    }
  };

  return (
    <div className="auth-page auth-page-walk">
      <div className="auth-bg-zone">
        <OceanBackground />
      </div>

      {/* Scène d'arrivée : personnage qui tire la carte */}
      <div className="walk-scene">
        <div
          className={`walk-card-wrapper ${animationDone ? "arrived" : "walking"} ${loginSuccess ? "leaving" : ""}`}
        >
          {/* Bulle de message au-dessus, apparaît seulement après arrivée */}
          <div
            className={`walk-message ${animationDone ? "show-message" : ""} ${loginSuccess ? "message-success" : ""}`}
          >
            {!loginSuccess ? (
              <>
                L'administrateur vous a attribué une adresse e-mail et un mot de
                passe. Remplissez ce formulaire avec ces informations pour
                accéder à votre espace.
              </>
            ) : (
              <>
                <p className="walk-message-text">
                  Connexion réussie ! Pour votre sécurité, nous vous
                  recommandons de modifier votre mot de passe attribué par
                  l'administrateur.
                </p>
                <div className="walk-message-actions">
                  <button
                    type="button"
                    className="walk-btn-secondary"
                    onClick={() => handleGo("/dashboard")}
                  >
                    Consulter le dashboard
                  </button>
                  <button
                    type="button"
                    className="walk-btn-primary"
                    onClick={() => handleGo("/profile")}
                  >
                    Modifier →
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Carte formulaire tirée par le personnage */}
          <div className="auth-card walk-card">
            <div className="auth-logo">
              <button
                type="button"
                className="navLogo"
                onClick={() => {
                  if (window.location.pathname === "/") {
                    window.location.reload();
                  } else {
                    navigate("/");
                  }
                }}
                aria-label="Retour à l'accueil"
              >
                <img
                  src={logo}
                  alt="Be IT Africa logo"
                  className="navLogoImage"
                />
                <span className="navLogoText">Be IT Africa</span>
              </button>
            </div>

            <span className="auth-badge">✦ Plateforme BI & IA</span>

            <h1 className="auth-title">Connexion</h1>
            <p className="auth-subtitle">
              Accédez à votre espace décisionnel microfinance.
            </p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@beitafrica.com"
                  required
                />
              </div>

              <div className="auth-field auth-field-password">
                <label htmlFor="password">Mot de passe</label>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a2 2 0 1 0 2.8 2.8" />
                      <path d="M9.1 5.1A11.4 11.4 0 0 1 12 4.5c4.2 0 7.8 2.4 10 6.5a12.3 12.3 0 0 1-2.2 3.1" />
                      <path d="M6.4 7.9A12.8 12.8 0 0 0 2 10.9c1.9 3.3 4.5 5.7 7.5 7.1" />
                      <path d="M15.7 15.7a12.2 12.2 0 0 0 3.5-4.8" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="3.2" />
                    </svg>
                  )}
                </button>
              </div>

              <button
                type="submit"
                className="btn-primary auth-submit"
                disabled={loading}
              >
                {loading ? "Connexion..." : "Se connecter →"}
              </button>
            </form>

            <p className="auth-footnote">
              Vos identifiants vous ont été transmis par votre administrateur.
            </p>
          </div>

          {/* Personnage qui tire la carte, marche puis s'arrête */}
          <img
            src={LoginCharacter}
            alt=""
            className={`walk-character ${animationDone ? "character-stopped" : "character-walking"}`}
          />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
