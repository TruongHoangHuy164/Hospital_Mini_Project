import React from 'react'
import { Link } from 'react-router-dom'

const items = [
  { id: 1, label: 'Đặt lịch khám', icon: 'calendar2-check' },
  { id: 2, label: 'Tra cứu kết quả', icon: 'file-earmark-medical' },
  //{ id: 3, label: 'Bảng giá', icon: 'cash-stack' },
  { id: 4, label: 'Hướng dẫn khám', icon: 'clipboard-check' },
  { id: 5, label: 'Lịch sử đặt khám', icon: 'clock-history' }
]

export default function Services() {
  return (
    <section className="services container">
      {items.map(i => {
        const icon = <i className={`bi bi-${i.icon}`} style={{fontSize:'20px', marginRight: 8}}></i>;
        if(i.id === 1){
          return (
            <Link key={i.id} to="/booking" className="service__item">{icon}{i.label}</Link>
          );
        }
        if(i.id === 2){
          return (
            <Link key={i.id} to="/results" className="service__item">{icon}{i.label}</Link>
          );
        }
        if(i.id === 5){
          return (
            <Link key={i.id} to="/booking/history" className="service__item">{icon}{i.label}</Link>
          );
        }
        return (
          <a key={i.id} href="#" className="service__item">{icon}{i.label}</a>
        );
      })}
    </section>
  )
}
