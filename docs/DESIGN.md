# Creative Hook Lab — hướng giao diện v1

Ứng dụng làm việc nội bộ, desktop-first; không phải landing page quảng cáo. Ba ảnh khái niệm riêng, mỗi ảnh là một màn hình ứng dụng. PRD là nguồn chức năng; mockup thể hiện hướng visual và không phải UI tương tác.

## Visual system đề xuất

- Nền #F5F6F3; surface #FFFFFF; ink #202622; secondary #59665D; border #DDE3DC; primary #214D3C với chữ trắng; selected #E7EFE8; amber #F4E8C6, chữ #6B4C10 cho giả thuyết.
- Sans có tiếng Việt, ưu tiên Be Vietnam Pro khi triển khai sau kiểm tra giấy phép/file font; system sans fallback. Code dùng ui-monospace. Mockup chỉ đề xuất cảm giác typography, chưa kiểm chứng font thực.
- Grid 8px; sidebar 216–232px; topbar 64px; content max 1600px; panel radius 10–14px; border nhẹ, shadow hạn chế. Body 14–16px; caption tối thiểu 12px; controls tối thiểu 44px.
- Một CTA chính theo context: Chọn motivator → Tạo prompt → Tạo biến thể. Thao tác trả phí có preview số lượng, model, quote và budget; không generation trên upload.
- Evidence chip: Đã xác nhận / Quan sát từ ảnh / Giả thuyết / Thiếu nguồn. Có icon và chữ, không chỉ màu.
- Dense ở vùng tác nghiệp; có khoảng trống để đọc. Không gradient tím xanh, không KPI giả hoặc live badge ngụ ý API đã nối.
- Mobile: sidebar thành drawer, nội dung một cột, matrix có chế độ list, prompt editor toàn màn hình, không ép bảng rộng. Breakpoints kiểm sau ở 390/768/1440px.

## Ba mockup

1. **Product & Insight**: breadcrumb dự án; nguồn ảnh/packaging ở rail trái; motivator và bằng chứng ở trung tâm; panel giải thích "Vì sao đáng thử?" bên phải. Có nhãn dữ liệu minh họa. Demo sản phẩm bình xịt dầu hình học trung tính, không brand/SKU thật.
2. **Creative Lab**: hook matrix + gallery ảnh và storyboard video. Hiện lineage motivator → concept → hook; panel JSON/negative prompt và chọn provider ở bên phải; model ở trạng thái cấu hình/chưa kết nối. Chọn batch 12 assets nhưng chưa chạy là trạng thái dự kiến, không số asset đã tạo.
3. **Winners & Remix**: bảng kết quả demo có nhãn rõ; winner candidate, không khẳng định thắng tuyệt đối. Một concept được chọn và control; mutation drawer cho đổi hook/scene/format, khóa sản phẩm/motivator/claim; preview 6 biến thể có lineage; CTA chuẩn bị batch chứ không auto-spend.

## Điều chỉnh từ UI catalog

Tra cứu local trả về Swiss/minimalism phù hợp app nhưng recipe Hero + Features + CTA thuộc marketing site, không phù hợp công cụ nội bộ. Giữ nguyên tắc hierarchy/contrast, thay layout bằng workspace navigation và panels theo tác vụ. Bảng màu xanh rêu và background trung tính là đề xuất riêng, chưa owner-approved.

## Giới hạn image tool

Dùng built-in ImageGen. Tool không có trường chọn model/version; không thể xác nhận các mockup được tạo bởi GPT Image 2.5. Endpoint GPT Image 2.5 cho app tương lai được đặc tả riêng sau nghiên cứu provider. Không giả vờ một ảnh raster là app đã hoạt động. Chữ trong ảnh cần dựng lại bằng HTML khi implementation.
