import React from 'react'

export default function PageHeader({ title, subtitle, children }){
  return (
    <div className="rc-header">
      <div>
        <h2 className="rc-title">{title}{subtitle && <span className="rc-subtitle"> {subtitle}</span>}</h2>
      </div>
      <div className="rc-actions">{children}</div>
    </div>
  )
}
