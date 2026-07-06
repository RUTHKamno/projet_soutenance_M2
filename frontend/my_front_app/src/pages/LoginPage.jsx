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
          className={`walk-card-wrapper ${animationDone ? "arrived" : "walking"}`}
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

              <div className="auth-field">
                <label htmlFor="password">Mot de passe</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
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
