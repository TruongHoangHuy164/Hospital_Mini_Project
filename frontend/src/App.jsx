/**
 * FILE: App.jsx
 * MÔ TẢ: Component gốc của ứng dụng
 * Định tuyến (routing) cho tất cả các trang trong hệ thống
 * Bao gồm: Trang chủ, Admin, Bác sĩ, Lễ tân, Xét nghiệm, Nhà thuốc, v.v.
 */

import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Topbar from './components/Topbar'
import Header from './components/Header'
import Navbar from './components/Navbar'
import HeroSlider from './components/HeroSlider'
import Services from './components/Services'
import Highlights from './components/Highlights'
import Notices from './components/Notices'
import AppointmentCTA from './components/AppointmentCTA'
import BookingPage from './pages/booking/Index'
import BookingHistory from './pages/booking/History'
import HistoryTest from './pages/booking/HistoryTest'

import SpecialtiesPage from './pages/specialties/Index'
import ServicesPage from './pages/services/Index'
import GuidePage from './pages/guide/Index'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import Footer from './components/Footer'
import RequireAdmin from './pages/admin/RequireAdmin'
import AdminLayout from './pages/admin/Layout'
import Overview from './pages/admin/Overview'
import Users from './pages/admin/Users'
import Doctors from './pages/admin/doctor/Index'
import Clinics from './pages/admin/clinic/Index'
import AdminServicesPage from './pages/admin/service/Index'
import StaffIndex from './pages/admin/staff/Index'
import StaffEdit from './pages/admin/staff/Edit'
import AdminWorkSchedulesPage from './pages/admin/schedule/Index'
import Revenue from './pages/admin/Revenue'
import AdminBookingStats from './pages/admin/BookingStats'
import AdminNews from './pages/admin/news/Index'
import AdminReviews from './pages/admin/reviews/Index'
import SiteLayout from './layouts/SiteLayout'
import RequireDoctor from './pages/doctor/RequireDoctor'
import DoctorLayout from './pages/doctor/Layout'
import DoctorDashboard from './pages/doctor/Dashboard'
import DoctorProfile from './pages/doctor/Profile'

import RequireReception from './pages/reception/RequireReception'
import ReceptionLayout from './pages/reception/Layout'
import ReceptionDashboard from './pages/reception/Dashboard'
const ReceptionPayments = React.lazy(() => import('./pages/reception/Payments'));
import ReceptionRevenueStats from './pages/reception/Stats'
import RequireLab from './pages/lab/RequireLab'
import LabLayout from './pages/lab/Layout'
import LabDashboard from './pages/lab/Dashboard'
import LabOrders from './pages/lab/Orders'
import LabRevenueStats from './pages/lab/Stats'
import RequirePharmacy from './pages/pharmacy/RequirePharmacy'
import PharmacyLayout from './pages/pharmacy/Layout'
import PharmacyDashboard from './pages/pharmacy/Dashboard'
import PharmacyOrders from './pages/pharmacy/Orders'
import PharmacyPrepare from './pages/pharmacy/Prepare'
import PharmacyInventory from './pages/pharmacy/Inventory'
import PharmacyRevenueStats from './pages/pharmacy/Stats'
import Intake from './pages/reception/Intake'
import NewPatient from './pages/reception/NewPatient'
import QueuePage from './pages/reception/Queue'
import Lookup from './pages/reception/Lookup'
import ReceptionPrint from './pages/reception/Print'
import MyResults from './pages/results/Index'
import PatientProfiles from './pages/user/PatientProfiles'
import MyAppointments from './pages/user/MyAppointments'
import UserProfileView from './pages/user/UserProfile'
import EditProfile from './pages/user/EditProfile'
import ChangePassword from './pages/user/ChangePassword'
import ProfileSimple from './pages/user/ProfileSimple'
import ProfileDebug from './pages/user/ProfileDebug'
import PasswordDebug from './pages/user/PasswordDebug'
import RequireNurse from './pages/nurse/RequireNurse'
import NurseLayout from './pages/nurse/Layout'
import NurseDashboard from './pages/nurse/Dashboard'
import PatientsToday from './pages/nurse/PatientsToday'
import RequireCashier from './pages/cashier/RequireCashier'
import CashierLayout from './pages/cashier/Layout'
import CashierDashboard from './pages/cashier/Dashboard'
import CashierPayments from './pages/cashier/Payments'
import CashierInvoices from './pages/cashier/Invoices'
import CashierReports from './pages/cashier/Reports'
import MySchedule from './pages/shared/MySchedule'
import ReceptionSchedule from './pages/reception/Schedule'
import ReceptionDoctors from './pages/reception/Doctors'
import ReceptionChats from './pages/reception/Chats'
import MedicinesIndex from './pages/medicines/Index'
import ContactPage from './pages/contact/Index'
import AboutPage from './pages/about/Index'
import NewsIndex from './pages/news/Index'
import NewsDetail from './pages/news/Detail'
import ReviewsPage from './pages/reviews/Index'
import DirectBooking from './pages/reception/DirectBooking';

export default function App() {
  return (
    <>
      <React.Suspense fallback={<div className="text-center py-5"><div className="spinner-border text-primary" role="status" /><div className="mt-2 small text-muted">Đang tải...</div></div>}>
      <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={
          <>
            <HeroSlider />
            <Services />
            <div className="container grid-2">
              <Highlights />
              <Notices />
            </div>
            <AppointmentCTA />
          </>
        } />
  <Route path="/guide" element={<GuidePage />} />
  <Route path="/specialties" element={<SpecialtiesPage />} />
  <Route path="/services" element={<ServicesPage />} />
  <Route path="/medicines" element={<MedicinesIndex />} />
  <Route path="/about" element={<AboutPage />} />
  <Route path="/news" element={<NewsIndex />} />
  <Route path="/news/:slug" element={<NewsDetail />} />
  <Route path="/reviews" element={<ReviewsPage />} />
  <Route path="/contact" element={<ContactPage />} />
  <Route path="/booking" element={<BookingPage />} />
  <Route path="/booking/history" element={<BookingHistory />} />
  <Route path="/booking/history-test" element={<HistoryTest />} />

  <Route path="/results" element={<MyResults />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/reset" element={<ResetPassword />} />
        <Route path="/user/profiles" element={<PatientProfiles />} />
        <Route path="/user/my-appointments" element={<MyAppointments />} />
        <Route path="/user/profile" element={<UserProfileView />} />
        <Route path="/user/edit-profile" element={<EditProfile />} />
        <Route path="/user/change-password" element={<ChangePassword />} />
        <Route path="/user/profile-simple" element={<ProfileSimple />} />
        <Route path="/user/profile-debug" element={<ProfileDebug />} />
        <Route path="/user/password-debug" element={<PasswordDebug />} />
      </Route>

      <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
        <Route path="overview" element={<Overview />} />
        <Route path="users" element={<Users />} />
        <Route path="doctors" element={<Doctors />} />
        <Route path="clinics" element={<Clinics />} />
        <Route path="services" element={<AdminServicesPage />} />
        <Route path="staff" element={<StaffIndex />} />
        <Route path="staff/:id" element={<StaffEdit />} />
  <Route path="work-schedules" element={<AdminWorkSchedulesPage />} />
        <Route path="revenue" element={<Revenue />} />
        <Route path="booking-stats" element={<AdminBookingStats />} />
        <Route path="news" element={<AdminNews />} />
        <Route path="reviews" element={<AdminReviews />} />
      </Route>

      <Route path="/doctor" element={<RequireDoctor><DoctorLayout /></RequireDoctor>}>
        <Route path="dashboard" element={<DoctorDashboard />} />
        <Route path="my-schedule" element={<MySchedule />} />
        <Route path="schedule" element={<Navigate to="/doctor/my-schedule" replace />} />
        <Route path="profile" element={<DoctorProfile />} />
      </Route>

      <Route path="/reception" element={<RequireReception><ReceptionLayout /></RequireReception>}>
        <Route path="dashboard" element={<ReceptionDashboard />} />
        <Route path="intake" element={<Intake />} />
        <Route path="patients/new" element={<NewPatient />} />
        {/* Redirect /reception/appointments to direct-booking for backward compatibility */}
        <Route path="appointments" element={<Navigate to="/reception/direct-booking" replace />} />
  <Route path="queue" element={<QueuePage />} />
        <Route path="lookup" element={<Lookup />} />
        <Route path="print" element={<ReceptionPrint />} />
          <Route path="payments" element={<ReceptionPayments />} />
        <Route path="stats" element={<ReceptionRevenueStats />} />
        <Route path="my-schedule" element={<MySchedule />} />
        <Route path="schedule" element={<ReceptionSchedule />} />
        <Route path="doctors" element={<ReceptionDoctors />} />
        <Route path="chats" element={<ReceptionChats />} />
          <Route path="direct-booking" element={<DirectBooking />} />
      </Route>

      <Route path="/lab" element={<RequireLab><LabLayout /></RequireLab>}>
        <Route path="dashboard" element={<LabDashboard />} />
        <Route path="orders" element={<LabOrders />} />
        <Route path="stats" element={<LabRevenueStats />} />
        <Route path="my-schedule" element={<MySchedule />} />
      </Route>

      <Route path="/pharmacy" element={<RequirePharmacy><PharmacyLayout /></RequirePharmacy>}>
        <Route index element={<PharmacyDashboard />} />
        <Route path="dashboard" element={<PharmacyDashboard />} />
        <Route path="orders" element={<PharmacyOrders />} />
        <Route path="prepare" element={<PharmacyPrepare />} />
        <Route path="inventory" element={<PharmacyInventory />} />
        <Route path="stats" element={<PharmacyRevenueStats />} />
        <Route path="my-schedule" element={<MySchedule />} />
      </Route>

      <Route path="/nurse" element={<RequireNurse><NurseLayout /></RequireNurse>}>
        <Route path="dashboard" element={<NurseDashboard />} />
        <Route path="patients-today" element={<PatientsToday />} />
        <Route path="my-schedule" element={<MySchedule />} />
      </Route>

      <Route path="/cashier" element={<RequireCashier><CashierLayout /></RequireCashier>}>
        <Route path="dashboard" element={<CashierDashboard />} />
        <Route path="payments" element={<CashierPayments />} />
        <Route path="invoices" element={<CashierInvoices />} />
        <Route path="reports" element={<CashierReports />} />
        <Route path="my-schedule" element={<MySchedule />} />
      </Route>
    </Routes>
      </React.Suspense>
    </>
  )
}
