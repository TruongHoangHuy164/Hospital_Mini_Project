const nodemailer = require('nodemailer');

// Cấu hình email transporter
const createTransporter = () => {
  // Sử dụng Gmail SMTP (có thể thay đổi theo nhà cung cấp khác)
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'cybernblack@gmail.com', // Cập nhật trong .env
      pass: process.env.EMAIL_PASS || 'qyes bqek ferq dsqm' // App password, không phải mật khẩu thông thường
    }
  });
};

// Gửi OTP qua email
const sendOtpEmail = async (email, otp, type = 'change_password') => {
  try {
    const transporter = createTransporter();
    
    let subject = '';
    let htmlContent = '';
    
    switch (type) {
      case 'change_password':
        subject = '🔐 Mã OTP xác thực đổi mật khẩu - Bệnh viện Demo';
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">🏥 Bệnh viện Demo</h1>
            </div>
            
            <div style="padding: 30px; background: #f8f9fa;">
              <h2 style="color: #333; margin-bottom: 20px;">Xác thực đổi mật khẩu</h2>
              
              <p style="font-size: 16px; color: #555; line-height: 1.6;">
                Xin chào,<br><br>
                Bạn đã yêu cầu đổi mật khẩu tài khoản. Vui lòng sử dụng mã OTP bên dưới để xác thực:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <div style="background: #007bff; color: white; font-size: 32px; font-weight: bold; 
                            padding: 20px; border-radius: 10px; letter-spacing: 8px; display: inline-block;">
                  ${otp}
                </div>
              </div>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #856404;">
                  <strong>⚠️ Lưu ý quan trọng:</strong><br>
                  • Mã OTP này có hiệu lực trong <strong>3 phút</strong><br>
                  • Chỉ sử dụng 1 lần duy nhất<br>
                  • Không chia sẻ mã này với bất kỳ ai
                </p>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Nếu bạn không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này hoặc liên hệ bộ phận hỗ trợ.
              </p>
            </div>
            
            <div style="background: #343a40; color: white; padding: 20px; text-align: center;">
              <p style="margin: 0; font-size: 14px;">
                © 2025 Bệnh viện Demo - Hệ thống quản lý khám chữa bệnh
              </p>
            </div>
          </div>
        `;
        break;
      
      case 'forgot_password':
        subject = '🔑 Mã OTP khôi phục mật khẩu - Bệnh viện Demo';
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <!-- Similar structure for forgot password -->
            <h2>Khôi phục mật khẩu</h2>
            <p>Mã OTP của bạn là: <strong style="font-size: 24px; color: #dc3545;">${otp}</strong></p>
            <p>Mã này có hiệu lực trong 3 phút.</p>
          </div>
        `;
        break;
        
      default:
        subject = '🔐 Mã OTP xác thực - Bệnh viện Demo';
        htmlContent = `
          <h2>Mã OTP xác thực</h2>
          <p>Mã OTP của bạn là: <strong style="font-size: 24px;">${otp}</strong></p>
          <p>Mã này có hiệu lực trong 3 phút.</p>
        `;
    }
    
    const mailOptions = {
      from: {
        name: 'Bệnh viện Demo',
        address: process.env.EMAIL_USER || 'your-email@gmail.com'
      },
      to: email,
      subject: subject,
      html: htmlContent
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('OTP email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { success: false, error: error.message };
  }
};

// Test email connection
const testEmailConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email service is ready');
    return true;
  } catch (error) {
    console.error('❌ Email service error:', error.message);
    return false;
  }
};

module.exports = {
  sendOtpEmail,
  testEmailConnection
};