# Chạy creative

## Luồng tự động mặc định

1. Mở `/workflow`, chọn dự án và kiểm tra ảnh sản phẩm thật đang hiển thị.
2. Chọn mục tiêu, đầu ra **1 ảnh** hoặc **1 video 15 giây**, ưu tiên sáng tạo và ngân sách tổng (tối đa 2 USD). Ưu tiên sáng tạo hướng dẫn nội dung prompt; không tự thay model đã chọn.
3. Nếu thiếu key hoặc model hợp lệ, dùng thao tác thiết lập được hiển thị ngay tại màn này. Key được lưu mã hóa phía server, không đọc lại trên trình duyệt.
4. Bấm **Bắt đầu tự động** để chuẩn bị kế hoạch. Xem đúng model, ảnh đầu vào và hạn mức, rồi xác nhận chạy.
5. Server xử lý phân tích → research → hooks → mega/negative JSON → tạo creative. Tiến độ được lưu trong D1; không cần giữ tab mở. Lịch nền mỗi phút tiếp tục bước tiếp theo nên không phải mọi bước chuyển ngay lập tức.
6. Khi gặp lỗi, xem lý do tại lần chạy. Hủy chỉ dừng các bước chưa gửi; không thu hồi yêu cầu đang xử lý hoặc xóa chi phí đã phát sinh. Yêu cầu trả phí có kết quả chưa rõ không tự gửi lại.

Ngân sách tự động dùng chung cho AI và media, đồng thời vẫn chịu các chốt hạn mức hiện có. Đây là kiểm soát khoản dự trù trong app, không thay thế hạn mức và báo cáo thanh toán của provider. Lịch nền mới có thể cần tối đa 15 phút để Cloudflare áp dụng; trạng thái sẵn sàng phải phản ánh nhịp chạy nền. Xem [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/).

Chọn **Canvas nâng cao** để xem node, thay model cụ thể hoặc dùng thao tác thủ công. Bố cục node đã lưu vẫn được giữ.

## Luồng node thủ công

1. Mở `/workflow`, chọn hoặc tạo dự án tại node **Dự án**.
2. Mở **Sản phẩm**, thêm ảnh sản phẩm và bao bì thật. Kiểm tra ảnh đúng dự án.
3. Vào **Thiết lập chạy**, nhập key provider và chọn model cho phân tích, research, strategy và prompt. Key chỉ được lưu phía server; giao diện không đọc lại giá trị key.
4. Chọn **Kiểm tra kết nối**, đọc lý do nếu có bước bị khóa, rồi **Chạy pilot**. Pilot phân tích → web research → hooks → mega/negative JSON dùng hạn mức 2 USD riêng.
5. Chọn node **Tạo ảnh** hoặc **Tạo video**, chọn provider, tìm model và lưu. Catalog có thể chứa model chưa có adapter đã kiểm chứng; giao diện phải ghi rõ trường hợp này. Không tự thay model khác.
6. Mở thao tác tạo media, chọn prompt phù hợp, đặt hạn mức media riêng (mặc định 0), lấy dự toán rồi xác nhận tạo. Dự toán và khoản giữ trong app không phải cam kết giá tối đa từ provider.
7. Cập nhật trạng thái job để lấy kết quả. Khi kết quả chưa rõ, giữ nguyên job để kiểm tra; không tạo lại bằng một yêu cầu mới chỉ vì mạng chậm.

## Những điểm cần phân biệt

- Canvas lưu bố cục, lựa chọn và quan hệ hiển thị; dây nối không tự biến thành một chương trình thực thi tùy ý.
- Chat điều khiển các thao tác được app hỗ trợ, dùng cùng trạng thái với nút/form.
- Video 30/45/60 giây là kế hoạch chia đoạn. Tạo một job hiện tạo một đoạn có prompt/thời lượng phù hợp; chưa tự ghép, audit và thêm motion cho toàn bộ quảng cáo.
- Cache kết quả theo dự án tránh gọi lại provider khi đầu vào còn hợp lệ. Prompt caching là cơ chế riêng của provider; chỉ tính cache hit khi có số liệu trả về.
- Voice/Jev cần backend tương ứng. Thiếu backend được báo rõ, không phát nội dung mẫu thay kết quả thật.
- Production là kế hoạch công suất; chưa chứng minh đạt 100 video hoàn thiện mỗi ngày.
