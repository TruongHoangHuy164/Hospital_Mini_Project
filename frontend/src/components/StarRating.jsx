import React from 'react';

export default function StarRating({ value = 0, size = 20, onChange, readOnly = false }) {
  const stars = [1, 2, 3, 4, 5];
  const handleClick = (n) => {
    if (readOnly || !onChange) return;
    onChange(n);
  };
  return (
    <div className="star-rating" aria-label={`Rating ${value} out of 5`}>
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          className={`star ${n <= value ? 'filled' : ''}`}
          style={{ fontSize: size }}
          onClick={() => handleClick(n)}
          disabled={readOnly}
          aria-label={`${n} star${n>1?'s':''}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
