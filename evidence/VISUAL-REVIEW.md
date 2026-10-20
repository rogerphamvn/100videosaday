# Visual review — v1

Phạm vi: xem pixels ba ảnh concept do built-in ImageGen trả về. Không có app runtime, DOM, keyboard, responsive, contrast measurement hay provider API test.

## Kết quả quan sát

- Product & Insight: có nguồn sản phẩm/bao bì, ba motivator, hypothesis tag, inspector và CTA chọn motivator. Đã sửa attribution giả như tiếng nói khách hàng thành phản biện giả định; tất cả hàng bằng chứng ghi chưa có nguồn khách hàng. Demo banner rõ.
- Creative Lab: ba hướng hook, ảnh/video và storyboard minh họa, metadata, JSON inspector, model chưa kết nối và phép tính 3×2×2 = 12 dự kiến. Inspector là bản rút gọn, không được dùng làm provider payload hoặc schema fixture; source of truth là contracts/ và examples/.
- Winners & Remix: metric dùng dấu gạch, candidate cần xác nhận, đối chứng, thiếu dữ liệu, lineage và 3×2 = 6 dự kiến. Đã sửa motivator về “Chủ động khi nấu” và claim thành “Chưa duyệt claim — cần kiểm chứng”. Giữ thông báo chưa chạy generation.
- Cả ba có bảng màu nền sáng/xanh rêu, sidebar đồng nhất, hierarchy và CTA rõ ở kích thước desktop gốc 1586×992.

## Giới hạn còn lại ở concept

- Ảnh 01 có hàng Person đầu bị dài/lặp: label đã thành “Người nấu ăn tại nhà”, value còn chứa “quan tâm sức khỏe”. Đây là microcopy do renderer tạo trong demo, không phải audience đã nghiên cứu hay health claim được duyệt. Khi dựng UI dùng label “Đối tượng” và value “Người nấu ăn tại nhà”.
- Typography/icon/spacing có sai khác nhẹ giữa các ảnh; cần thống nhất component tokens khi implementation. Logo chỉ là dấu demo, chưa identity được duyệt.
- Ảnh 02 có depiction phun dầu vào chảo/món đang có hơi; đó là media minh họa do model tạo, không được đưa thành hướng dẫn sử dụng hay asset quảng cáo cho SKU thật. Với SKU thật phải có usage lock và visual review theo hướng dẫn nhà sản xuất trước export. Cần chọn chảo nguội/prep surface trong fixture production nếu không có nguồn cho cách dùng khác.
- Text trong ảnh không thay thế labels, data states, permissions, accessibility và responsive design trong PRD. Hình và example contracts dùng các sản phẩm demo khác nhau để phân biệt visual placeholder với schema fixture; không có SKU owner thật.
- Không có kết luận rằng taste tốt nhất, hook đã thắng hoặc output giữ đúng SKU. Chưa có owner approval.

Kết luận: đủ làm tư liệu review layout và workflow nội bộ, có các giới hạn nêu trên; chưa phải thiết kế pixel-final hay ứng dụng đã nghiệm thu.
