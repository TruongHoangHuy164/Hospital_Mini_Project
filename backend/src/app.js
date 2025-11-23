const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { notFound, errorHandler } = require('./middlewares');
const authRouter = require('./routes/auth');
const auth = require('./middlewares/auth');
const authorize = require('./middlewares/authorize');
const usersRouter = require('./routes/users');
const adminRouter = require('./routes/admin');
const doctorsRouter = require('./routes/doctors');
const clinicsRouter = require('./routes/clinics');
const uploadsRouter = require('./routes/uploads');
const specialtiesRouter = require('./routes/specialties');
const doctorSelfRouter = require('./routes/doctorSelf');
const bookingRouter = require('./routes/booking');
const labRouter = require('./routes/lab');
const staffRouter = require('./routes/staff');
const patientProfilesRouter = require('./routes/patientProfiles');
const servicesRouter = require('./routes/services');
const publicRouter = require('./routes/public');
const aiRouter = require('./routes/ai');
const pharmacyRouter = require('./routes/pharmacy');
const workSchedulesRouter = require('./routes/workSchedules');
const patientsRouter = require('./routes/patients');

const app = express();

app.use(cors({ origin: process.env.ORIGIN || '*' }));
// Increase body size limits to support large JSON imports for pharmacy inventory
app.use(express.json({ limit: process.env.BODY_LIMIT || '20mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.BODY_LIMIT || '20mb' }));
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.json({ app: 'Hospital Backend', status: 'ok' });
});

app.use('/health', require('./routes/health'));
app.use('/api/auth', authRouter);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// User routes - some endpoints need different permissions
app.use('/api/users', usersRouter);
app.use('/api/admin', auth, authorize('admin'), adminRouter);
app.use('/api/doctors', auth, authorize('admin'), doctorsRouter);
app.use('/api/staff', auth, authorize('admin'), staffRouter);
app.use('/api/doctor', auth, authorize('doctor'), doctorSelfRouter);
app.use('/api/lab', auth, authorize('lab','admin'), labRouter);
app.use('/api/clinics', auth, authorize('admin'), clinicsRouter);
app.use('/api/uploads', auth, authorize('admin','doctor','nurse'), uploadsRouter);
app.use('/api/specialties', auth, authorize('admin'), specialtiesRouter);
app.use('/api/services', auth, authorize('admin'), servicesRouter);
// Work schedules: admin quản lý / người dùng tự xem
app.use('/api/work-schedules', auth, authorize('admin','doctor','reception','lab','cashier','nurse'), workSchedulesRouter);
app.use('/api/booking', bookingRouter);
app.use('/api/patient-profiles', patientProfilesRouter);
// Patient search for receptionists/admins
app.use('/api/patients', auth, patientsRouter);
app.use('/api/public', publicRouter);
app.use('/api/ai', aiRouter);
// Pharmacy routes (staff with role 'pharmacy' or admin)
app.use('/api/pharmacy', auth, authorize('pharmacy','admin'), pharmacyRouter);

// Protected sample route
app.get('/api/profile', auth, (req, res) => {
  res.json({ user: req.user });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
