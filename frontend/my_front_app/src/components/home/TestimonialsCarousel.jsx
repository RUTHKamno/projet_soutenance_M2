import React, { useEffect, useState } from "react";
import "../../styles/home/TestimonialsCarousel.css";
import { useCommentaires } from "../../hooks/useCommentaires";

const TestimonialsCarousel = () => {
  const { commentaires, loading, error } = useCommentaires();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (commentaires.length === 0) {
      setActiveIndex(0);
      return undefined;
    }

    const interval = setInterval(
      () => setActiveIndex((current) => (current + 1) % commentaires.length),
      6000,
    );
    return () => clearInterval(interval);
  }, [commentaires.length]);

  useEffect(() => {
    if (activeIndex >= commentaires.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, commentaires.length]);

  const testimonial = commentaires[activeIndex] || {};

  return (
    <section className="testimonials-section">
      <div className="testimonials-inner">
        <div className="testimonials-heading">
          <span className="testimonials-tag">Témoignages</span>
          <h2 className="testimonials-title">Ils nous font déjà confiance</h2>
        </div>

        {loading ? (
          <p className="testimonial-loading">Chargement des témoignages...</p>
        ) : error ? (
          <p className="testimonial-error">{error}</p>
        ) : commentaires.length === 0 ? (
          <p className="testimonial-empty">
            Aucun témoignage disponible pour le moment.
          </p>
        ) : (
          <>
            <p className="testimonial-quote">“{testimonial.commentaire}”</p>

            <div className="testimonial-author">
              <strong>{testimonial.nom}</strong>
              <span>{testimonial.note} / 5</span>
            </div>

            <div className="testimonial-controls">
              {commentaires.map((item, index) => (
                <button
                  key={item.id || `${item.nom}-${index}`}
                  type="button"
                  className={`testimonial-dot ${index === activeIndex ? "active" : ""}`}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Voir le témoignage de ${item.nom}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default TestimonialsCarousel;
