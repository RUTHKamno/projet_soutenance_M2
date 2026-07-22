import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import analyticsImage from "../../assets/img/home/home-analytics-1.png";
import {
  hasValidToken,
  getUserRoleFromStorage,
} from "../../utils/tokenUtils.js";
import "../../styles/Hero.css";

const Hero = () => {
  const navigate = useNavigate();
  const authRequired = !hasValidToken();
  const userRole = getUserRoleFromStorage();
  const primaryTarget = authRequired
    ? "/login"
    : userRole === "admin"
      ? "/admin"
      : "/dashboard";

  const [visible, setVisible] = useState(false);

  // Dans le composant, ajoute ces refs et cet effet AVANT le return :
  const wave1Ref = useRef(null);
  const wave2Ref = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let t = 0;

    const animate = () => {
      t += 0.02;

      const amp1 = 18 + Math.sin(t) * 6;
      const amp2 = 14 + Math.cos(t * 0.8) * 5;

      const p1 = `
      M0,0 L${amp1},0
      C${amp1},0 ${amp1 + 18},4 ${amp1 + 18},10
      C${amp1 + 18},16 ${amp1},19 ${amp1},25
      C${amp1},31 ${amp1 + 20},34 ${amp1 + 20},40
      C${amp1 + 20},46 ${amp1},48 ${amp1},54
      C${amp1},60 ${amp1 + 20},62 ${amp1 + 20},68
      C${amp1 + 20},74 ${amp1},76 ${amp1},82
      C${amp1},88 ${amp1 + 18},91 ${amp1 + 18},96
      C${amp1 + 18},100 ${amp1},100 ${amp1},100
      L0,100 Z
    `;

      const p2 = `
      M0,0 L${amp2},0
      C${amp2},0 ${amp2 + 16},3 ${amp2 + 16},9
      C${amp2 + 16},15 ${amp2},18 ${amp2},24
      C${amp2},30 ${amp2 + 18},32 ${amp2 + 18},38
      C${amp2 + 18},44 ${amp2},46 ${amp2},52
      C${amp2},58 ${amp2 + 18},60 ${amp2 + 18},66
      C${amp2 + 18},72 ${amp2},74 ${amp2},80
      C${amp2},86 ${amp2 + 16},89 ${amp2 + 16},94
      C${amp2 + 16},99 ${amp2},100 ${amp2},100
      L0,100 Z
    `;

      if (wave1Ref.current) wave1Ref.current.setAttribute("d", p1);
      if (wave2Ref.current) wave2Ref.current.setAttribute("d", p2);

      requestAnimationFrame(animate);
    };

    const raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section className="hero">
      {/* Partie gauche */}

      <div className={`hero-left ${visible ? "show-left" : ""}`}>
        <span className="hero-badge">✦ Plateforme BI & IA — Be IT Africa</span>

        <h1 className="hero-title">
          Analysez vos données <span className="hero-accent">microfinance</span>{" "}
          en langage naturel
        </h1>

        <p className="hero-subtitle">
          Posez vos questions en français, obtenez des insights décisionnels
          instantanés, des graphiques et des rapports sans écrire une seule
          ligne de SQL.
        </p>

        <div className="hero-buttons">
          <button
            className="btn-primary"
            onClick={() => navigate(primaryTarget)}
          >
            Commencer →
          </button>
        </div>
      </div>

      {/* Partie droite */}

      {/* Partie droite */}
      <div className={`hero-right ${visible ? "show-right" : ""}`}>
        <div className="image-wrapper">
          <img
            src={analyticsImage}
            alt="Dashboard analytique"
            className="hero-image"
          />
          {/* Forme organique SVG inline — couleur identique au fond */}
          <svg
            className="hero-svg-mask"
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            <path ref={wave2Ref} fill="rgba(255,255,255,0.35)" />
            <path ref={wave1Ref} fill="white" />
          </svg>
        </div>
      </div>
    </section>
  );
};

export default Hero;
