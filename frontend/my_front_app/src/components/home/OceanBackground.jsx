import React, { useEffect, useRef } from "react";
import "../../styles/home/OceanBackground.css";

const OceanBackground = () => {
  const pathRef = useRef(null);

  useEffect(() => {
    let t = 0;
    let raf;

    const animate = () => {
      t += 0.006;

      // Amplitude et phase de chaque point de contrôle de la vague
      const a1 = 100 + Math.sin(t) * 18;
      const a2 = 160 + Math.sin(t + 1.2) * 22;
      const a3 = 215 + Math.sin(t + 2.4) * 18;
      const a4 = 222 + Math.sin(t + 3.6) * 20;
      const a5 = 200 + Math.sin(t + 4.8) * 16;

      const d = `
        M0,${a1}
        C150,${a1 - 40} 280,${a1 - 10} 400,${a2 - 30}
        C540,${a2 + 10} 650,${a2 + 30} 780,${a3 - 10}
        C900,${a3 + 20} 1000,${a3 + 30} 1100,${a4 - 10}
        C1180,${a4 + 10} 1250,${a5 - 10} 1300,${a5}
        L1300,500
        L0,500
        Z
      `;

      if (pathRef.current) pathRef.current.setAttribute("d", d);
      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg
      className="ocean-bg"
      viewBox="0 0 1300 500"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      <path ref={pathRef} fill="url(#oceanGradient)" />
      <defs>
        <linearGradient id="oceanGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6f1dc" />
          <stop offset="100%" stopColor="#fffae8" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default OceanBackground;
