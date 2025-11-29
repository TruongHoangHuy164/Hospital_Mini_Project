import React, { useEffect, useMemo, useState } from 'react'
import { getRevenueSummary, getRevenueByMonth, getRevenueDayDetail, getTopMedicines, getTopServices } from '../../api/revenue'
import { Bar, Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend)

const now = new Date()
const currentYear = now.getFullYear()
const currentMonth = now.getMonth() + 1

export default function Revenue() {
  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(currentMonth)
  const [summary, setSummary] = useState(null)
  const [monthData, setMonthData] = useState(null)
  const [dayDetail, setDayDetail] = useState(null)
  const [topMedicines, setTopMedicines] = useState([])
  const [topServices, setTopServices] = useState([])

  useEffect(() => {
    getRevenueSummary(year).then(setSummary)
  }, [year])

  useEffect(() => {
    getRevenueByMonth(year, month).then(setMonthData)
    getTopMedicines(year, month, 10).then(d => setTopMedicines(d.items || []))
    getTopServices(year, month, 10).then(d => setTopServices(d.items || []))
  }, [year, month])

  const monthBarData = useMemo(() => {
    if (!summary) return null
    const labels = Array.from({ length: 12 }, (_, i) => `Tháng ${i+1}`)
    // Thêm nhóm 'lichkham' (doanh thu lịch khám cố định 150k)
    const categories = ['hosokham','canlamsang','donthuoc','lichkham']
    const colors = {
      hosokham: 'rgba(54, 162, 235, 0.6)',
      canlamsang: 'rgba(255, 159, 64, 0.6)',
      donthuoc: 'rgba(75, 192, 192, 0.6)',
      lichkham: 'rgba(153, 102, 255, 0.6)'
    }
    const labelsMap = {
      hosokham: 'Khám',
      canlamsang: 'Cận lâm sàng',
      donthuoc: 'Đơn thuốc',
      lichkham: 'Lịch khám (150k)'
    }
    const datasets = categories.map(c => ({
      label: labelsMap[c],
      data: summary.categorySeries[c] || Array(12).fill(0),
      backgroundColor: colors[c],
    }))
    return { labels, datasets }
  }, [summary])

  const dailyLineData = useMemo(() => {
    if (!monthData) return null
    const days = monthData.days?.map(d => d.day) || []
    return {
      labels: days.map(d => `Ngày ${d}`),
      datasets: [
        { label: 'Tổng', data: monthData.totalSeries, borderColor: 'rgba(54, 162, 235, 0.8)', backgroundColor: 'rgba(54, 162, 235, 0.2)', tension: 0.2 },
        { label: 'Khám', data: monthData.categorySeries.hosokham, borderColor: 'rgba(54, 162, 235, 0.6)', tension: 0.2 },
        { label: 'CLS', data: monthData.categorySeries.canlamsang, borderColor: 'rgba(255, 159, 64, 0.6)', tension: 0.2 },
        { label: 'Thuốc', data: monthData.categorySeries.donthuoc, borderColor: 'rgba(75, 192, 192, 0.6)', tension: 0.2 },
        { label: 'Lịch khám (150k)', data: monthData.categorySeries.lichkham, borderColor: 'rgba(153, 102, 255, 0.6)', tension: 0.2 },
      ]
    }
  }, [monthData])

  const onClickDay = async (d) => {
    const date = new Date(year, month - 1, d)
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const iso = `${yyyy}-${mm}-${dd}`
    const detail = await getRevenueDayDetail(iso)
    setDayDetail(detail)
  }

  return (
    <div className="container py-3">
      <div className="d-flex align-items-end gap-3 mb-3">
        <div>
          <label className="form-label">Năm</label>
          <input type="number" className="form-control" value={year} onChange={e => setYear(parseInt(e.target.value || currentYear, 10))} />
        </div>
        <div>
          <label className="form-label">Tháng</label>
          <input type="number" min={1} max={12} className="form-control" value={month} onChange={e => setMonth(parseInt(e.target.value || currentMonth, 10))} />
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header">Doanh thu theo tháng (phân loại)</div>
        <div className="card-body">
          {monthBarData ? <Bar data={monthBarData} options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: false } }, scales: { x: { stacked: true }, y: { stacked: true } } }} /> : 'Đang tải...'}
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header">Doanh thu theo ngày trong tháng</div>
        <div className="card-body">
          {dailyLineData ? (
            <div>
              <Line data={dailyLineData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
              <div className="mt-2 d-flex flex-wrap gap-2">
                {monthData.days.map(d => (
                  <button key={d.day} className="btn btn-outline-secondary btn-sm" onClick={() => onClickDay(d.day)}>Ngày {d.day}</button>
                ))}
              </div>
            </div>
          ) : 'Đang tải...'}
        </div>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="card mb-3">
            <div className="card-header">Top dịch vụ (tháng)</div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr><th>#</th><th>Dịch vụ</th><th>SL</th><th>Giá</th><th>Doanh thu ước tính</th></tr>
                  </thead>
                  <tbody>
                    {topServices.map((s, idx) => (
                      <tr key={s.id}>
                        <td>{idx + 1}</td>
                        <td>{s.name}</td>
                        <td>{s.count}</td>
                        <td>{s.price?.toLocaleString()}</td>
                        <td>{s.estimatedRevenue?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card mb-3">
            <div className="card-header">Top thuốc (tháng)</div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr><th>#</th><th>Thuốc</th><th>SL</th><th>Giá</th><th>Doanh thu ước tính</th></tr>
                  </thead>
                  <tbody>
                    {topMedicines.map((m, idx) => (
                      <tr key={m.id}>
                        <td>{idx + 1}</td>
                        <td>{m.name}</td>
                        <td>{m.quantity}</td>
                        <td>{m.price?.toLocaleString()}</td>
                        <td>{m.estimatedRevenue?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {dayDetail && (
        <div className="card">
          <div className="card-header">Chi tiết doanh thu ngày {dayDetail.date}</div>
          <div className="card-body">
            <p className="text-muted mb-2">Doanh thu lịch khám: {dayDetail.bookingRevenue?.toLocaleString()} (số lịch: {dayDetail.bookingCount})</p>
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Giờ</th><th>Khoản thu</th><th>Loại</th><th>Hình thức</th><th>Bệnh nhân</th><th>Bác sĩ</th>
                  </tr>
                </thead>
                <tbody>
                  {dayDetail.payments.map(p => (
                    <tr key={p.id}>
                      <td>{new Date(p.paidAt).toLocaleTimeString()}</td>
                      <td>{p.amount?.toLocaleString()}</td>
                      <td>{p.category}</td>
                      <td>{p.method}</td>
                      <td>{p.patient?.name}</td>
                      <td>{p.doctor?.name}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan={3}>Tổng thanh toán</th>
                    <th colSpan={3}>{dayDetail.paymentTotal?.toLocaleString()}</th>
                  </tr>
                  <tr>
                    <th colSpan={3}>+ Doanh thu lịch khám</th>
                    <th colSpan={3}>{dayDetail.bookingRevenue?.toLocaleString()}</th>
                  </tr>
                  <tr>
                    <th colSpan={3}>= Tổng cộng</th>
                    <th colSpan={3}>{dayDetail.total?.toLocaleString()}</th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
