/**
 * SCRIPT: add-comments.js
 * MÔ TẢ: Tự động thêm comment tiếng Việt vào đầu các file JavaScript/JSX
 * CÁCH DÙNG: node add-comments.js
 */

const fs = require('fs');
const path = require('path');

// Mapping tên file/folder với mô tả tiếng Việt
const descriptions = {
  // API files
  'auth.js': 'Module xử lý xác thực người dùng (đăng ký, đăng nhập, đăng xuất)',
  'axios.js': 'Cấu hình axios instance cho API calls (publicApi & privateApi)',
  'payments.js': 'API calls cho chức năng thanh toán (MoMo và tiền mặt)',
  'users.js': 'API calls cho quản lý người dùng (dành cho admin)',
  'admin.js': 'API calls cho chức năng quản trị viên và thống kê',
  'autoSchedule.js': 'API calls cho chức năng tự động tạo lịch làm việc',
  'chat.js': 'API calls cho chức năng chat/nhắn tin',
  'location.js': 'API calls cho dữ liệu địa lý Việt Nam (Tỉnh/Quận/Phường)',
  'patientProfiles.js': 'API calls cho quản lý hồ sơ bệnh nhân',
  'pharmacy.js': 'API calls cho quản lý nhà thuốc (đơn thuốc, tồn kho, danh mục)',
  'reception.js': 'API calls cho chức năng lễ tân',
  'revenue.js': 'API calls cho báo cáo doanh thu',
  'scheduleConfig.js': 'API calls cho cấu hình lịch làm việc',
  'workSchedules.js': 'API calls cho quản lý lịch làm việc nhân viên',
  'reviews.js': 'API calls cho quản lý đánh giá/nhận xét',
  'news.js': 'API calls cho quản lý tin tức/bài viết',
  
  // Components
  'AppointmentCTA.jsx': 'Component nút kêu gọi hành động đặt lịch khám',
  'ErrorBoundary.jsx': 'Component bắt lỗi React để tránh crash toàn bộ app',
  'Footer.jsx': 'Component footer trang web',
  'Header.jsx': 'Component header/đầu trang',
  'HeroSlider.jsx': 'Component slider/banner chính ở trang chủ',
  'Highlights.jsx': 'Component hiển thị các điểm nổi bật',
  'Navbar.jsx': 'Component thanh điều hướng chính',
  'Notices.jsx': 'Component hiển thị thông báo',
  'ServerStatus.jsx': 'Component hiển thị trạng thái server',
  'ServerStatusCheck.jsx': 'Component kiểm tra trạng thái kết nối server',
  'Services.jsx': 'Component hiển thị danh sách dịch vụ',
  'Topbar.jsx': 'Component thanh thông tin phía trên cùng',
  'UserMenu.jsx': 'Component menu người dùng',
  'UserMenuSimple.jsx': 'Component menu người dùng đơn giản',
  'ChatBubble.jsx': 'Component bong bóng chat nổi',
  'ChatDrawer.jsx': 'Component ngăn kéo chat',
  'PatientChatDrawer.jsx': 'Component ngăn kéo chat cho bệnh nhân',
  'ReceptionChatDrawer.jsx': 'Component ngăn kéo chat cho lễ tân',
  'StarRating.jsx': 'Component hiển thị và chọn đánh giá sao',
  
  // Context
  'AuthContext.jsx': 'Context quản lý trạng thái xác thực người dùng toàn app',
  
  // Layouts
  'SiteLayout.jsx': 'Layout chính cho toàn bộ trang web',
  
  // Utils
  'serverCheck.js': 'Tiện ích kiểm tra kết nối server',
  'socket.js': 'Cấu hình Socket.IO cho real-time communication',
  
  // Main files
  'App.jsx': 'Component gốc của ứng dụng, định nghĩa routes',
  'main.jsx': 'Entry point của React app',
};

// Mô tả cho từng folder pages
const folderDescriptions = {
  'admin': 'Trang quản trị viên - quản lý hệ thống',
  'auth': 'Trang xác thực - đăng nhập, đăng ký, quên mật khẩu',
  'booking': 'Trang đặt lịch khám và lịch sử đặt lịch',
  'cashier': 'Trang thu ngân - quản lý hóa đơn và thanh toán',
  'contact': 'Trang liên hệ',
  'doctor': 'Trang bác sĩ - dashboard và quản lý lịch khám',
  'guide': 'Trang hướng dẫn sử dụng',
  'lab': 'Trang cận lâm sàng - quản lý xét nghiệm',
  'medicines': 'Trang tra cứu thuốc',
  'news': 'Trang tin tức và bài viết',
  'nurse': 'Trang y tá - quản lý bệnh nhân',
  'pharmacy': 'Trang nhà thuốc - quản lý thuốc và đơn thuốc',
  'reception': 'Trang lễ tân - tiếp nhận và quản lý lịch hẹn',
  'results': 'Trang xem kết quả xét nghiệm',
  'reviews': 'Trang đánh giá và phản hồi',
  'services': 'Trang dịch vụ khám chữa bệnh',
  'specialties': 'Trang chuyên khoa',
  'user': 'Trang người dùng - profile và cài đặt',
  'about': 'Trang giới thiệu',
  'demo': 'Trang demo các tính năng',
  'shared': 'Component/page dùng chung',
};

/**
 * Tạo header comment cho file
 */
function createFileComment(filePath, fileName, folderContext = '') {
  const desc = descriptions[fileName] || getDefaultDescription(fileName, folderContext);
  const relativePath = path.relative(path.join(__dirname, 'src'), filePath);
  
  return `/**
 * FILE: ${fileName}
 * PATH: ${relativePath}
 * MÔ TẢ: ${desc}
 */

`;
}

/**
 * Lấy mô tả mặc định dựa trên tên file và folder
 */
function getDefaultDescription(fileName, folderContext) {
  const name = fileName.replace(/\.(jsx?|tsx?)$/, '');
  
  // Kiểm tra folder context
  if (folderContext) {
    const folderDesc = folderDescriptions[folderContext] || '';
    if (folderDesc) {
      return `${folderDesc} - Component ${name}`;
    }
  }
  
  // Mô tả mặc định dựa trên pattern
  if (fileName.endsWith('.jsx') || fileName.endsWith('.tsx')) {
    if (fileName.includes('Layout')) return `Layout component ${name}`;
    if (fileName.includes('Page') || fileName === 'Index.jsx') return `Trang ${name}`;
    if (fileName.includes('Modal')) return `Modal component ${name}`;
    if (fileName.includes('Form')) return `Form component ${name}`;
    if (fileName.includes('Table')) return `Table component ${name}`;
    if (fileName.includes('Card')) return `Card component ${name}`;
    return `Component ${name}`;
  }
  
  if (fileName.endsWith('.js')) {
    return `Module tiện ích ${name}`;
  }
  
  return `File ${name}`;
}

/**
 * Kiểm tra xem file đã có comment header chưa
 */
function hasCommentHeader(content) {
  return content.trim().startsWith('/**') && content.includes('FILE:') && content.includes('MÔ TẢ:');
}

/**
 * Thêm comment vào file
 */
function addCommentToFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Bỏ qua nếu đã có comment
    if (hasCommentHeader(content)) {
      console.log(`⏭️  Skip: ${filePath} (đã có comment)`);
      return false;
    }
    
    // Xác định folder context
    const parts = filePath.split(path.sep);
    const pagesIndex = parts.indexOf('pages');
    const folderContext = pagesIndex >= 0 && parts[pagesIndex + 1] ? parts[pagesIndex + 1] : '';
    
    const fileName = path.basename(filePath);
    const comment = createFileComment(filePath, fileName, folderContext);
    const newContent = comment + content;
    
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ Added: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Quét thư mục và xử lý tất cả file
 */
function processDirectory(dirPath, stats = { added: 0, skipped: 0, errors: 0 }) {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Bỏ qua node_modules, dist, build
      if (['node_modules', 'dist', 'build', '.git'].includes(item)) {
        continue;
      }
      processDirectory(fullPath, stats);
    } else if (stat.isFile()) {
      // Chỉ xử lý file .js, .jsx, .ts, .tsx
      if (/\.(jsx?|tsx?)$/.test(item)) {
        const result = addCommentToFile(fullPath);
        if (result === true) stats.added++;
        else if (result === false) stats.skipped++;
        else stats.errors++;
      }
    }
  }
  
  return stats;
}

/**
 * Main function
 */
function main() {
  console.log('🚀 Bắt đầu thêm comment tiếng Việt cho các file...\n');
  
  const srcDir = path.join(__dirname, 'src');
  
  if (!fs.existsSync(srcDir)) {
    console.error('❌ Không tìm thấy thư mục src/');
    process.exit(1);
  }
  
  const stats = processDirectory(srcDir);
  
  console.log('\n📊 KẾT QUẢ:');
  console.log(`✅ Đã thêm comment: ${stats.added} file`);
  console.log(`⏭️  Đã bỏ qua: ${stats.skipped} file`);
  console.log(`❌ Lỗi: ${stats.errors} file`);
  console.log('\n✨ Hoàn thành!');
}

// Chạy script
if (require.main === module) {
  main();
}

module.exports = { addCommentToFile, processDirectory };
