import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";
import { getRoleLabel } from "../utils/roleLabels";
import OceanBackground from "../components/home/OceanBackground";
import "../styles/Auth/AuthPages.css";
import logo from "../assets/logo/logo_png.png";

const UpdateUserInfo = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    agence: "",
    role: "",
    email: "",
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await authApi.getMe();
        setForm((f) => ({
          ...f,
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          agence: user.agence || "",
          role: user.role,
          email: user.email,
        }));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.new_password && form.new_password !== form.confirm_password) {
      setError("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }
    if (form.new_password && !form.current_password) {
      setError("Le mot de passe actuel est requis pour le changer.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        agence: form.agence || null,
      };
      if (form.new_password) {
        payload.current_password = form.current_password;
        payload.new_password = form.new_password;
      }

      await authApi.updateSelf(payload);
      setSuccess("Profil mis à jour avec succès.");
      setForm((f) => ({
        ...f,
        current_password: "",
        new_password: "",
        confirm_password: "",
      }));
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-bg-zone">
          <OceanBackground />
        </div>
        <div className="auth-card">
          <p className="auth-loading">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-zone">
        <OceanBackground />
      </div>

      <div className="auth-card auth-card-wide">
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
            <img src={logo} alt="Be IT Africa logo" className="navLogoImage" />
            <span className="navLogoText">Be IT Africa</span>
          </button>
        </div>

        <span className="auth-badge">✦ Mon Profil</span>

        <h1 className="auth-title">Mes informations</h1>
        <p className="auth-subtitle">
          Mettez à jour vos informations personnelles. Votre rôle est attribué
          par l'administrateur.
        </p>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field-row">
            <div className="auth-field">
              <label htmlFor="first_name">Prénom</label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                value={form.first_name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="auth-field">
              <label htmlFor="last_name">Nom</label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                value={form.last_name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={form.email} disabled />
          </div>

          <div className="auth-field-row">
            <div className="auth-field">
              <label htmlFor="agence">Agence</label>
              <input
                id="agence"
                name="agence"
                type="text"
                value={form.agence}
                onChange={handleChange}
                placeholder="Ex: Douala Akwa"
                disabled
              />
            </div>
            <div className="auth-field">
              <label htmlFor="role">Rôle</label>
              <select
                id="role"
                value={form.role}
                disabled
                className="auth-select-disabled"
              >
                <option value={form.role}>{getRoleLabel(form.role)}</option>
              </select>
            </div>
          </div>

          <div className="auth-divider">
            <span>Changer le mot de passe (optionnel)</span>
          </div>

          <div className="auth-field auth-field-password">
            <label htmlFor="current_password">Mot de passe actuel</label>
            <input
              id="current_password"
              name="current_password"
              type={showCurrentPassword ? "text" : "password"}
              value={form.current_password}
              onChange={handleChange}
              placeholder="Requis uniquement pour changer le mot de passe"
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowCurrentPassword((v) => !v)}
              aria-label={
                showCurrentPassword
                  ? "Masquer le mot de passe actuel"
                  : "Afficher le mot de passe actuel"
              }
            >
              {showCurrentPassword ? (
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

          <div className="auth-field-row">
            <div className="auth-field auth-field-password">
              <label htmlFor="new_password">Nouveau mot de passe</label>
              <input
                id="new_password"
                name="new_password"
                type={showNewPassword ? "text" : "password"}
                value={form.new_password}
                onChange={handleChange}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowNewPassword((v) => !v)}
                aria-label={
                  showNewPassword
                    ? "Masquer le nouveau mot de passe"
                    : "Afficher le nouveau mot de passe"
                }
              >
                {showNewPassword ? (
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
            <div className="auth-field auth-field-password">
              <label htmlFor="confirm_password">Confirmer</label>
              <input
                id="confirm_password"
                name="confirm_password"
                type={showConfirmPassword ? "text" : "password"}
                value={form.confirm_password}
                onChange={handleChange}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={
                  showConfirmPassword
                    ? "Masquer la confirmation du mot de passe"
                    : "Afficher la confirmation du mot de passe"
                }
              >
                {showConfirmPassword ? (
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
          </div>

          <div className="auth-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate("/chat")}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn-primary auth-submit"
              disabled={saving}
            >
              {saving ? "Enregistrement..." : "Enregistrer →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateUserInfo;
