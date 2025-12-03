import React, { useEffect } from 'react';

export default function AboutPage() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in-view');
          // If you want one-shot, unobserve:
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="container py-4">
      <header className="mb-4 text-center reveal">
        <h1 className="fw-bold mb-2" style={{ color: 'var(--primary-dark)' }}>Giới thiệu Bệnh viện</h1>
        <p className="text-muted mb-0">Chăm sóc sức khỏe toàn diện – Tận tâm, hiện đại, hiệu quả</p>
      </header>

      <section className="card mb-3 reveal">
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-7">
              <h4 className="mb-2">Sứ mệnh & Tầm nhìn</h4>
              <p className="mb-0 text-muted">Chúng tôi hướng đến việc cung cấp dịch vụ y tế chất lượng cao, lấy người bệnh làm trung tâm, ứng dụng công nghệ và phác đồ điều trị tiên tiến, nhằm mang lại trải nghiệm chăm sóc sức khỏe an toàn và hiệu quả.</p>
            </div>
            <div className="col-md-5">
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSAcvRgkCNFVM9oNEjm4JVvuSMrS6w7_32JcA&s"
                alt="Hình ảnh minh họa sứ mệnh và tầm nhìn của bệnh viện"
                className="img-fluid rounded-3 shadow-sm w-100"
                loading="lazy"
                style={{ objectFit: 'cover', aspectRatio: '16 / 10' }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="card mb-3 reveal" style={{ transitionDelay: '.03s' }}>
        <div className="card-body">
          <h4 className="mb-2">Giá trị cốt lõi</h4>
          <p className="text-muted">Những nguyên tắc định hướng mọi hoạt động chuyên môn và phục vụ:</p>
          <ul className="mb-0">
            <li><strong>Tận tâm:</strong> Đặt sự an toàn và hài lòng của người bệnh lên hàng đầu.</li>
            <li><strong>Chính xác:</strong> Chẩn đoán dựa trên bằng chứng, tuân thủ phác đồ chuẩn.</li>
            <li><strong>Hợp tác:</strong> Phối hợp đa chuyên khoa, cá thể hóa điều trị.</li>
            <li><strong>Đổi mới:</strong> Liên tục cải tiến quy trình, cập nhật công nghệ.</li>
            <li><strong>Minh bạch:</strong> Chi phí rõ ràng, thông tin đầy đủ và kịp thời.</li>
          </ul>
        </div>
      </section>

      <section className="card mb-3 reveal" style={{ transitionDelay: '.05s' }}>
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-5 order-md-2">
              <img
                src="https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoiaWhoLWhlYWx0aGNhcmUtYmVyaGFkXC9hY2NvdW50c1wvYzNcLzQwMDA2MjRcL3Byb2plY3RzXC8yMDlcL2Fzc2V0c1wvZDRcLzMzODYyXC81ZWY5MjJiM2M4NWJlZDk3YmIxZTg5NTcyNDNhNzFhMS0xNjQ2OTI0ODg2LmpwZyJ9:ihh-healthcare-berhad:wBlI82bXS3McAbLJn8tN-iOrGCo5YgGrGj-AzwKQHH4?format=webp"
                alt="Hình ảnh chuyên khoa và dịch vụ của bệnh viện"
                className="img-fluid rounded-3 shadow-sm w-100"
                loading="lazy"
                style={{ objectFit: 'cover', aspectRatio: '16 / 10' }}
              />
            </div>
            <div className="col-md-7 order-md-1">
              <h4 className="mb-2">Chuyên khoa & Dịch vụ</h4>
              <p className="text-muted">Đa dạng chuyên khoa: Nội, Ngoại, Sản, Nhi, Tim mạch, Tai–Mũi–Họng, Mắt, Da liễu… cùng các dịch vụ cận lâm sàng (X-quang, Siêu âm, Xét nghiệm), tiêm phòng, tầm soát sức khỏe tổng quát.</p>
              <ul className="mb-0">
                <li>Đặt lịch khám nhanh chóng, quản lý hồ sơ điện tử</li>
                <li>Thanh toán linh hoạt (tiền mặt, ví điện tử)</li>
                <li>Tư vấn sau khám và theo dõi định kỳ</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="card mb-3 reveal" style={{ transitionDelay: '.1s' }}>
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-7">
              <h4 className="mb-2">Cơ sở vật chất</h4>
              <p className="mb-0 text-muted">Hệ thống phòng khám hiện đại, khu xét nghiệm đạt chuẩn, khu chờ rộng rãi, quy trình tiếp đón và thanh toán nhanh gọn, tối ưu trải nghiệm người bệnh.</p>
            </div>
            <div className="col-md-5">
              <img
                src="https://files.benhvien108.vn/ecm/source_files/2020/08/11/200811-3-1-095408-110820-66.jpg"
                alt="Hình ảnh cơ sở vật chất của bệnh viện"
                className="img-fluid rounded-3 shadow-sm w-100"
                loading="lazy"
                style={{ objectFit: 'cover', aspectRatio: '16 / 10' }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="card mb-3 reveal" style={{ transitionDelay: '.15s' }}>
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-5 order-md-2">
              <img
                src="https://benhvienvietbi.vn/en/wp-content/uploads/2016/10/37395517_913700058828767_9107403470276657152_o.jpg"
                alt="Đội ngũ y bác sĩ của bệnh viện"
                className="img-fluid rounded-3 shadow-sm w-100"
                loading="lazy"
                style={{ objectFit: 'cover', aspectRatio: '16 / 10' }}
              />
            </div>
            <div className="col-md-7 order-md-1">
              <h4 className="mb-2">Đội ngũ y bác sĩ</h4>
              <p className="mb-0 text-muted">Quy tụ đội ngũ bác sĩ giàu kinh nghiệm, tận tâm, thường xuyên cập nhật kiến thức và kỹ thuật mới, luôn đồng hành cùng bệnh nhân trong suốt hành trình điều trị.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="card mb-3 reveal" style={{ transitionDelay: '.18s' }}>
        <div className="card-body">
          <h4 className="mb-3">Hành trình khám bệnh (Patient Journey)</h4>
          <div className="row g-3">
            <div className="col-md-6">
              <ol className="mb-0">
                <li><strong>Đặt lịch:</strong> Trực tuyến hoặc qua hotline, nhận SMS xác nhận.</li>
                <li><strong>Tiếp đón:</strong> Kiểm tra thông tin, hướng dẫn di chuyển đến phòng khám.</li>
                <li><strong>Khám & chẩn đoán:</strong> Bác sĩ khai thác bệnh sử, chỉ định cận lâm sàng khi cần.</li>
                <li><strong>Điều trị:</strong> Tư vấn phác đồ, kê đơn hoặc chỉ định thủ thuật/nhập viện.</li>
                <li><strong>Thanh toán:</strong> Linh hoạt, hóa đơn điện tử.</li>
                <li><strong>Theo dõi:</strong> Nhắc tái khám, tư vấn dinh dưỡng & phục hồi chức năng.</li>
              </ol>
            </div>
            <div className="col-md-6">
              <img
                src="https://honghunghospital.com.vn/wp-content/uploads/2021/01/quy-tr%C3%ACnh-kh%C3%A1m-b%E1%BB%87nh_edited_02.png"
                alt="Sơ đồ hành trình khám bệnh của bệnh viện"
                className="img-fluid rounded-3 shadow-sm w-100"
                loading="lazy"
                style={{ objectFit: 'cover', aspectRatio: '16 / 10' }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="card mb-3 reveal" style={{ transitionDelay: '.21s' }}>
        <div className="card-body">
          <h4 className="mb-2">Công nghệ & Chuyển đổi số</h4>
          <p className="text-muted">Hệ thống quản lý bệnh viện (HIS) – Hồ sơ bệnh án điện tử – Nhắc lịch tái khám tự động – Tích hợp thanh toán điện tử.</p>
          <ul className="mb-0">
            <li>Lưu trữ ảnh số (PACS) và chia sẻ kết quả an toàn.</li>
            <li>Ứng dụng AI hỗ trợ sàng lọc và phân loại ban đầu.</li>
            <li>Bảo mật theo tiêu chuẩn: phân quyền, mã hóa dữ liệu, nhật ký truy cập.</li>
          </ul>
        </div>
      </section>

      <section className="card mb-3 reveal" style={{ transitionDelay: '.24s' }}>
        <div className="card-body">
          <h4 className="mb-2">Chất lượng & An toàn</h4>
          <ul className="mb-0">
            <li>Tuân thủ hướng dẫn Bộ Y tế và các tiêu chuẩn kiểm soát nhiễm khuẩn.</li>
            <li>Đánh giá chất lượng nội bộ định kỳ, cải tiến liên tục.</li>
            <li>Đào tạo nhân viên về an toàn người bệnh, giao tiếp y tế.</li>
          </ul>
        </div>
      </section>

      <section className="card mb-3 reveal" style={{ transitionDelay: '.27s' }}>
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-6">
              <h4 className="mb-2">Đối tác bảo hiểm</h4>
              <p className="text-muted">Hợp tác với nhiều hãng bảo hiểm để tối ưu chi phí điều trị cho người bệnh.</p>
              <ul className="mb-0">
                <li>Bảo hiểm X, Bảo hiểm Y, Bảo hiểm Z…</li>
                <li>Hỗ trợ thủ tục xác nhận nhanh tại quầy.</li>
              </ul>
            </div>
            <div className="col-md-6">
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQkQ1DtrtC5tpnPZEeW7mdSIoURm8yhsVTavA&s"
                alt="Đối tác bảo hiểm của bệnh viện"
                className="img-fluid rounded-3 shadow-sm w-100"
                loading="lazy"
                style={{ objectFit: 'cover', aspectRatio: '16 / 10' }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="card mb-3 reveal" style={{ transitionDelay: '.3s' }}>
        <div className="card-body">
          <h4 className="mb-2">Thành tựu & Giải thưởng</h4>
          <ul className="mb-0">
            <li>Top bệnh viện dịch vụ người bệnh hài lòng (năm …).</li>
            <li>Giải thưởng chuyển đổi số trong y tế (năm …).</li>
            <li>Các đề tài nghiên cứu, hội thảo chuyên môn cấp quốc gia/khu vực.</li>
          </ul>
        </div>
      </section>

      <section className="card mb-3 reveal" style={{ transitionDelay: '.33s' }}>
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-5">
              <img
                src="https://dalieudanang.com/uploads/news/2023_06/image_7.png"
                alt="Hoạt động cộng đồng và trách nhiệm xã hội của bệnh viện"
                className="img-fluid rounded-3 shadow-sm w-100"
                loading="lazy"
                style={{ objectFit: 'cover', aspectRatio: '16 / 10' }}
              />
            </div>
            <div className="col-md-7">
              <h4 className="mb-2">Cộng đồng & Trách nhiệm xã hội</h4>
              <p className="mb-0 text-muted">Tổ chức khám sàng lọc miễn phí, chương trình truyền thông sức khỏe, hợp tác với trường học & doanh nghiệp trong hoạt động tầm soát bệnh nghề nghiệp.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="card mb-3 reveal" style={{ transitionDelay: '.36s' }}>
        <div className="card-body">
          <h4 className="mb-2">Câu hỏi thường gặp (FAQ)</h4>
          <div className="row g-3">
            <div className="col-md-6">
              <div className="p-3 border rounded-3">
                <strong>Giờ làm việc?</strong>
                <p className="mb-0 text-muted">Thứ 2–Thứ 7: 7:00–20:00, Chủ nhật: 8:00–17:00.</p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="p-3 border rounded-3">
                <strong>Có hỗ trợ cấp cứu?</strong>
                <p className="mb-0 text-muted">Hỗ trợ sơ cấp cứu ban đầu, chuyển tuyến khi cần thiết.</p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="p-3 border rounded-3">
                <strong>Hồ sơ bệnh án điện tử?</strong>
                <p className="mb-0 text-muted">Xem kết quả xét nghiệm, hình ảnh, toa thuốc trên hệ thống an toàn.</p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="p-3 border rounded-3">
                <strong>Chính sách bảo mật dữ liệu?</strong>
                <p className="mb-0 text-muted">Bảo mật theo tiêu chuẩn ngành y và quy định pháp luật.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="card mb-3 reveal" style={{ transitionDelay: '.39s' }}>
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-7">
              <h4 className="mb-2">Tuyển dụng</h4>
              <p className="mb-2 text-muted">Gia nhập đội ngũ của chúng tôi để cùng kiến tạo trải nghiệm chăm sóc sức khỏe hiện đại, nhân văn.</p>
              <a href="#" className="btn btn-outline-primary btn-sm">Xem vị trí tuyển dụng</a>
            </div>
            <div className="col-md-5">
              <img
                src="https://songthuong.vn/media/25363/content/tuy%E1%BB%83n%20d%E1%BB%A5ng%20ti%E1%BA%BFp%20%C4%91%C3%B3n%20-%20%C4%91i%E1%BB%81u%20d%C6%B0%E1%BB%A1ng%20-%20KTV.png"
                alt="Hình ảnh tuyển dụng tại bệnh viện"
                className="img-fluid rounded-3 shadow-sm w-100"
                loading="lazy"
                style={{ objectFit: 'cover', aspectRatio: '16 / 10' }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="card mb-3 reveal" style={{ transitionDelay: '.42s' }}>
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-6">
              <h4 className="mb-2">Thông tin liên hệ</h4>
              <ul className="mb-2">
                <li>Hotline: <strong>1900 8386</strong></li>
                <li>Email: <a href="mailto:truonghoanghuy164@gmail.com">truonghoanghuy164@gmail.com</a></li>
                <li>Địa chỉ: 24 Linh Trung, Phường Linh Trung, Thủ Đức, Thành phố Hồ Chí Minh, Việt Nam</li>
              </ul>
              <p className="mb-0 text-muted">Theo dõi chúng tôi trên các kênh  để cập nhật thông tin y tế hữu ích.</p>
            </div>
            <div className="col-md-6">
              <iframe
                src="https://www.google.com/maps?q=Số%20123%20Đường%20Sức%20Khỏe,%20Quận%20Trung%20Tâm,%20TP.HCM&output=embed"
                title="Bản đồ địa chỉ bệnh viện"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                className="w-100 shadow-sm"
                style={{ border: 0, borderRadius: '0.5rem', aspectRatio: '16 / 10' }}
              />
            </div>
          </div>
        </div>
      </section>
      
      <footer className="text-center text-muted small mt-4 reveal" style={{ transitionDelay: '.45s' }}>
        <p className="mb-1">Liên hệ đặt lịch: <strong>Hotline 1900 1234</strong></p>
        <p className="mb-0">© {new Date().getFullYear()} Bệnh viện. Tất cả các quyền được bảo lưu.</p>
      </footer>
    </div>
  );
}
