import { useEffect, useRef, useState } from 'react'
import "../../styles/home/FeatureCard.css";

const FeaturesSection = ({ icon, title, desc, longDesc, delay }) => {
  const [visible, setVisible] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const ref = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry], observer) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.18 }
    );

    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`featureCard ${flipped ? 'flipped' : ''} ${visible ? 'show-card' : ''}`}
      onClick={() => setFlipped((prev) => !prev)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-8px)";
        e.currentTarget.style.borderColor = "#8b5a2b";
        e.currentTarget.style.boxShadow = "0 12px 30px rgba(139,90,43,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = "rgba(139,90,43,0.15)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div className={`featureCardInner ${flipped ? 'flipped' : ''}`}>
        <div className='featureFace front'>
          <div className='featureIcon'>{icon}</div>
          <h3 className='featureTitle'>{title}</h3>
          <p className='featureDesc'>{desc}</p>
        </div>
        <div className='featureFace back'>
          {/* <h3 className='featureBackTitle'>{title}</h3> */}
          <p className='featureBackDesc'>{longDesc}</p>
        </div>
      </div>
    </div>
  );
};

export default FeaturesSection