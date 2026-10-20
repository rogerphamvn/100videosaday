# Creative Hook Lab — DESIGN v2: Spatial Creative Studio

**Ngày:** 20/10/2026  
**Trạng thái:** Hướng art/UX cho ba concept raster và prototype tương tác cô lập  
**Quan hệ với v1:** bổ sung, không thay thế `DESIGN.md`, `PRD.md` hoặc các review/manifest đã có  
**Phạm vi hiện tại:** thiết kế + hình concept + prototype CSS3D nhỏ; chưa phải backend, app đầy đủ, deploy hay tích hợp provider

## 1. Quyết định trung tâm

Creative Hook Lab v2 được thể hiện như một **Spatial Creative Studio**: lớp app chrome sáng, sạch và thực dụng bao quanh một studio canvas màu than, nơi hệ thống creative được sắp theo chiều sâu có ý nghĩa.

Chiều sâu diễn đạt tiến trình và quan hệ:

`Product source → Motivator → Concept → Hook → Remix branch`

Mỗi lớp tiến về phía người xem một bậc nhỏ. Đường nối thể hiện lineage. Card vẫn là mặt phẳng rõ chữ, có thứ tự đọc và có phiên bản list tương đương. Không gian giúp người dùng nhìn thấy creative đang sinh từ đâu và tách nhánh như thế nào; nó không biến form/editor thành trò chơi 3D.

Ba nguyên tắc khóa:

1. **Không gian có nhiệm vụ:** depth, connector và chuyển động chỉ giải thích lineage, focus hoặc thay đổi trạng thái.
2. **Nội dung làm việc vẫn phẳng:** tiếng Việt, form, table, JSON, review checklist và error phải là DOM planar, sắc nét, chọn/copy được.
3. **Sản phẩm là source thật:** dùng ảnh người dùng trong một image plane/frame; không suy hình học 3D, mặt khuất, vật liệu hay cơ chế từ vài ảnh sản phẩm.

## 2. Brief bảy lớp

### 2.1 Objective

Trong 5 giây đầu, người dùng phải hiểu đây là studio để đi từ source sản phẩm đến nhiều creative branches. Trong 30 giây, họ phải xác định được node đang chọn, cha/con của nó, evidence state và hành động kế tiếp. Sau một phiên làm việc, họ phải truy ngược một hook/remix về product source và motivator.

### 2.2 Subject

Subject là **hệ thống ra quyết định creative**, không phải mô hình 3D của sản phẩm. Các đối tượng chính:

- Product Source Anchor: ảnh/packaging và trạng thái bằng chứng.
- Motivator Plates: lý do đáng thử, alternative, objection.
- Concept Stacks: các quan hệ/scene lớn.
- Hook Cards: first frame, verbal hook, format, hypothesis.
- Remix Branches: child versions và mutation diff.
- Lineage Rails: quan hệ cha–con có hướng.

### 2.3 Art direction

Studio công cụ hiện đại, bình tĩnh, sắc nét: nền off-white, ink đậm, canvas charcoal, mint làm tín hiệu active/evidence, lime chỉ dùng cho một số điểm tạo mới hoặc node đã chọn. Không neon cyberpunk, glass blur dày, gradient tím xanh, chrome kim loại hoặc vật thể nổi vô nghĩa.

Cảm giác mong muốn: “creative operating room” thân thiện — dense vừa đủ cho người làm nghề, nhưng luôn có điểm neo và vùng nghỉ.

### 2.4 Representation & view

- Desktop: canvas trung tâm nhìn chếch rất nhẹ theo kiểu axonometric/orthographic-inspired; perspective nông để card gần không phình méo.
- Depth tối đa nhỏ, đủ thấy thứ tự 5 lớp; không camera orbit tự do.
- User có `Fit map`, `Center selection`, zoom ±, chuyển `Spatial/List`.
- Inspector và editor ở mặt phẳng màn hình, không xoay theo scene.
- Product source dùng thumbnail/crop pixels thật trong frame 2D. Nếu chưa có model nguồn được duyệt, không có mesh sản phẩm.

### 2.5 Interaction

- Click/tap/select node → node nổi rõ, lineage liên quan sáng, phần còn lại giảm prominence vừa phải.
- Double click/Enter → mở inspector hoặc editor phẳng.
- Expand/collapse một nhánh; pan/zoom canvas có control rõ.
- Tạo branch từ CTA/menu; kết quả xuất hiện từ node cha bằng transition hữu hạn.
- Drag có thể là tiện ích desktop, không bao giờ là đường duy nhất. Có Move left/right, Change parent, Reorder và keyboard tương đương.
- Mọi interaction thiết yếu dùng được ở List mode.

### 2.6 Operating model

**Rule-based interactive illustration.** Scene phản ánh project graph và UI selection state. Nó không mô phỏng vật lý, không dự báo performance và không tự chạy agent. Card/rail đổi vị trí theo layout rules; user action đổi state. Motion chỉ diễn đạt state change.

### 2.7 Output format

Hiện tại:

- Ba raster concept 16:10 do root tạo: Product Intelligence, Spatial Creative Map, Winners & Remix.
- Một prototype CSS3D cô lập do builder tạo để kiểm interaction/motion/accessibility.
- Hai design docs v2.

Tương lai, nếu qua review: spatial overview có thể dùng CSS transforms hoặc Three.js render-on-demand. Form/editor/table tiếp tục là semantic DOM.

## 3. Kiến trúc trải nghiệm

### 3.1 App shell

- **Top bar 64 px:** project/SKU, breadcrumb, evidence health, status, avatar; không nhồi KPI.
- **Left rail 224 px:** Overview, Product, Insights, Studio, Prompts, Assets, Tests, Winners; icon SVG + label.
- **Main stage:** một canvas charcoal lớn hoặc workspace planar tùy screen.
- **Right inspector 360–400 px:** chi tiết selection; collapse được; nội dung phẳng.
- **Bottom command strip:** view controls, breadcrumb lineage, undo/redo ở context phù hợp.

Trên width nhỏ, left rail thành drawer; inspector thành bottom sheet/full screen. Canvas không bị co thành bản đồ không đọc được: mặc định chuyển List mode.

### 3.2 Cấu trúc studio canvas

Năm layer đi từ trái–sau sang phải–trước, nhưng luôn giữ thứ tự đọc trái sang phải:

| Layer | Hình dạng | Ý nghĩa | Accent |
|---|---|---|---|
| L0 Product | anchor plate lớn, mặt phẳng | source và product truth | off-white + mint evidence |
| L1 Motivator | plate ngang có tab | lý do đổi cách làm | mint border khi approved |
| L2 Concept | stack 2–3 card | creative relationship/scene | neutral + category marker |
| L3 Hook | card hẹp, có format chip | first frame/copy/hypothesis | lime chỉ khi selected/new |
| L4 Remix | nhánh mảnh, child cards | mutation có lineage | dashed rail khi draft |

Z-depth là semantic token, không tự do kéo trong không gian. Mỗi node có landmark cố định: label loại ở góc trên, title, status/evidence chip, child count, action menu. Màu không phải kênh duy nhất.

### 3.3 Các chế độ xem

- **Spatial Map:** quan hệ và branch; dùng khi khám phá hoặc review toàn hệ thống.
- **List/Outline:** cùng dữ liệu theo cây semantic; mặc định mobile và reduced-motion nếu người dùng chọn.
- **Focus Lane:** chỉ lineage của selection, phù hợp với màn nhỏ hoặc project lớn.
- **Compare:** hai concept/hook ở hai cột phẳng; không dùng 3D.

View mode là preference lưu per user. Đổi mode giữ selection, filter và scroll context.

## 4. Ba màn hình concept

### 4.1 Product Intelligence — “Source as anchor”

Mục tiêu: xác nhận source thật và motivator trước khi creative hóa.

Composition:

- App shell off-white; content là layout 12 cột, không 3D nặng.
- Trái: source stack với ảnh sản phẩm/packaging trong frame phẳng, crop/source controls.
- Giữa: Product Truth cards và Motivator Map; selected motivator nổi lên 6–8 px bằng shadow/border, không nghiêng chữ.
- Phải: inspector “Vì sao đáng thử?” có Evidence / Hypothesis / Missing source.
- Một mini lineage preview ở đáy cho biết node này sẽ đi sang Concept Studio.

Điểm cần thấy trên raster: Vietnamese text sạch, source status rõ, không có mô hình chai/sản phẩm giả từ ảnh tham chiếu.

### 4.2 Spatial Creative Map — “Ideas become a system”

Mục tiêu: là hero screen của hướng v2.

Composition:

- Charcoal canvas chiếm khoảng 70–75% vùng chính; chrome ngoài vẫn off-white.
- Product Source Anchor ở trái; ba Motivator Plates; các Concept Stacks ở giữa; Hook Cards và một số Remix Branches ở phải.
- Selected lineage dùng mint rail; một child mới dùng lime ring ngắn hạn.
- Right inspector hiển thị Hook hypothesis, first frame, proof, format, prompt readiness.
- Toolbar `Spatial / List`, `Fit`, zoom, filters, search.

Không biến canvas thành galaxy/node spaghetti. Chỉ hiện 1–2 mức lân cận đầy đủ; nhánh xa gom thành stack count. Edge đi theo rail có khuỷu êm, tránh cắt xuyên text/card.

### 4.3 Winners & Remix — “Branch with discipline”

Mục tiêu: cho thấy winner candidate có context và clone có khóa.

Composition:

- Trái trên: candidate summary phẳng gồm metric context, audience, placement, window và evidence limit.
- Giữa: parent hook card trên một plinth/plate; sáu child cards fan out theo 2 hàng có connector rõ.
- Right drawer: Frozen invariants (Product, Claim, Correct use, Motivator) và Mutation controls (Hook, Scene, Format, Pace).
- Lime chỉ đánh dấu mutation được chọn; invariant dùng mint lock icon + text.
- Footer CTA: `Xem kế hoạch 6 biến thể`; chưa phải `Generate now` nếu chưa quote.

Không dùng cúp, pháo giấy hoặc crown khiến winner có vẻ tuyệt đối.

## 5. Visual system

### 5.1 Color tokens đề xuất

| Token | Giá trị | Dùng |
|---|---:|---|
| `studio-bg` | `#F3F4EF` | app background |
| `surface-1` | `#FFFFFF` | panel/card planar |
| `surface-2` | `#E9ECE6` | muted surface |
| `ink-1` | `#172019` | primary text |
| `ink-2` | `#58615A` | secondary text |
| `border` | `#D8DDD6` | separators |
| `canvas` | `#171B19` | spatial stage |
| `canvas-card` | `#242A26` | dark cards |
| `canvas-text` | `#F5F7F2` | canvas headings |
| `mint` | `#98E3C2` | selected lineage/evidence |
| `lime` | `#C9F36A` | create/new/active mutation, dùng tiết chế |
| `amber` | `#F3C969` | hypothesis/warning |
| `danger` | `#D95D55` | error/destructive |

Đây là proposal, chưa owner-approved. Text contrast phải được đo trong build; không đặt body text lime/mint trên nền sáng.

### 5.2 Typography

- Primary: Be Vietnam Pro nếu file/license được xác nhận; fallback `Inter, system-ui, sans-serif`.
- Vietnamese body 14–16 px, line-height 1.45–1.6; không body dưới 12 px.
- Data/code: `ui-monospace`; không dùng monospace cho paragraph.
- Headline vừa phải, không landing-page oversized trong app.
- Card title tối đa hai dòng; dùng line clamp + tooltip/detail, không thu nhỏ font để nhét.

### 5.3 Shape, material và depth

- Radius: 10 px controls, 12–14 px panels, 16 px hero plates.
- Shadow ở app chrome gần như không có; spatial card dùng shadow/occlusion mềm có cùng hướng sáng.
- Blur/translucency tối thiểu; không đặt text dài trên glass.
- Depth levels cố định, không random; selection không vượt qua inspector/chrome.
- Card planes không tilt quá mức làm méo chữ. Inspector luôn 2D.

### 5.4 Icons và imagery

- SVG outline icons đồng bộ; không emoji.
- Product source: pixels thật, `object-fit: contain`, background checker/neutral nếu cần.
- Generated demo product chỉ được ghi `Dữ liệu minh họa`, không coi là source truth.
- 3D primitives chỉ tượng trưng node/rail/workspace; không đại diện geometry sản phẩm.

## 6. UX states

Mỗi vùng phải có: empty, loading, partial, error, stale, read-only và permission-denied. Spatial canvas cần thêm:

- Empty: một anchor placeholder + CTA upload source, không có scene bay lơ lửng.
- Large graph: progressive disclosure, stack counts, Focus Lane.
- Unavailable spatial renderer: tự chuyển Outline/List, giữ chức năng.
- Stale lineage: amber rail + text “Nguồn đã thay đổi”; không chỉ đổi màu.
- Selected: border/ring + heading cập nhật trong inspector + `aria-current`/state phù hợp.

## 7. Responsive và accessibility

- `≥1280`: full shell + spatial canvas + inspector.
- `768–1279`: rail compact; inspector overlay; depth giảm.
- `<768`: List/Focus Lane mặc định; không ép spatial map trong viewport hẹp.
- Touch target tối thiểu 44×44 px; controls có label/tooltip.
- Skip link vào main workspace; focus order theo DOM, không theo tọa độ z.
- Spatial map có cây/outline DOM tương đương cho screen reader và keyboard.
- Drag/reparent/reorder đều có menu/nút và phím tương đương.
- Zoom không khóa browser zoom; canvas zoom có reset và giá trị hiển thị.
- Reduced motion có listener live; khi bật giữa phiên, transition đang chạy đi thẳng tới trạng thái cuối ổn định.

## 8. Ranh giới CSS3D và Three.js

### Prototype hiện tại

CSS3D/DOM transforms là lựa chọn chính vì cần kiểm text, keyboard, focus và semantics. Prototype chỉ chứng minh:

- Một product anchor.
- 2–3 motivators.
- 2 concept stacks.
- 4–6 hook/remix cards.
- Hover/focus/select/expand, List mode, reduced-motion live.

Không cần dependency mới nếu CSS/JS thuần đủ. Prototype không nối backend, agent hoặc generation.

### Three.js tương lai

Chỉ cân nhắc cho **spatial overview** khi graph scale/visual relationships hưởng lợi rõ ràng. Điều kiện:

- Lazy load sau khi user mở Spatial view.
- Render-on-demand/invalidation; park khi idle/hidden.
- DOM inspector/editor và accessible outline là authoritative interaction path.
- Không render form, Vietnamese body text hoặc JSON editor trong WebGL.
- Không tạo 3D SKU từ ảnh; model 3D chỉ dùng khi có source geometry được duyệt, scope/provenance rõ.
- CSS/List fallback giữ đầy đủ task completion.

## 9. Brief cho ba raster concept

Raster là art-direction evidence, không phải app runtime. Mỗi ảnh:

- 16:10 desktop, cùng shell/tokens/type hierarchy.
- Text chính tiếng Việt sạch và ngắn; chi tiết nhỏ dùng block/label vừa đủ, không pseudo-copy dày.
- Có nhãn `Concept UI — dữ liệu minh họa`.
- Không hiển thị provider “Connected”, cost thật, KPI live hoặc winner tuyệt đối.
- Không cho thấy 3D bottle/SKU tự suy từ screenshot tham khảo.
- Spatial Map phải đọc được product→motivator→concept→hook→remix ngay cả khi ảnh thu nhỏ.

## 10. Acceptance criteria

1. Hai tài liệu v2 tồn tại riêng; v1 không bị sửa/xóa.
2. Spatial depth có mapping cố định tới năm layer task, không dùng như decoration.
3. Product source được biểu diễn bằng ảnh phẳng/source card; không có inferred 3D SKU.
4. Form/editor/table/JSON vẫn là crisp semantic planar UI.
5. Ba concept raster dùng chung off-white chrome, charcoal canvas và accent mint/lime tiết chế.
6. Spatial Map cho thấy đúng lineage product→motivator→concept→hook→remix.
7. Không có endless float, auto-orbit, parallax scroll hoặc mọi node cùng chuyển động.
8. Prototype có hover 120 ms, select 220 ms, expand 400 ms theo motion contract.
9. Reduced-motion đổi live trong lúc mở trang và hoàn tất state mà không mất thông tin.
10. Mobile có List/Focus Lane, không horizontal overflow và không phụ thuộc canvas.
11. Keyboard có thể chọn, mở, expand, reparent/reorder qua non-drag controls.
12. Nếu spatial renderer fail/tắt, người dùng vẫn hoàn thành task bằng Outline/List.
13. Raster/prototype được báo đúng là concept/isolated demo; không tuyên bố backend, provider hoặc owner approval.
14. Nếu dùng Three.js về sau, chỉ spatial overview render-on-demand; DOM path vẫn authoritative.

## 11. Evidence và rủi ro còn lại

Hướng này được xây từ yêu cầu owner, handbook bảy lớp, subject-clarity/motion và catalog UI cục bộ. Catalog gợi ý Spatial UI nhưng palette glass xám của catalog bị loại vì không phù hợp brief; màu/tokens ở đây là creative judgment cần pixel review.

Chưa có bằng chứng rendered pixels, performance, mobile device, keyboard runtime, live reduced-motion hoặc owner taste approval trong tài liệu này. Ba raster và prototype phải được kiểm riêng; việc đọc skill hay pass source review không chứng minh chất lượng hình/interaction.
