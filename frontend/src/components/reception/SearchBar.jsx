import React from 'react'

export default function SearchBar({ value, onChange, onSubmit, placeholder='Tìm kiếm...', buttonLabel='Tìm', loading=false }){
  return (
    <form className="rc-search" onSubmit={onSubmit}>
      <input className="form-control" placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)} />
      <button className="btn btn-primary" type="submit" disabled={loading}>{loading? 'Đang tải...' : buttonLabel}</button>
    </form>
  )
}
