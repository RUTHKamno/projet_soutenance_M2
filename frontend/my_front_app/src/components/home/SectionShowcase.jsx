import React, { useEffect, useRef, useState } from "react";
import "../../styles/home/SectionShowcase.css";

const SectionShowcase = ({
  title,
  label,
  icon = "📘",
  image,
  badge,
  description,
  reverse,
}) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry], obs) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(entry.target);
        }
      },
      { threshold: 0.18 },
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className={`section-showcase ${visible ? "visible" : ""} ${reverse ? "reverse" : ""}`}
    >
      <div className="section-inner">
        <div className="section-copy">
          <div className="section-title-wrapper">
            <span className="section-label">{label}</span>
            <div className="section-title-row">
              <span className="section-title-icon">{icon}</span>
              <h2 className="section-title">{title}</h2>
            </div>
          </div>
          <p className="section-description">{description}</p>
        </div>
        <div className="section-media">
          <img src={image} alt={title} className="section-image" />
          <div className="section-badge">
            {badge.split("\n").map((line, index) => (
              <span key={index}>{line}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SectionShowcase;
