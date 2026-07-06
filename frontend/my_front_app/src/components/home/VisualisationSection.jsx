import React, { useEffect, useRef, useState } from 'react'
import '../../styles/home/AboutShowcase.css'

const VisualisationSection = ({ title = "Vos indicateurs clés, centralisés et visuels", image = '/images/showcase.jpg', badge = '15 +\nyears of\nexperience', children }) => {
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
        
        <div className="about-media">
          <img src={image} alt={title} className="about-image" />
          <div className="about-badge">
            {badge.split('\n').map((line, i) => (
              <span key={i}>{line}</span>
            ))}
          </div>
        </div>
        <div className="about-copy">
          <div className="about-label">De la donnée brute aux tableaux de bord stratégiques.</div>
          <h2 className="about-title">{title}</h2>
          <div className="about-text">
            {children ? (
              children
            ) : (
              <p>
                
                Ne naviguez plus à vue dans des fichiers d'extraction complexes. Notre plateforme
                consolide instantanément l'ensemble de vos flux opérationnels 
                pour les transformer en graphiques clairs, dynamiques et actionnables.

                Accédez en un clin d'œil à une vue globale et interactive de votre institution : 
                suivi de l'encours de crédit, évolution des taux de remboursement, 
                répartition géographique des risques ou performance de vos agences. 
                Conçus spécifiquement pour le pilotage de la microfinance, 
                ces tableaux de bord vous offrent une aide à la décision immédiate pour 
                anticiper les tendances et valider vos choix stratégiques.
              </p>
            )}
          </div>
        </div>

      </div>
    </section>
  )
}

export default VisualisationSection
