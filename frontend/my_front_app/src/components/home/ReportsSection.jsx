import React, { useEffect, useRef, useState } from 'react'
import '../../styles/home/AboutShowcase.css'

const ReportsSection = ({ title = "Vos rapports décisionnels, rédigés en un clic", image = '/images/showcase.jpg', badge = '15 +\nyears of\nexperience', children }) => {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry], observer) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.18 }
    )

    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <section ref={ref} className={`about-showcase ${visible ? 'visible' : ''}`}>
      <div className={`about-inner ${visible ? 'visible' : ''}`}>
        <div className="about-copy">
          <div className="about-label">Le Self-Reporting intelligent pour décrypter vos graphiques.</div>
          <h2 className="about-title">{title}</h2>
          <div className="about-text">
            {children ? (
              children
            ) : (
              <p>
                
                Ne perdez plus de temps à interpréter des courbes ou à rédiger manuellement des synthèses pour vos comités de direction.

                Grâce à notre fonctionnalité de Self-Reporting, notre système analyse instantanément les graphiques et tableaux de bord que vous avez enregistrés pour générer un rapport analytique complet, fluide et entièrement rédigé en langage métier. Chaque tendance, chaque anomalie et chaque indicateur clé de votre activité microfinance vous sont expliqués de manière claire et structurée.

                Exportez vos insights sous forme de rapports explicatifs prêts à l’emploi, faciles à partager et accessibles à tous.
              </p>
            )}
        </div>
        </div>
        <div className="about-media">
          <img src={image} alt={title} className="about-image" />
          <div className="about-badge">
            {badge.split('\n').map((line, i) => (
              <span key={i}>{line}</span>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}

export default ReportsSection
