const nodemailer = require('nodemailer');

let transporterCache = null;

function buildTransport() {
  // Prefer SMTP_* env names; fallback to MAIL_* for backward compatibility
  const env = process.env;
  const host = env.SMTP_HOST || env.MAIL_HOST;
  const port = Number(env.SMTP_PORT || env.MAIL_PORT || 587);
  const user = env.SMTP_USER || env.MAIL_USER;
  const pass = env.SMTP_PASS || env.MAIL_PASS;
  const secure = (env.SMTP_SECURE || env.MAIL_SECURE) === 'true';
  const requireTLS = (env.SMTP_REQUIRE_TLS) === 'true';
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    requireTLS,
    connectionTimeout: Number(env.SMTP_CONNECTION_TIMEOUT || 5000),
    greetingTimeout: Number(env.SMTP_GREETING_TIMEOUT || 5000),
    socketTimeout: Number(env.SMTP_SOCKET_TIMEOUT || 5000),
  });
}

function getTransport() {
  if (transporterCache) return transporterCache;
  transporterCache = buildTransport();
  if (transporterCache) {
    transporterCache.verify().then(() => {
      console.log('[SMTP] Kết nối thành công tới server');
    }).catch(err => {
      console.error('[SMTP] Lỗi verify:', err.message);
    });
  }
  return transporterCache;
}

async function sendEmailOTP(email, otp) {
  if (!email) return;
  const transporter = getTransport();
  const from = process.env.MAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@hospital.local';
  const subject = 'Mã OTP đặt lại mật khẩu';
  const text = `Mã OTP của bạn là: ${otp}. Mã có hiệu lực 5 phút.`;
  const html = `<p>Chào bạn,</p><p>Mã OTP đặt lại mật khẩu của bạn: <b style="font-size:20px;letter-spacing:2px">${otp}</b></p><p>Mã hết hạn sau 5 phút.</p>`;
  if (!transporter) {
    console.log('[OTP][EMAIL][FAKE]', email, text);
    return;
  }
  try {
    await transporter.sendMail({ from, to: email, subject, text, html });
    console.log('[OTP][EMAIL][SENT]', email);
  } catch (err) {
    console.error('Gửi email OTP thất bại:', err.message);
  }
}

// Placeholder: integrate real SMS provider (Twilio, Viettel, etc.) later
async function sendSmsOTP(phone, otp) {
  if (!phone) return;
  const text = `Ma OTP dat lai mat khau: ${otp} (hieu luc 5 phut)`;
  // TODO: Implement actual SMS provider integration.
  console.log('[OTP][SMS][FAKE]', phone, text);
}

module.exports = { sendEmailOTP, sendSmsOTP };