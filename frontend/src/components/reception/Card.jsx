import React from 'react'

export default function Card({ title, right, children, className='' }){
  return (
    <div className={`rc-card ${className}`}>
      {(title || right) && (
        <div className="rc-card-header">
          <div className="rc-card-title">{title}</div>
          <div>{right}</div>
        </div>
      )}
      <div className="rc-card-body">{children}</div>
    </div>
  )}
