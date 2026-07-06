import { useEffect, useRef, useState } from "react";

import "../../styles/home/StatCard.css";

const StatCard = ({ value, label, delay }) => {

    const [visible, setVisible] = useState(false);
    const cardRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry], obs) => {
                if (entry.isIntersecting) {
                    const timer = setTimeout(() => setVisible(true), delay);
                    obs.unobserve(entry.target);
                    return () => clearTimeout(timer);
                }
            },
            { threshold: 0.25 }
        );

        if (cardRef.current) observer.observe(cardRef.current);

        return () => observer.disconnect();

    }, [delay]);

    return (

        <div
            ref={cardRef}
            className={`stat-card ${visible ? "show-card" : ""}`}
        >

            <h2 className="stat-value">

                {value}

            </h2>

            <p className="stat-label">

                {label}

            </p>

        </div>

    );

};

export default StatCard;