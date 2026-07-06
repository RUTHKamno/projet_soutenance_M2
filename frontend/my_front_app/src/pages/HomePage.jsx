import React, { useEffect, useRef, useState } from "react";
import FeatureCards from "../components/home/FeatureCards";
import Hero from "../components/home/Hero";
import SectionShowcase from "../components/home/SectionShowcase";
import TestimonialsCarousel from "../components/home/TestimonialsCarousel";
import { sections } from "../data/sectionData";
import "../styles/home/HomePage.css";
import StatsSection from "../components/home/StatsSection";
import OceanBackground from "../components/home/OceanBackground";

const HomePage = () => {
  const statsRef = useRef(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const updateBackToTopVisibility = () => {
      if (!statsRef.current) {
        setShowBackToTop(false);
        return;
      }

      const rect = statsRef.current.getBoundingClientRect();
      const isStatsVisible =
        rect.top < window.innerHeight * 0.85 &&
        rect.bottom > window.innerHeight * 0.15;
      const scrolledEnough = window.scrollY > 120;
      setShowBackToTop(scrolledEnough && !isStatsVisible);
    };

    updateBackToTopVisibility();
    window.addEventListener("scroll", updateBackToTopVisibility, {
      passive: true,
    });
    window.addEventListener("resize", updateBackToTopVisibility);

    return () => {
      window.removeEventListener("scroll", updateBackToTopVisibility);
      window.removeEventListener("resize", updateBackToTopVisibility);
    };
  }, []);

  return (
    <div className="page">
      {/* ── Hero ── */}
      <Hero />

      {/* ── Section stats ── */}
      <div ref={statsRef}>
        <StatsSection />
      </div>

      <div className="section-splash section-splash--small">
        <div className="section-splash-content">
          <span className="section-splash-pretitle">Platforme BI & IA</span>
          <h2 className="section-splash-title">
            Transformez vos données microfinance en décisions d’impact.
          </h2>
        </div>
      </div>

      {/* ── Unified showcase sections ── */}
      <div className="showcase-zone">
        <OceanBackground />
        {sections.map((section, index) => (
          <SectionShowcase
            key={section.key}
            {...section}
            reverse={index % 2 === 1}
          />
        ))}
      </div>

      {/* ── Testimonials carousel ── */}
      <TestimonialsCarousel />

      {/* ── Section features ── */}
      <FeatureCards />

      {showBackToTop && (
        <button
          className="back-to-top"
          aria-label="Retour en haut"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 19V6" />
            <path d="M5 13l7-7 7 7" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default HomePage;
