import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  hasValidToken,
  clearToken,
  getUserRoleFromStorage,
} from "../../utils/tokenUtils.js";
import { authApi } from "../../api/authApi.js";
import "../../styles/Navbar.css";
import logo from "../../assets/logo/logo_png.png";

const Navbar = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const authRequired = !hasValidToken();
  const userRole = getUserRoleFromStorage();
  const isAdmin = userRole === "admin";

  // Construction dynamique des liens de navigation
  const baseLinks = isAdmin
    ? [
        { name: "Accueil", to: "/" },
        { name: "Dashboard", to: "/admin" },
      ]
    : [
        { name: "Accueil", to: "/" },
        { name: "Dashboards", to: "/dashboard" },
        { name: "A Propos", to: "/a-propos" },
      ];

  // On ajoute l'onglet "Mes médias" uniquement si un utilisateur est connecté et possède un id
  const navLinks = user?.id
    ? [...baseLinks, { name: "Mes médias", to: `/chats/${user.id}` }]
    : baseLinks;

  const getAvatarLetters = (first, last) => {
    const firstInitial = first?.trim()?.[0] || "";
    const lastInitial = last?.trim()?.[0] || "";
    return `${firstInitial}${lastInitial}`.toUpperCase();
  };

  const handleLinkClick = (event, to) => {
    event.preventDefault();
    setMenuOpen(false);
    if (authRequired && to !== "/") {
      navigate("/login");
    } else {
      navigate(to);
    }
  };

  const toggleMenu = () => setMenuOpen((current) => !current);

  const handleLogout = () => {
    clearToken();
    setUser(null);
    setProfileOpen(false);
    setMenuOpen(false);
    navigate("/login");
  };

  useEffect(() => {
    if (!authRequired) {
      authApi
        .getMe()
        .then((data) => setUser(data))
        .catch(() => setUser(null));
    }
  }, [authRequired]);

  const profileAvatar = user
    ? getAvatarLetters(user.first_name, user.last_name)
    : "";

  const profileName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
    : "Utilisateur";

  const profileEmail = user?.email || "";
  const profileRole = user?.role || "";
  const profileAgence = user?.agence || "";

  return (
    <>
      {/* Barre supérieure */}
      <div className="topBar">
        <span>📞 +237 654 820 309</span>
        <span>✉️ armelnoah41@beitafricagroup.com</span>
      </div>

      {/* Navbar */}
      <nav className="navbar">
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

        <button
          type="button"
          className="navToggle"
          aria-label="Ouvrir le menu"
          aria-expanded={menuOpen}
          onClick={toggleMenu}
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`navLinks ${menuOpen ? "open" : ""}`}>
          {navLinks.map(({ name, to }) => (
            <a
              key={name}
              href={to}
              className="navLink"
              onClick={(event) => handleLinkClick(event, to)}
              onMouseEnter={(e) => (e.target.style.color = "#c8a96e")}
              onMouseLeave={(e) => (e.target.style.color = "#423D02")}
            >
              {name}
            </a>
          ))}
        </div>

        {user ? (
          <div className="navProfileWrapper">
            <button
              type="button"
              className="navAvatar"
              onClick={() => setProfileOpen((current) => !current)}
              aria-haspopup="menu"
              aria-expanded={profileOpen}
            >
              {profileAvatar}
            </button>
            {profileOpen && (
              <div className="navProfileDropdown">
                <div className="navProfileHeader">
                  <div className="navAvatar navAvatar--dropdown">
                    {profileAvatar}
                  </div>
                  <div>
                    <strong>{profileName}</strong>
                    <span>{profileEmail}</span>
                  </div>
                </div>
                <div className="navProfileDetails">
                  <div>
                    <span>Rôle</span>
                    <strong>{profileRole}</strong>
                  </div>
                  <div>
                    <span>Agence</span>
                    <strong>{profileAgence}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  className="navProfileAction"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/profile");
                  }}
                >
                  Modifier le profil
                </button>

                <button
                  type="button"
                  className="navProfileAction navProfileAction--medias"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate(`/chats/${user.id}`);
                  }}
                >
                  Voir mes médias
                </button>
                <button
                  type="button"
                  className="navProfileAction navProfileAction--logout"
                  onClick={handleLogout}
                >
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            className="navBtn"
            onClick={() => {
              setMenuOpen(false);
              navigate("/login");
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#8A7E03";
              e.currentTarget.style.color = "#000";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#423D02";
            }}
          >
            Connexion
          </button>
        )}
      </nav>
    </>
  );
};

export default Navbar;
