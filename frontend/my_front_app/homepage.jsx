import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div style={styles.page}>

      {/* ── Barre info top ── */}
      <div style={styles.topBar}>
        <span>📞 +237 000 000 000</span>
        <span>✉️ contact@beitalfrica.com</span>
        <span>🔔 Nouvelle version disponible — Plateforme BI & IA v2.0</span>
      </div>
     {/* ── Hero ── */}
      <section style={styles.hero}>

        {/* Contenu gauche */}
        <div style={{
          ...styles.heroLeft,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateX(0)" : "translateX(-60px)",
          transition: "all 1s ease",
        }}>
          <span style={styles.heroBadge}>✦ Plateforme BI & IA — Be I.T Africa</span>
          <h1 style={styles.heroTitle}>
            Analysez vos données{" "}
            <span style={styles.heroTitleAccent}>microfinance</span>{" "}
            en langage naturel
          </h1>
          <p style={styles.heroSubtitle}>
            Posez vos questions en français, obtenez des insights décisionnels
            instantanés, des graphiques et des rapports — sans écrire une ligne de SQL.
          </p>
          <div style={styles.heroBtns}>
            <button
              style={styles.btnPrimary}
              onClick={() => navigate("/login")}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = "0 12px 35px rgba(139,90,43,0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(139,90,43,0.3)";
              }}
            >
              Commencer →
            </button>
            <button
              style={styles.btnSecondary}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(139,90,43,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              En savoir plus
            </button>
          </div>
        </div>

        {/* Image droite avec forme organique */}
        <div style={{
          ...styles.heroRight,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateX(0)" : "translateX(60px)",
          transition: "all 1s ease 0.3s",
        }}>
          {/* Forme SVG organique par-dessus l'image */}
          <div style={styles.imageWrapper}>
            <img
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&q=80"
              alt="Dashboard analytique"
              style={styles.heroImage}
            />
            {/* Masque SVG forme organique gauche */}
            <svg
              style={styles.svgMask}
              viewBox="0 0 200 600"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
            >
              <path
                d="M0,0 L200,0 L200,600 L0,600
                   Q80,500 40,420
                   Q0,340 80,260
                   Q160,180 40,100
                   Q0,60 0,0 Z"
                fill="#f5f0e8"
              />
            </svg>
          </div>
        </div>

      </section>

      {/* ── Section stats ── */}
      <section style={styles.statsSection}>
        {[
          { value: "98%", label: "Précision SQL" },
          { value: "< 3s", label: "Temps de réponse" },
          { value: "RBAC", label: "Sécurité par rôle" },
          { value: "RAG", label: "Contexte sémantique" },
        ].map((stat, i) => (
          <StatCard key={i} value={stat.value} label={stat.label} delay={i * 0.15} />
        ))}
      </section>

      {/* ── Section features ── */}
      <section style={styles.featuresSection}>
        <h2 style={styles.sectionTitle}>Ce que fait la plateforme</h2>
        <p style={styles.sectionSubtitle}>
          Une suite complète d'outils analytiques pilotés par l'intelligence artificielle
        </p>
        <div style={styles.featuresGrid}>
          {[
            { icon: "💬", title: "Chat en langage naturel", desc: "Posez vos questions comme à un analyste. L'agent comprend, reformule et valide avant d'agir." },
            { icon: "🔒", title: "Sécurité RBAC stricte", desc: "Chaque requête est auditée selon votre rôle. Aucune donnée hors périmètre n'est accessible." },
            { icon: "📈", title: "Visualisations ECharts", desc: "Graphiques interactifs générés automatiquement selon la nature des données retournées." },
            { icon: "📄", title: "Rapports analytiques", desc: "Export de rapports PDF rédigés en langage professionnel par l'agent IA." },
            { icon: "⚡", title: "Cache intelligent", desc: "Les requêtes fréquentes sont mises en cache Redis pour des réponses instantanées." },
            { icon: "🧠", title: "Mémoire contextuelle", desc: "L'historique de vos conversations est conservé et injecté pour des réponses cohérentes." },
          ].map((f, i) => (
            <FeatureCard key={i} icon={f.icon} title={f.title} desc={f.desc} delay={i * 0.1} />
          ))}
        </div>
      </section>
    </div>
  );
};

/* ── Composants internes ── */

const StatCard = ({ value, label, delay }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 400 + delay * 1000);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      style={{
        ...styles.statCard,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(30px)",
        transition: "all 0.6s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-6px)";
        e.currentTarget.style.borderColor = "#c8a96e";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = "rgba(200,169,110,0.2)";
      }}
    >
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
};



/* ── Styles ── */
const styles = {
  page: {
    fontFamily: "'Segoe UI', sans-serif",
    background: "#f5f0e8",
    minHeight: "100vh",
    overflowX: "hidden",
  },

  topBar: {
    background: "#2c1a0e",
    color: "#c8b99a",
    fontSize: 12,
    padding: "8px 60px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  navbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 60px",
    background: "#f5f0e8",
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "0 2px 12px rgba(44,26,14,0.08)",
  },
  navLogo: { display: "flex", alignItems: "center", gap: 10 },
  navLogoIcon: { fontSize: 22 },
  navLogoText: { color: "#2c1a0e", fontWeight: 800, fontSize: 20 },
  navLinks: { display: "flex", gap: 36 },
  navLink: {
    color: "#2c1a0e",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 600,
    transition: "color 0.2s",
  },
  navBtn: {
    background: "transparent",
    border: "2px solid #2c1a0e",
    color: "#2c1a0e",
    padding: "8px 24px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    transition: "all 0.2s",
  },

  hero: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: "88vh",
    background: "#f5f0e8",
    overflow: "hidden",
    position: "relative",
  },

  heroLeft: {
    maxWidth: 520,
    padding: "80px 0 80px 60px",
    zIndex: 2,
  },
  heroBadge: {
    display: "inline-block",
    background: "rgba(139,90,43,0.1)",
    color: "#8b5a2b",
    padding: "6px 16px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 24,
    border: "1px solid rgba(139,90,43,0.25)",
  },
  heroTitle: {
    fontSize: 46,
    fontWeight: 800,
    color: "#2c1a0e",
    lineHeight: 1.2,
    marginBottom: 20,
  },
  heroTitleAccent: { color: "#8b5a2b" },
  heroSubtitle: {
    fontSize: 16,
    color: "#6b5344",
    lineHeight: 1.8,
    marginBottom: 36,
  },
  heroBtns: { display: "flex", gap: 16, alignItems: "center" },
  btnPrimary: {
    background: "#8b5a2b",
    color: "#fff",
    border: "none",
    padding: "14px 32px",
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 6px 20px rgba(139,90,43,0.3)",
    transition: "all 0.2s",
  },
  btnSecondary: {
    background: "transparent",
    color: "#8b5a2b",
    border: "2px solid #8b5a2b",
    padding: "14px 32px",
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s",
  },

  heroRight: {
    flex: 1,
    position: "relative",
    height: "88vh",
    minWidth: 0,
  },
  imageWrapper: {
    position: "relative",
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center",
    display: "block",
  },
  svgMask: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    width: "220px",
    zIndex: 1,
  },

  statsSection: {
    display: "flex",
    justifyContent: "center",
    gap: 24,
    padding: "60px",
    background: "#2c1a0e",
    flexWrap: "wrap",
  },
  statCard: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(200,169,110,0.2)",
    borderRadius: 12,
    padding: "28px 40px",
    textAlign: "center",
    cursor: "default",
    transition: "all 0.3s ease",
  },
  statValue: { fontSize: 36, fontWeight: 800, color: "#c8a96e", marginBottom: 8 },
  statLabel: { fontSize: 13, color: "#a89070", fontWeight: 500 },

  featuresSection: { padding: "90px 60px", background: "#faf8f5" },
  sectionTitle: {
    textAlign: "center",
    fontSize: 34,
    fontWeight: 800,
    color: "#2c1a0e",
    marginBottom: 12,
  },
  sectionSubtitle: {
    textAlign: "center",
    color: "#7a6555",
    fontSize: 15,
    marginBottom: 50,
  },
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 24,
    maxWidth: 1100,
    margin: "0 auto",
  },
  featureCard: {
    background: "#fff",
    border: "1.5px solid rgba(139,90,43,0.15)",
    borderRadius: 14,
    padding: "32px 28px",
    cursor: "default",
    transition: "all 0.3s ease",
  },
  featureIcon: { fontSize: 32, marginBottom: 16 },
  featureTitle: { fontSize: 17, fontWeight: 700, color: "#2c1a0e", marginBottom: 10 },
  featureDesc: { fontSize: 14, color: "#7a6555", lineHeight: 1.7 },

  footer: { background: "#2c1a0e", padding: "28px 60px" },
  footerInner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLogo: { display: "flex", alignItems: "center", fontSize: 20 },
  footerText: { color: "#6b5344", fontSize: 13 },
};

export default HomePage;