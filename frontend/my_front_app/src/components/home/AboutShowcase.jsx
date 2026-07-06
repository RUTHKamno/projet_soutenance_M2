import React, { useEffect, useRef, useState } from 'react'
import '../../styles/home/AboutShowcase.css'

const AboutShowcase = ({ title = "L'intelligence de vos données, en toute simplicité", image = '/images/showcase.jpg', badge = '15 +\nyears of\nexperience', children }) => {
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
          {/* <div className="about-label">{title}</div> */}
          <h2 className="about-title">{title}</h2>
          <div className="about-text">
            {children ? (
              children
            ) : (
              <p>
                Nous croyons que l’accès aux indicateurs stratégiques ne devrait pas être une affaire de techniciens, mais un levier pour chaque décideur.

                Notre plateforme transforme la complexité de vos bases de données en un espace de dialogue intuitif. D'une simple question en langage naturel, obtenez instantanément des analyses financières de haute précision, des insights métier pointus et des visualisations performantes.

                Notre objectif ? Vous libérer des contraintes techniques pour vous permettre de piloter votre institution avec clarté, agilité et efficacité.

                Analysez vos données microfinance en langage naturel, et concentrez-vous sur l'essentiel : vos objectifs.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default AboutShowcase
