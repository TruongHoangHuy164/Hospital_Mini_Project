import React from 'react'
import { Routes, Route } from 'react-router-dom'
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
import SiteLayout from './layouts/SiteLayout'
import RequireDoctor from './pages/doctor/RequireDoctor'
import DoctorLayout from './pages/doctor/Layout'
import DoctorDashboard from './pages/doctor/Dashboard'
import DoctorProfile from './pages/doctor/Profile'
import DoctorSchedulePage from './pages/doctor/Schedule'
import RequireReception from './pages/reception/RequireReception'
import ReceptionLayout from './pages/reception/Layout'
import ReceptionDashboard from './pages/reception/Dashboard'
import RequireLab from './pages/lab/RequireLab'
import LabLayout from './pages/lab/Layout'
import LabDashboard from './pages/lab/Dashboard'
import LabOrders from './pages/lab/Orders'
import LabResults from './pages/lab/Results'
import Intake from './pages/reception/Intake'
import NewPatient from './pages/reception/NewPatient'
import ReceptionAppointments from './pages/reception/Appointments'
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
import ServerStatus from './components/ServerStatus'
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

export default function App() {
  return (
    <>
      <ServerStatus />
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
      </Route>

      <Route path="/doctor" element={<RequireDoctor><DoctorLayout /></RequireDoctor>}>
        <Route path="dashboard" element={<DoctorDashboard />} />
        <Route path="my-schedule" element={<MySchedule />} />
        <Route path="profile" element={<DoctorProfile />} />
      </Route>

      <Route path="/reception" element={<RequireReception><ReceptionLayout /></RequireReception>}>
        <Route path="dashboard" element={<ReceptionDashboard />} />
        <Route path="intake" element={<Intake />} />
        <Route path="patients/new" element={<NewPatient />} />
        <Route path="appointments" element={<ReceptionAppointments />} />
  <Route path="queue" element={<QueuePage />} />
        <Route path="lookup" element={<Lookup />} />
        <Route path="print" element={<ReceptionPrint />} />
        <Route path="my-schedule" element={<MySchedule />} />
      </Route>

      <Route path="/lab" element={<RequireLab><LabLayout /></RequireLab>}>
        <Route path="dashboard" element={<LabDashboard />} />
        <Route path="orders" element={<LabOrders />} />
        <Route path="results" element={<LabResults />} />
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
    </>
  )
}
