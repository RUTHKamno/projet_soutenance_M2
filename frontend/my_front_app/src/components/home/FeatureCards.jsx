import React from 'react'
import {features} from "../../data/homeData"
import FeaturesSection from './FeaturesSection'

import "../../styles/home/FeatureCard.css";

const FeatureCards = () => {
  return (
        <section className='featuresSection'>
        <h2 className='sectionTitle'>Ce que fait la plateforme</h2>
        <p className='sectionSubtitle'>
          Une suite complète d'outils analytiques pilotés par l'intelligence artificielle
        </p>
        <div className='featuresGrid'> 
          {features.map((f, i) => (
            <FeaturesSection
              key={i}
              icon={f.icon}
              title={f.title}
              desc={f.description}
              longDesc={f.description_longue}
              delay={i * 0.1}
            />
          ))}
        </div>
      </section>
  )
}

export default FeatureCards