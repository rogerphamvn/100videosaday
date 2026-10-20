# Creative Hook Lab — Motion Contract v2

**Phạm vi:** Spatial Creative Studio raster direction + prototype CSS3D cô lập  
**Nguyên tắc:** motion giải thích quan hệ/state; không có ambient loop hay endless float  
**Authoritative state:** project graph + selection/expansion/view state trong DOM; animation không được tự tạo state

## 1. Motion grammar

Mọi chuyển động phải thuộc một trong bốn chức năng:

1. **Acknowledge:** phản hồi hover/focus/press.
2. **Locate:** giúp mắt tìm selection hoặc node mới.
3. **Explain:** cho thấy expand/collapse, parent→child, spatial→list.
4. **Confirm:** kết thúc action bằng state ổn định và status rõ.

Nếu không thuộc bốn chức năng này, bỏ motion. Stillness là trạng thái mặc định. Không shimmer nền, breathing card, orbit camera, floating island, particle drift hoặc auto-pan.

## 2. Tokens bắt buộc

| Token | Duration | Dùng | Easing đề xuất |
|---|---:|---|---|
| `motion-hover` | **120 ms** | hover/focus visual feedback | `cubic-bezier(.2,.8,.2,1)` |
| `motion-select` | **220 ms** | select/deselect, lineage emphasis | `cubic-bezier(.2,.75,.25,1)` |
| `motion-expand` | **400 ms** | expand/collapse branch, spatial/list morph | `cubic-bezier(.16,1,.3,1)` |
| `motion-exit` | 160 ms | dismiss overlay/menu | `cubic-bezier(.4,0,1,1)` |
| `motion-status` | 180 ms | success/error/status appearance | `cubic-bezier(.2,.8,.2,1)` |

Ba duration 120/220/400 ms là yêu cầu của hướng v2, không phải quy luật dùng cho mọi khoảng cách. Prototype không thêm spring overshoot. Exit ngắn hơn enter; state cuối không rung/bounce.

Chỉ animate `transform`, `opacity` và khi thật cần `clip-path`. Tránh animate width/height/top/left; expand đo layout trước rồi dùng transform/FLIP hoặc chuyển trạng thái không animation ở fallback.

## 3. State model

Mỗi node có state hữu hạn:

`rest → hover|focus → selected → expanded`

Các cờ bổ sung: `stale`, `draft`, `approved`, `disabled`, `loading`. Status không thay selection state. Một node loading không được float/spin mãi; dùng progress/status text hoặc spinner nhỏ có pause/reduced alternative.

Camera/view state:

`spatial | focus-lane | list`, cùng `selectionId`, `expandedIds`, `zoom`, `pan`. Chuyển view giữ selection và expanded state. Animation đọc từ state sau khi state đã được commit; animation cancel luôn snap tới state mới nhất.

## 4. Interaction contract

| Trigger | Visual response | Timing | Thông tin giữ cố định |
|---|---|---:|---|
| Pointer hover | card nâng 2 px, border sáng; rail không chạy | 120 ms | position trong graph, text, neighbors |
| Keyboard focus | focus ring 2–3 px, không nâng nếu gây layout | 120 ms | DOM order, selection |
| Press | scale tối đa 0.985 trong press only | 80–120 ms | label và hit target |
| Select node | card tiến 6–8 px; related lineage tăng contrast; inspector crossfade | 220 ms | graph topology, scroll context |
| Deselect | về semantic depth | 160–220 ms | expanded branches |
| Expand branch | children reveal từ parent rail, translate ngắn + opacity | 400 ms | parent anchor, sibling order |
| Collapse | children về parent và ẩn; focus chuyển về parent trước khi remove | ≤300 ms | parent selection/status |
| Create remix | connector vẽ hữu hạn một lần; child settle; status announce | 400 ms | frozen invariant snapshot |
| Spatial→List | shared card identity chuyển vị trí hoặc crossfade bounded | 400 ms | selection/filter/expanded |
| Open inspector | slide/fade 12–20 px | 220 ms | canvas selection |
| Error/stale | status chip fade + message, không shake lặp | 180–220 ms | user input và focus |

Connector “vẽ” chỉ là reveal một lần khi branch được tạo/expand, không có dash chạy vô hạn. Lineage selection dùng đổi opacity/color, không chạy pulse.

## 5. Spatial navigation

- Pan bằng pointer/touch là tiện ích. Có arrow controls hoặc focus-follow keyboard; `Fit map`, `Center selection`, zoom ± và reset luôn hiện/tiếp cận được.
- Không hijack wheel/scroll. Canvas zoom chỉ khi focus rõ hoặc với explicit modifier/control; browser zoom không bị chặn.
- Không free orbit. Camera có một góc cố định và một focus transition hữu hạn.
- Auto-center chỉ sau action explicit như `Center selection`; selection thông thường không giật viewport nếu node đã nhìn thấy.
- Khi focus node ngoài viewport, scroll/pan vừa đủ và tôn trọng reduced motion.

## 6. Drag và non-drag parity

Drag không phải interaction bắt buộc. Mọi action có thể thực hiện qua:

- Node menu: Move before/after, Move to branch, Change parent.
- Keyboard: Enter chọn/mở; Arrow điều hướng lân cận; Ctrl/Cmd + Arrow reorder nếu không xung đột; Escape đóng layer; Space expand theo semantics đã chọn.
- Form/dialog: chọn parent/position từ combobox/list.

Trong drag:

- Drop target hiển thị label + border, không chỉ màu.
- Escape cancel và trả nguyên state.
- Auto-pan có giới hạn, dừng ngay khi pointer rời edge.
- Drop commit một transaction; animation chỉ chạy sau khi graph update thành công.
- Screen reader nhận status ngắn qua một `role=status`/`aria-live=polite`, không spam mỗi pixel di chuyển.

Prototype có thể bỏ drag hoàn toàn nếu menu/keyboard đã chứng minh task.

## 7. Reduced-motion contract

### 7.1 Live preference

Không chỉ đọc preference lúc mount. Runtime phải subscribe:

```js
const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
const apply = () => setMotionMode(mq.matches ? 'reduce' : 'full');
apply();
mq.addEventListener?.('change', apply);
// cleanup: mq.removeEventListener?.('change', apply)
```

Nếu hỗ trợ browser cũ, dùng `addListener/removeListener` fallback có cleanup. Khi preference đổi trong animation:

1. Cancel animation đang chạy.
2. Commit final semantic state.
3. Xóa transform/opacity tạm và timer.
4. Giữ selection, focus và scroll context.

### 7.2 Behavior trong reduce

- Hover/focus feedback tức thì hoặc ≤80 ms color/outline.
- Select/expand/list switch đặt final state ngay; không depth travel, camera glide hoặc connector draw.
- Loading spinner đổi thành progress text/static indicator nếu quay liên tục gây motion.
- Không tự chuyển sang List nếu user đã chủ động chọn Spatial; nhưng có preference “Use list for reduced motion”.
- Tất cả thông tin và action vẫn tồn tại.

### 7.3 Page lifecycle

Khi `document.hidden` hoặc canvas offscreen: cancel/park nonessential animation. Khi quay lại, render current state một lần; không replay intro. Không có requestAnimationFrame loop lúc idle.

## 8. Mobile contract

- `<768 px`: List/Focus Lane là default; card không dùng perspective tilt.
- Spatial thumbnail nếu có là overview tĩnh với CTA `Mở bản đồ`; không auto-animate.
- Inspector thành full-screen sheet; transition 220 ms, reduced-motion immediate.
- Reorder/reparent bằng buttons/menu; không yêu cầu precision drag.
- Touch targets ≥44×44 px, spacing ≥8 px; swipe không phải action duy nhất.
- Không horizontal overflow; graph levels thành tree indentation/section headers.

## 9. CSS3D prototype contract

Prototype cô lập phải có đúng phạm vi:

- 1 Product Source Anchor dùng placeholder trung tính/ảnh được phép, không dựng 3D SKU.
- 2–3 Motivator nodes.
- 2 Concept nodes.
- 4–6 Hook/Remix child nodes.
- Controls: Spatial/List, Fit/Reset, motion mode indicator.
- Interactions: hover/focus, select, expand/collapse; một create-remix demo deterministic nếu có.
- Planar inspector với Vietnamese text ngắn.
- No API, no model calls, no persistence ngoài local demo state.

CSS architecture:

- Semantic tree/list tồn tại trong DOM; spatial layer không làm duplicate focus targets.
- Dùng `transform-style: preserve-3d` chỉ trong stage; chrome/inspector không kế thừa perspective.
- `will-change` chỉ bật gần transition rồi bỏ; không áp trên mọi card thường trực.
- Z-order từ semantic depth tokens; không random.
- Nếu 3D transform/JS fail, DOM trở thành list đọc được.

## 10. Three.js future contract

Three.js là tùy chọn cho spatial overview sau pilot, không phải dependency bắt buộc của prototype.

- Lazy import khi user mở Spatial view.
- Renderer `frameloop='demand'`/invalidation tương đương; render một frame khi state/camera thay đổi.
- Stop render khi idle, tab hidden hoặc offscreen.
- DPR cap và quality tier theo device; không giảm clarity của DOM editor.
- Picking chỉ phục vụ chọn overview node; mọi action có DOM alternative.
- Accessible outline và inspector là authoritative; canvas có label mô tả đúng scope.
- Không đặt Vietnamese body text/JSON/form controls trong texture/canvas.
- Không dựng SKU mesh từ ảnh. Chỉ load model có provenance/quyền, scale và scope được duyệt; nếu không, dùng source-image plane hoặc abstract node.
- Context loss/failure tự chuyển list/DOM fallback, không chặn workflow.

## 11. Performance budgets đề xuất cho prototype

Đây là acceptance targets để đo, không phải kết quả đã đạt:

- Idle: 0 continuous RAF loops.
- Interaction transition: không có task dài >50 ms do animation code trong test máy mục tiêu.
- Layout: không animate width/height; không layout thrash per frame.
- Canvas/DOM: tối đa số node demo đã nêu; không benchmark graph production từ prototype.
- Fonts/images giữ kích thước layout để tránh CLS.
- Spatial feature không làm chậm initial planar shell; load sau interaction/idle thích hợp.

## 12. Runtime verification matrix

| Test | Quan sát cần có | Pass condition |
|---|---|---|
| Hover | capture trước/giữa/sau | settle trong ~120 ms, không loop |
| Select | chọn bằng mouse và keyboard | same state/inspector, ~220 ms |
| Expand | expand/collapse + focus | ~400 ms enter, focus hợp lệ, topology rõ |
| Live reduced motion | đổi OS/emulation khi trang đang mở | listener phản ứng, animation cancel, final state đúng |
| Keyboard-only | hoàn tất select/open/expand/reorder alternative | không trap, focus visible/not obscured |
| Pointer non-drag | move/reparent bằng menu/form | kết quả tương đương drag |
| Mobile 390 px | List mode + inspector | không overflow, target ≥44 px |
| Hidden/offscreen | hide tab/scroll stage out | loop/timer dừng, return không replay |
| JS/3D failure | disable script/spatial module | content/task path vẫn đọc và thao tác được theo scope fallback |
| Product fidelity | inspect source anchor | image plane/source label; không inferred mesh |

Verification phải ghi rõ source check, runtime check và pixel observation. Pass build/static scan không thay cho browser interaction evidence.

## 13. Acceptance criteria

1. Không có animation vô hạn ngoài loading thật có label và reduced alternative.
2. Hover/select/expand dùng đúng 120/220/400 ms trong prototype.
3. Motion luôn gắn acknowledge/locate/explain/confirm.
4. Selection và expanded state không nằm trong animation object; cancel không mất state.
5. `prefers-reduced-motion` được nghe live và cleanup listener.
6. Đổi reduced motion giữa transition đưa UI về final stable state.
7. Hidden/offscreen/idle không giữ RAF loop.
8. Mouse, touch và keyboard cho kết quả task tương đương; drag có alternative.
9. Mobile dùng List/Focus Lane và không phụ thuộc perspective.
10. Form/editor/inspector luôn planar và text chọn/copy được.
11. Product source không bị thay bằng inferred 3D model.
12. Spatial module fail thì fallback vẫn hoàn thành task.
13. Future Three.js chỉ render-on-demand cho overview và có DOM authoritative path.
14. Báo cáo tách source code, runtime observation, pixel quality, accessibility và owner approval.

## 14. Những điều chưa được chứng minh

Tài liệu này chưa chứng minh prototype đã tồn tại, duration runtime chính xác, reduced-motion đã pass, browser performance, mobile layout, Three.js compatibility hoặc owner approval. Các kết luận đó chỉ được đưa ra sau khi builder giao artifact và reviewer quan sát bản đúng hash.
