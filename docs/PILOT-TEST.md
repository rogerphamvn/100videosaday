# Pilot test thật — analysis → OpenRouter Web Search → hooks → prompt

## Phạm vi lần đầu

Pilot chạy trên **một dự án đã chọn** và chỉ bắt đầu khi người dùng bấm **Chạy pilot thật**. Pipeline được giới hạn ở bốn stage:

1. phân tích ảnh sản phẩm/packaging;
2. research web qua OpenRouter với source record;
3. motivator, creative hooks và taste synthesis;
4. cặp MEGA PROMPT JSON + Negative Prompt JSON đã qua backend validator.

Pilot **không** gửi job tạo ảnh/video, không gọi fal/Replicate, không dựng clip và không chứng minh năng lực 100 video/ngày.

## Bộ chọn media chuẩn bị sẵn

Phần Generation hiển thị ba provider `fal.ai`, `OpenRouter`, `Replicate`, hai loại output `image`/`video` và model phụ thuộc vào cặp provider/output. Danh sách model chỉ lấy từ `providerReadiness.media.modelChoices` do backend trả về:

- fal/Replicate chỉ hiện ID nằm trong capability registry và mapping server;
- OpenRouter hiện trạng thái adapter chưa triển khai nếu backend chưa có model hợp lệ;
- `configured`, `supported`, `executionImplemented` và media execution flag được hiển thị tách biệt;
- provider/media/model preference được lưu trong browser bằng key có `projectId`; model canonical được backend hỗ trợ có thể được chọn làm preference dù chưa mapping, nhưng preference không chứa API key và không biến model chưa cấu hình thành model sẵn sàng;
- lựa chọn model không tự gửi request. Nút submit chỉ có thể bật khi prompt runtime, mapping, adapter và execution đều được backend xác nhận.

Trong pilot hiện tại `executionImplemented=false` và media execution tắt, vì vậy bộ chọn dùng để xem cấu hình; không phát sinh media job trả phí.

## Budget guard

- Trần do owner duyệt cho pilot này: **2,00 USD tổng cộng**.
- Browser chỉ gửi `projectId` và `requestId` khi owner bấm chạy. Trần 2,00 USD được cố định ở server; backend là nguồn sự thật cho số tiền đã dự trù, đang hold, đã chi và còn lại.
- Guard có hai lớp: app giữ ngân sách theo stage trong một envelope không reset; trước mỗi call, backend kiểm tra credential OpenRouter đang báo total limit không reset, bao gồm BYOK và còn đủ allowance. Đây là cấu hình phòng ngừa; chỉ receipt chi phí của pilot mới xác minh hành vi billing thực tế.
- Cùng project/source/request/budget phải dùng idempotency key cũ khi retry. Thay source hoặc đổi trần tạo intent mới; backend có quyền từ chối xung đột.
- Khi charge chưa chắc chắn, run phải vào trạng thái giữ/đối soát và chặn request mới. UI không suy diễn refund hoặc tự giảm số đã chi.
- Budget của pipeline không cấp quyền dùng media. Media execution vẫn là một phạm vi khác.

## Readiness trước khi bấm chạy

UI chỉ bật nút khi có dự án, ít nhất một source `product`, OpenRouter model policy hợp lệ, execution flag phía server bật, OpenRouter Web Search được backend xác nhận và preflight trong phiên hiện tại trả `pilotKey.hardCapReady=true`. UI hiển thị các trường an toàn `limitUsd`, `remainingUsd`, `reset`, `includesByok` và `hardCapReady`; không hiển thị credential. Preflight chỉ kiểm tra key/catalog/cap; không phải một inference run.

Nếu readiness chưa đủ, backend phải fail closed. UI hiển thị mã lỗi an toàn, stage, trạng thái retry/tiếp tục cùng run và snapshot ngân sách nếu backend trả về; không hiển thị key, upstream response body hoặc prompt chứa dữ liệu nhạy cảm.

## Bằng chứng research

Mỗi evidence card giữ URL, title/snippet và ngày truy xuất khi backend/provider trả về. UI cũng hiển thị publisher/domain, loại nguồn, provider search và ngày xuất bản khi các trường này có trong source record. Trường provider không hỗ trợ sẽ được bỏ qua; UI không thay ngày xuất bản bằng ngày truy xuất.

Trend, motivator và hook chỉ được gắn citation từ `evidenceRefs` trỏ tới source record đã lưu. Nội dung không có source vẫn là hypothesis; kết quả model không tự trở thành bằng chứng khách hàng hay claim sản phẩm.

## Cách test thủ công

1. Đăng nhập và mở `/workflow`.
2. Chọn dự án pilot, kiểm tra đúng ảnh product và packaging.
3. Bấm **Kiểm tra kết nối**; xác nhận OpenRouter key/catalog hợp lệ và dòng cap hiển thị `hard cap đạt` cùng limit/remaining/reset/BYOK phù hợp.
4. Xác nhận thanh readiness báo OpenRouter Web Search sẵn sàng, media ngoài phạm vi pilot.
5. Xác nhận UI hiển thị trần cố định `2.00 USD`, sau đó bấm **Chạy pilot thật** đúng một lần.
6. Theo dõi trạng thái ngân sách và bốn stage. Nếu lỗi retryable, bấm lại chỉ sau khi UI/backend cho biết có thể tiếp tục cùng run.
7. Kiểm tra evidence có URL/title/snippet; publisher/source type, ngày xuất bản và ngày truy xuất chỉ hiển thị khi source record trả về.
8. Kiểm tra motivator/hooks có citation; cặp prompt phải xuất hiện dưới trạng thái backend đã validate.
9. Xác nhận không có media job mới được tạo.
10. Thử đổi fal/OpenRouter/Replicate và image/video; xác nhận model/status đổi theo snapshot server, nút media submit vẫn tắt.

## Tiêu chí đạt

- Tổng chi phí backend ghi nhận không vượt 2,00 USD và không có request mới khi ngân sách đang đối soát hoặc đã cạn. Nếu provider không trả usage/cost đáng tin cậy, số dự trù phải chuyển sang hold thay vì coi là đã hoàn tiền.
- Cùng request retry không tạo chi phí/stage duplicate.
- Bốn stage có provenance model/provider; research có source record và citation hợp lệ.
- Cặp prompt được backend validate và gắn source revision/run hiện tại.
- Không có key hoặc upstream body trong browser/log/artifact; không có media generation.

Kết quả pilot chỉ chứng minh pipeline này chạy được trên đúng input đã test. Chất lượng creative, hiệu quả thị trường, tốc độ 100 video/ngày và chi phí ở quy mô lớn vẫn cần benchmark riêng.
