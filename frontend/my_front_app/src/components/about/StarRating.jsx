import React, { useState } from "react";
import "../../styles/About/StarRating.css";

const StarRating = ({ value, onChange, readOnly = false }) => {
  const [hover, setHover] = useState(0);

  return (
    <div className={`star-rating ${readOnly ? "read-only" : ""}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`star ${star <= (hover || value) ? "filled" : ""}`}
          onClick={() => !readOnly && onChange(star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(0)}
        >
          ★
        </span>
      ))}
    </div>
  );
};

export default StarRating;
