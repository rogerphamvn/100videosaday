(function canvasAgentModule(globalScope) {
  "use strict";

  const CANVAS_STATE_VERSION = 1;
  const HISTORY_LIMIT = 30;
  const BUILTIN_IDS = new Set(["source", "motivator", "hook-01", "hook-02", "hook-03"]);
  const MUTATING_ACTIONS = new Set(["MOVE_NODE", "ADD_NODE", "UPDATE_NODE", "UPDATE_AND_MOVE_NODE", "DELETE_NODE", "SET_VIEW", "PAN_VIEW", "ZOOM", "ARRANGE"]);
  const clampNumber = (value, min, max, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  };
  const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);
  const cleanText = (value, max) => String(value == null ? "" : value).trim().slice(0, max);
  const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
  const clone = (value) => JSON.parse(JSON.stringify(value));

  function createInitialState() {
    return {
      version: CANVAS_STATE_VERSION,
      view: { x: 0, y: 0, zoom: 1 },
      positions: {},
      customNodes: [],
      edits: {},
      selectedId: null,
      nextId: 1,
      past: []
    };
  }

  function sanitizePresent(raw) {
    if (!isRecord(raw) || raw.version !== CANVAS_STATE_VERSION) return null;
    if (!isRecord(raw.view) || !isRecord(raw.positions) || !Array.isArray(raw.customNodes) || !isRecord(raw.edits)) return null;
    const state = createInitialState();
    if (!isFiniteNumber(raw.view.x) || !isFiniteNumber(raw.view.y) || !isFiniteNumber(raw.view.zoom) || !isFiniteNumber(raw.nextId)) return null;
    state.view = {
      x: clampNumber(raw.view.x, -2400, 2400, 0),
      y: clampNumber(raw.view.y, -1600, 1600, 0),
      zoom: clampNumber(raw.view.zoom, 0.5, 1.8, 1)
    };
    for (const [id, position] of Object.entries(raw.positions)) {
      if (!BUILTIN_IDS.has(id) || !isRecord(position)) return null;
      if (!isFiniteNumber(position.x) || !isFiniteNumber(position.y)) return null;
      state.positions[id] = {
        x: clampNumber(position.x, -1600, 1600, 0),
        y: clampNumber(position.y, -1200, 1200, 0)
      };
    }
    const seen = new Set();
    for (const node of raw.customNodes) {
      if (!isRecord(node) || !/^custom-\d+$/.test(node.id) || seen.has(node.id)) return null;
      if (!isFiniteNumber(node.x) || !isFiniteNumber(node.y)) return null;
      seen.add(node.id);
      const title = cleanText(node.title, 60);
      if (!title) return null;
      state.customNodes.push({
        id: node.id,
        title,
        text: cleanText(node.text, 240),
        x: clampNumber(node.x, -1600, 1600, 80),
        y: clampNumber(node.y, -1200, 1200, 80)
      });
    }
    if (Object.keys(raw.edits).length) return null;
    const validIds = new Set([...BUILTIN_IDS, ...state.customNodes.map((node) => node.id)]);
    state.selectedId = typeof raw.selectedId === "string" && validIds.has(raw.selectedId) ? raw.selectedId : null;
    state.nextId = Math.max(1, Math.floor(clampNumber(raw.nextId, 1, 999999, 1)));
    state.past = [];
    return state;
  }

  function sanitizeCanvasState(raw) {
    const state = sanitizePresent(raw);
    if (!state) return null;
    if (raw.past !== undefined && !Array.isArray(raw.past)) return null;
    if (Array.isArray(raw.past)) {
      for (const item of raw.past.slice(-HISTORY_LIMIT)) {
        const valid = sanitizePresent(item);
        if (!valid) return null;
        valid.past = [];
        state.past.push(valid);
      }
    }
    return state;
  }

  function presentSnapshot(state) {
    const snapshot = clone(state);
    snapshot.past = [];
    return snapshot;
  }

  function withHistory(previous, next) {
    next.past = [...previous.past, presentSnapshot(previous)].slice(-HISTORY_LIMIT);
    return next;
  }

  function getNode(state, id) {
    if (BUILTIN_IDS.has(id)) return { id, builtin: true };
    return state.customNodes.find((node) => node.id === id) || null;
  }

  function resolveCanvasAction(state, action) {
    if (!isRecord(action) || typeof action.type !== "string") return null;
    if (!["UPDATE_SELECTED", "MOVE_SELECTED", "DELETE_SELECTED"].includes(action.type)) return action;
    if (!state || !state.selectedId) return null;
    if (action.type === "UPDATE_SELECTED") {
      if (!['title', 'text'].includes(action.field)) return null;
      return { type: "UPDATE_NODE", id: state.selectedId, [action.field]: action.value };
    }
    if (action.type === "MOVE_SELECTED") return { type: "MOVE_NODE", id: state.selectedId, x: action.x, y: action.y };
    return { type: "DELETE_NODE", id: state.selectedId };
  }

  function reduceCanvasState(inputState, action) {
    const state = sanitizeCanvasState(inputState);
    if (!state) return inputState;
    action = resolveCanvasAction(state, action);
    if (!action) return inputState;
    if (action.type === "UNDO") {
      if (!state.past.length) return inputState;
      const restored = clone(state.past[state.past.length - 1]);
      restored.past = state.past.slice(0, -1).map((item) => clone(item));
      return restored;
    }
    if (action.type === "RESET_CANVAS") return createInitialState();
    if (action.type === "SELECT_NODE") {
      const id = action.id == null ? null : String(action.id);
      if (id !== null && !getNode(state, id)) return inputState;
      if (state.selectedId === id) return inputState;
      const next = clone(state); next.selectedId = id; return next;
    }
    if (!MUTATING_ACTIONS.has(action.type)) return inputState;
    const next = clone(state);
    if (action.type === "MOVE_NODE") {
      const id = String(action.id || ""), node = getNode(state, id);
      if (!node || !isFiniteNumber(action.x) || !isFiniteNumber(action.y)) return inputState;
      const position = { x: clampNumber(action.x, -1600, 1600, 0), y: clampNumber(action.y, -1200, 1200, 0) };
      if (node.builtin) {
        const current = state.positions[id] || { x: 0, y: 0 };
        if (current.x === position.x && current.y === position.y) return inputState;
        next.positions[id] = position;
      } else {
        const custom = next.customNodes.find((item) => item.id === id);
        if (custom.x === position.x && custom.y === position.y) return inputState;
        custom.x = position.x; custom.y = position.y;
      }
      next.selectedId = id;
    } else if (action.type === "ADD_NODE") {
      if (typeof action.title !== "string" || (action.text !== undefined && typeof action.text !== "string")) return inputState;
      const title = cleanText(action.title, 60);
      if (!title) return inputState;
      const id = `custom-${state.nextId}`;
      next.customNodes.push({ id, title, text: cleanText(action.text, 240), x: 72 + ((state.nextId - 1) % 4) * 34, y: 72 + ((state.nextId - 1) % 5) * 38 });
      next.nextId = state.nextId + 1;
      next.selectedId = id;
    } else if (action.type === "UPDATE_NODE" || action.type === "UPDATE_AND_MOVE_NODE") {
      const id = String(action.id || ""), node = getNode(state, id);
      if (!node || (action.type === "UPDATE_NODE" && action.title === undefined && action.text === undefined)) return inputState;
      if ((action.title !== undefined && typeof action.title !== "string") || (action.text !== undefined && typeof action.text !== "string")) return inputState;
      const title = action.title === undefined ? undefined : cleanText(action.title, 60);
      const text = action.text === undefined ? undefined : cleanText(action.text, 240);
      if (action.title !== undefined && !title) return inputState;
      if (!node.builtin) {
        const custom = next.customNodes.find((item) => item.id === id);
        if (title !== undefined) custom.title = title;
        if (text !== undefined) custom.text = text;
      }
      if (action.type === "UPDATE_AND_MOVE_NODE") {
        if (!isFiniteNumber(action.x) || !isFiniteNumber(action.y)) return inputState;
        const position = { x: clampNumber(action.x, -1600, 1600, 0), y: clampNumber(action.y, -1200, 1200, 0) };
        if (node.builtin) next.positions[id] = position;
        else {
          const custom = next.customNodes.find((item) => item.id === id);
          custom.x = position.x; custom.y = position.y;
        }
      } else if (node.builtin) return inputState;
      if (JSON.stringify(presentSnapshot(next)) === JSON.stringify(presentSnapshot(state))) return inputState;
      next.selectedId = id;
    } else if (action.type === "DELETE_NODE") {
      const id = String(action.id || "");
      if (BUILTIN_IDS.has(id) || !state.customNodes.some((node) => node.id === id)) return inputState;
      next.customNodes = next.customNodes.filter((node) => node.id !== id);
      next.selectedId = null;
    } else if (action.type === "SET_VIEW") {
      if ((action.x !== undefined && !isFiniteNumber(action.x)) || (action.y !== undefined && !isFiniteNumber(action.y)) || (action.zoom !== undefined && !isFiniteNumber(action.zoom))) return inputState;
      const view = {
        x: action.x === undefined ? state.view.x : clampNumber(action.x, -2400, 2400, state.view.x),
        y: action.y === undefined ? state.view.y : clampNumber(action.y, -1600, 1600, state.view.y),
        zoom: action.zoom === undefined ? state.view.zoom : clampNumber(action.zoom, 0.5, 1.8, state.view.zoom)
      };
      if (view.x === state.view.x && view.y === state.view.y && view.zoom === state.view.zoom) return inputState;
      next.view = view;
    } else if (action.type === "PAN_VIEW") {
      if (!isFiniteNumber(action.dx) || !isFiniteNumber(action.dy)) return inputState;
      const view = { ...state.view, x: clampNumber(state.view.x + Number(action.dx), -2400, 2400, state.view.x), y: clampNumber(state.view.y + Number(action.dy), -1600, 1600, state.view.y) };
      if (view.x === state.view.x && view.y === state.view.y) return inputState;
      next.view = view;
    } else if (action.type === "ZOOM") {
      if ((action.value !== undefined && !isFiniteNumber(action.value)) || (action.value === undefined && !isFiniteNumber(action.delta))) return inputState;
      const proposed = action.value === undefined ? state.view.zoom + action.delta : action.value;
      if (!Number.isFinite(proposed)) return inputState;
      const zoom = clampNumber(proposed, 0.5, 1.8, state.view.zoom);
      if (zoom === state.view.zoom) return inputState;
      next.view.zoom = zoom;
    } else if (action.type === "ARRANGE") {
      next.positions = {};
      next.view = { x: 0, y: 0, zoom: 1 };
      next.customNodes = next.customNodes.map((node, index) => ({ ...node, x: 78 + (index % 3) * 190, y: 74 + Math.floor(index / 3) * 132 }));
      const alreadyArranged = JSON.stringify(presentSnapshot(next)) === JSON.stringify(presentSnapshot(state));
      if (alreadyArranged) return inputState;
    }
    return withHistory(state, next);
  }

  function parseCanvasCommand(value) {
    const text = cleanText(value, 300);
    if (!text) return { ok: false, action: null, message: "Nhập một lệnh ngắn." };
    let match;
    if ((match = text.match(/^(?:video\s*)?(45|60)\s*(?:giây|giay|s)$/iu))) return { ok: true, action: { type: "VIDEO_DURATION", value: Number(match[1]) }, message: `Đã đặt video ${match[1]} giây.` };
    if ((match = text.match(/^(?:tỷ\s*lệ|ty\s*le|ratio)\s*[:\-]?\s*(9:16|1:1|16:9)$/iu))) return { ok: true, action: { type: "VIDEO_RATIO", value: match[1] }, message: `Đã đặt tỷ lệ ${match[1]}.` };
    if ((match = text.match(/^(4|5)\s*(?:shot|cảnh|canh)$/iu))) return { ok: true, action: { type: "VIDEO_SHOTS", value: Number(match[1]) }, message: `Đã đặt ${match[1]} shot.` };
    if ((match = text.match(/^(?:thêm|them|tạo|tao)\s+(?:node|ghi\s*chú|ghi\s*chu)(?:\s*[:\-]\s*|\s+)(.+)$/iu))) return { ok: true, action: { type: "ADD_NODE", title: cleanText(match[1].replace(/^['"]|['"]$/g, ""), 60), text: "" }, message: "Đã thêm ghi chú cục bộ." };
    if ((match = text.match(/^(?:đổi|doi|sửa|sua)\s+(?:tiêu\s*đề|tieu\s*de)\s*[:\-]?\s*(.+)$/iu))) return { ok: true, action: { type: "UPDATE_SELECTED", field: "title", value: cleanText(match[1], 60) }, message: "Đã đổi tiêu đề node đang chọn." };
    if ((match = text.match(/^(?:sửa|sua|cập\s*nhật|cap\s*nhat)\s+(?:nội\s*dung|noi\s*dung|text)\s*[:\-]?\s*(.*)$/iu))) return { ok: true, action: { type: "UPDATE_SELECTED", field: "text", value: cleanText(match[1], 240) }, message: "Đã cập nhật nội dung node đang chọn." };
    if ((match = text.match(/^(?:di\s*chuyển|di\s*chuyen|move)(?:\s+node)?\s+(?:x\s*)?(-?\d+(?:\.\d+)?)\s*[, ]+\s*(?:y\s*)?(-?\d+(?:\.\d+)?)$/iu))) return { ok: true, action: { type: "MOVE_SELECTED", x: Number(match[1]), y: Number(match[2]) }, message: "Đã di chuyển node đang chọn." };
    if ((match = text.match(/^(?:pan|dịch\s*canvas|dich\s*canvas)\s+(-?\d+(?:\.\d+)?)\s*[, ]+\s*(-?\d+(?:\.\d+)?)$/iu))) return { ok: true, action: { type: "PAN_VIEW", dx: Number(match[1]), dy: Number(match[2]) }, message: "Đã dịch khung nhìn canvas." };
    if (/^(?:xóa|xoa|delete)(?:\s+node)?$/iu.test(text)) return { ok: true, action: { type: "DELETE_SELECTED" }, message: "Đã xóa ghi chú đang chọn." };
    if (/^(?:hoàn\s*tác|hoan\s*tac|undo)$/iu.test(text)) return { ok: true, action: { type: "UNDO" }, message: "Đã hoàn tác." };
    if (/^(?:sắp\s*xếp|sap\s*xep|arrange)$/iu.test(text)) return { ok: true, action: { type: "ARRANGE" }, message: "Đã sắp lại canvas." };
    if (/^(?:đặt\s*lại\s*góc\s*nhìn|dat\s*lai\s*goc\s*nhin|reset\s*view)$/iu.test(text)) return { ok: true, action: { type: "SET_VIEW", x: 0, y: 0, zoom: 1 }, message: "Đã đặt lại góc nhìn canvas." };
    if (/^(?:phóng\s*to|phong\s*to|zoom\s*in)$/iu.test(text)) return { ok: true, action: { type: "ZOOM", delta: 0.1 }, message: "Đã phóng to canvas." };
    if (/^(?:thu\s*nhỏ|thu\s*nho|zoom\s*out)$/iu.test(text)) return { ok: true, action: { type: "ZOOM", delta: -0.1 }, message: "Đã thu nhỏ canvas." };
    if ((match = text.match(/^zoom\s+(\d{2,3})\s*%$/iu))) return { ok: true, action: { type: "ZOOM", value: Number(match[1]) / 100 }, message: `Đã đặt zoom ${match[1]}%.` };
    if (/^(?:reset\s*canvas|xóa\s*bố\s*cục|xoa\s*bo\s*cuc)$/iu.test(text)) return { ok: true, action: { type: "RESET_CANVAS" }, message: "Đã xóa canvas cục bộ của workspace này." };
    return { ok: false, action: null, message: "Lệnh này chưa được hỗ trợ. AI và API generation chưa kết nối." };
  }

  const exported = { CANVAS_STATE_VERSION, createInitialState, sanitizeCanvasState, resolveCanvasAction, reduceCanvasState, parseCanvasCommand, clampNumber };
  if (typeof module !== "undefined" && module.exports) module.exports = exported;
  if (globalScope) globalScope.CanvasAgent = exported;
  if (typeof document === "undefined") return;

  const shell = document.querySelector("[data-testid='workspace-shell']");
  const canvas = document.querySelector("[data-testid='spatial-canvas']");
  const stage = document.querySelector("[data-testid='spatial-stage']");
  const grid = stage && stage.querySelector(".stage-grid");
  if (!shell || !canvas || !stage || !grid) return;

  let state = createInitialState();
  let scope = "";
  let layer;
  let interaction = null;
  let suppressClickUntil = 0;

  function currentScope() { return `${shell.dataset.project || "oil"}:${shell.dataset.workspace || "creative"}`; }
  function storageKey(id) { return `creative-hook-lab:canvas:v${CANVAS_STATE_VERSION}:${id}`; }
  function loadScope(id) {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey(id)) || "null");
      return sanitizeCanvasState(parsed) || createInitialState();
    } catch { return createInitialState(); }
  }
  function saveScope() {
    try { localStorage.setItem(storageKey(scope), JSON.stringify(state)); return true; }
    catch { return false; }
  }
  function emitSelection(source) {
    window.dispatchEvent(new CustomEvent("canvas:selection", { detail: { id: state.selectedId, project: shell.dataset.project || "oil", workspace: shell.dataset.workspace || "creative", source: source || "canvas-agent" } }));
  }
  function syncBaseHookSelection() {
    if (!/^hook-0[1-3]$/.test(state.selectedId || "")) return;
    const hook = findNodeElement(state.selectedId);
    if (hook && !hook.classList.contains("is-selected")) hook.click();
  }

  function createButton(label, action, title) {
    const button = document.createElement("button");
    button.type = "button"; button.textContent = label; button.dataset.caAction = action; button.title = title || label;
    return button;
  }

  const toolbar = document.createElement("div");
  toolbar.className = "ca-toolbar"; toolbar.dataset.caToolbar = ""; toolbar.setAttribute("aria-label", "Công cụ canvas cục bộ");
  toolbar.append(createButton("−", "zoom-out", "Thu nhỏ"), createButton("+", "zoom-in", "Phóng to"), createButton("Đặt lại góc nhìn", "reset-view"), createButton("Sắp xếp", "arrange"), createButton("Hoàn tác", "undo"), createButton("+ Ghi chú", "add"));
  const desktopHelp = document.createElement("span"); desktopHelp.className = "ca-help ca-help-drag"; desktopHelp.textContent = "Kéo thẻ để di chuyển · kéo nền để dịch canvas";
  const manualHelp = document.createElement("span"); manualHelp.className = "ca-help ca-help-manual"; manualHelp.textContent = "Chọn thẻ để chỉnh · Sắp xếp để về bố cục gốc";
  toolbar.append(desktopHelp, manualHelp);
  const localBadge = document.createElement("span"); localBadge.className = "ca-local-badge"; localBadge.textContent = "Lưu cục bộ"; toolbar.append(localBadge);
  canvas.insertBefore(toolbar, stage);

  const editor = document.createElement("section");
  editor.className = "ca-editor"; editor.dataset.caEditor = ""; editor.hidden = true;
  editor.setAttribute("aria-label", "Thuộc tính node đang chọn");
  editor.innerHTML = `<div class="ca-editor-head"><strong>Node đang chọn</strong><button type="button" data-ca-action="close-editor" aria-label="Đóng">×</button></div><label>Tiêu đề<input type="text" maxlength="60" data-ca-title></label><label>Nội dung<textarea rows="3" maxlength="240" data-ca-text></textarea></label><div class="ca-coordinates"><label>X<input type="number" min="-1600" max="1600" step="1" data-ca-x></label><label>Y<input type="number" min="-1200" max="1200" step="1" data-ca-y></label></div><div class="ca-editor-actions"><button type="button" data-ca-action="save-node">Lưu thay đổi</button><button type="button" class="ca-danger" data-ca-action="delete-node">Xóa ghi chú</button></div><small data-ca-editor-help>Dùng Alt + phím mũi tên để dịch node.</small>`;
  canvas.append(editor);

  const chat = document.createElement("aside");
  chat.className = "ca-chat"; chat.dataset.caChat = "";
  chat.innerHTML = `<button type="button" class="ca-chat-toggle" data-ca-chat-toggle aria-expanded="false"><span>Lệnh nhanh</span><small>AI chưa kết nối</small></button><div class="ca-chat-body" hidden><div class="ca-chat-status"><span></span>Lệnh cục bộ · không gửi API</div><div class="ca-chat-log" data-ca-chat-log aria-live="polite"></div><div class="ca-suggestions" aria-label="Lệnh gợi ý"></div><form data-ca-chat-form><label for="ca-command">Nhập lệnh</label><div><input id="ca-command" data-ca-command maxlength="300" placeholder="Ví dụ: thêm node Ý tưởng UGC"><button type="submit">Chạy</button></div></form></div>`;
  document.body.append(chat);
  const suggestions = ["thêm node Ý tưởng UGC", "sắp xếp", "đặt lại góc nhìn", "hoàn tác", "video 45 giây", "tỷ lệ 9:16"];
  const suggestionBox = chat.querySelector(".ca-suggestions");
  suggestions.forEach((command) => { const button = document.createElement("button"); button.type = "button"; button.textContent = command; button.dataset.caSuggestion = command; suggestionBox.append(button); });

  function builtinElements() {
    return [...grid.querySelectorAll(".source-card, .motivator-card, [data-hook-id]")];
  }
  function nodeId(element) { return element.dataset.hookId || element.dataset.node || ""; }
  function findNodeElement(id) { return grid.querySelector(`[data-ca-node-id="${id}"]`); }
  function nodePosition(id) {
    const custom = state.customNodes.find((node) => node.id === id);
    return custom ? { x: custom.x, y: custom.y } : (state.positions[id] || { x: 0, y: 0 });
  }
  function titleAndText(id) {
    const custom = state.customNodes.find((node) => node.id === id);
    if (custom) return { title: custom.title, text: custom.text, custom: true };
    const element = findNodeElement(id), edit = state.edits[id] || {};
    const titleTarget = element && element.querySelector("[data-source-title], [data-hook-title], blockquote, .node-label");
    const textTarget = element && element.querySelector("[data-source-copy], [data-hook-copy], .micro-facts dd");
    return { title: edit.title ?? titleTarget?.textContent.trim() ?? id, text: edit.text ?? textTarget?.textContent.trim() ?? "", custom: false };
  }

  function renderEditor() {
    const id = state.selectedId, detail = id && titleAndText(id);
    editor.hidden = !detail || shell.dataset.workspace === "video";
    if (!detail || editor.hidden) return;
    const position = nodePosition(id);
    editor.querySelector("[data-ca-title]").value = detail.title;
    editor.querySelector("[data-ca-text]").value = detail.text;
    editor.querySelector("[data-ca-x]").value = Math.round(position.x);
    editor.querySelector("[data-ca-y]").value = Math.round(position.y);
    editor.querySelector("[data-ca-action='delete-node']").hidden = !detail.custom;
    editor.querySelector("[data-ca-title]").disabled = !detail.custom;
    editor.querySelector("[data-ca-text]").disabled = !detail.custom;
    editor.querySelector("[data-ca-editor-help]").textContent = detail.custom ? "Ghi chú cục bộ: có thể sửa, di chuyển và xóa." : "Nội dung nguồn chỉ đọc; thêm ghi chú để chỉnh ý tưởng.";
  }

  function render() {
    const isVideo = shell.dataset.workspace === "video";
    canvas.dataset.caEditing = isVideo ? "false" : "true";
    toolbar.hidden = isVideo;
    builtinElements().forEach((element) => {
      const id = nodeId(element), position = state.positions[id] || { x: 0, y: 0 };
      element.dataset.caNodeId = id;
      element.classList.toggle("ca-selected", state.selectedId === id);
      element.style.setProperty("--ca-node-x", `${position.x}px`);
      element.style.setProperty("--ca-node-y", `${position.y}px`);
      if (!element.matches("button, a, input, textarea, select, [tabindex]")) element.tabIndex = 0;
      element.setAttribute("aria-keyshortcuts", "Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight");
    });
    if (!layer) { layer = document.createElement("div"); layer.className = "ca-custom-layer"; grid.append(layer); }
    layer.replaceChildren();
    state.customNodes.forEach((node) => {
      const article = document.createElement("article");
      article.className = `ca-custom-node${state.selectedId === node.id ? " ca-selected" : ""}`;
      article.dataset.caNodeId = node.id; article.tabIndex = 0;
      article.style.setProperty("--ca-node-x", `${node.x}px`); article.style.setProperty("--ca-node-y", `${node.y}px`);
      const tag = document.createElement("span"); tag.textContent = "Ghi chú cục bộ";
      const title = document.createElement("strong"); title.textContent = node.title;
      const copy = document.createElement("p"); copy.textContent = node.text || "Chưa có nội dung.";
      article.append(tag, title, copy); layer.append(article);
    });
    grid.style.setProperty("--ca-pan-x", `${state.view.x}px`);
    grid.style.setProperty("--ca-pan-y", `${state.view.y}px`);
    grid.style.setProperty("--ca-zoom", String(state.view.zoom));
    canvas.classList.toggle("ca-layout-modified", Boolean(Object.keys(state.positions).length || state.customNodes.length));
    localBadge.textContent = saveScope() ? `Lưu cục bộ · ${Math.round(state.view.zoom * 100)}%` : "Không thể lưu local";
    renderEditor();
  }

  function dispatch(action, message) {
    const resolved = resolveCanvasAction(state, action);
    if (!resolved) { postMessage("Hãy chọn một node phù hợp trước.", "error"); return false; }
    if (resolved.type.startsWith("VIDEO_")) return dispatchVideo(resolved, message);
    const next = reduceCanvasState(state, action);
    if (next === state) { if (message) postMessage("Lệnh không làm thay đổi canvas.", "neutral"); return false; }
    state = next;
    if (resolved.type === "SELECT_NODE") {
      grid.querySelectorAll("[data-ca-node-id]").forEach((element) => element.classList.toggle("ca-selected", element.dataset.caNodeId === state.selectedId));
      saveScope(); renderEditor(); emitSelection("select"); syncBaseHookSelection();
    } else render();
    if (message) postMessage(message, "success"); return true;
  }

  function dispatchVideo(action, message) {
    let control;
    if (action.type === "VIDEO_DURATION") control = document.querySelector("[data-video-duration]");
    if (action.type === "VIDEO_RATIO") control = document.querySelector("[data-video-ratio]");
    if (action.type === "VIDEO_SHOTS") control = document.querySelector("[data-shot-count]");
    if (!control || ![...control.options].some((option) => option.value === String(action.value))) { postMessage("Giá trị video không hợp lệ.", "error"); return false; }
    control.value = String(action.value);
    control.dispatchEvent(new Event("change", { bubbles: true }));
    if (action.type === "VIDEO_RATIO") document.querySelector("[data-testid='build-scene-plan']")?.click();
    if (message) postMessage(message, "success"); return true;
  }

  function postMessage(text, kind) {
    const log = chat.querySelector("[data-ca-chat-log]");
    const item = document.createElement("p"); item.dataset.kind = kind || "neutral"; item.textContent = text;
    log.append(item); while (log.children.length > 5) log.firstElementChild.remove(); log.scrollTop = log.scrollHeight;
  }

  function changeScope() {
    const nextScope = currentScope();
    if (nextScope === scope) { setTimeout(renderEditor, 0); return; }
    if (scope) saveScope();
    scope = nextScope; state = loadScope(scope); render(); emitSelection("restore"); syncBaseHookSelection();
  }

  toolbar.addEventListener("click", (event) => {
    const action = event.target.closest("[data-ca-action]")?.dataset.caAction;
    if (action === "zoom-in") dispatch({ type: "ZOOM", delta: 0.1 });
    if (action === "zoom-out") dispatch({ type: "ZOOM", delta: -0.1 });
    if (action === "reset-view") dispatch({ type: "SET_VIEW", x: 0, y: 0, zoom: 1 });
    if (action === "arrange") dispatch({ type: "ARRANGE" });
    if (action === "undo") dispatch({ type: "UNDO" });
    if (action === "add") dispatch({ type: "ADD_NODE", title: "Ghi chú mới", text: "" });
  });

  editor.addEventListener("click", (event) => {
    const action = event.target.closest("[data-ca-action]")?.dataset.caAction;
    if (action === "close-editor") dispatch({ type: "SELECT_NODE", id: null });
    if (action === "delete-node") dispatch({ type: "DELETE_NODE", id: state.selectedId });
    if (action === "save-node") {
      const x = Number(editor.querySelector("[data-ca-x]").value), y = Number(editor.querySelector("[data-ca-y]").value);
      const detail = titleAndText(state.selectedId);
      const saved = dispatch({ type: "UPDATE_AND_MOVE_NODE", id: state.selectedId, title: detail.custom ? editor.querySelector("[data-ca-title]").value : undefined, text: detail.custom ? editor.querySelector("[data-ca-text]").value : undefined, x, y });
      if (!saved) postMessage("Không có thay đổi hợp lệ để lưu.", "neutral");
    }
  });

  chat.querySelector("[data-ca-chat-toggle]").addEventListener("click", (event) => {
    const body = chat.querySelector(".ca-chat-body"), open = body.hidden;
    body.hidden = !open; event.currentTarget.setAttribute("aria-expanded", String(open));
    if (open) chat.querySelector("[data-ca-command]").focus();
  });
  chat.querySelectorAll("[data-ca-suggestion]").forEach((button) => button.addEventListener("click", () => { chat.querySelector("[data-ca-command]").value = button.dataset.caSuggestion; chat.querySelector("[data-ca-chat-form]").requestSubmit(); }));
  chat.querySelector("[data-ca-chat-form]").addEventListener("submit", (event) => {
    event.preventDefault(); const input = chat.querySelector("[data-ca-command]"), parsed = parseCanvasCommand(input.value);
    if (!parsed.ok) postMessage(parsed.message, "error");
    else if (shell.dataset.workspace === "video" && !parsed.action.type.startsWith("VIDEO_")) postMessage("Mở Insight, Creative Lab hoặc Test & Remix để thao tác canvas. Màn Video hỗ trợ thời lượng, tỷ lệ và số shot.", "error");
    else dispatch(parsed.action, parsed.message);
    input.select();
  });

  grid.addEventListener("click", (event) => {
    if (performance.now() < suppressClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    const element = event.target.closest("[data-ca-node-id]");
    if (element) dispatch({ type: "SELECT_NODE", id: element.dataset.caNodeId });
  }, true);

  grid.addEventListener("keydown", (event) => {
    const element = event.target.closest("[data-ca-node-id]");
    if (!element) return;
    if (event.altKey && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault(); event.stopImmediatePropagation();
      const current = nodePosition(element.dataset.caNodeId), step = event.shiftKey ? 1 : 10;
      dispatch({ type: "MOVE_NODE", id: element.dataset.caNodeId, x: current.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0), y: current.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0) });
    }
  }, true);

  stage.addEventListener("pointerdown", (event) => {
    if (shell.dataset.workspace === "video" || shell.dataset.view === "list" || window.matchMedia("(max-width: 820px)").matches || event.button !== 0) return;
    const element = event.target.closest("[data-ca-node-id]");
    const start = { x: event.clientX, y: event.clientY };
    if (element) {
      const position = nodePosition(element.dataset.caNodeId);
      interaction = { type: "node", pointerId: event.pointerId, element, id: element.dataset.caNodeId, start, origin: position, moved: false };
      dispatch({ type: "SELECT_NODE", id: interaction.id });
    } else if (!event.target.closest("button, a, input, textarea, select")) {
      interaction = { type: "pan", pointerId: event.pointerId, element: stage, start, origin: { x: state.view.x, y: state.view.y }, moved: false };
    }
    if (interaction) interaction.element.setPointerCapture?.(event.pointerId);
  });
  stage.addEventListener("pointermove", (event) => {
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    const dx = event.clientX - interaction.start.x, dy = event.clientY - interaction.start.y;
    if (!interaction.moved && Math.hypot(dx, dy) < 6) return;
    interaction.moved = true; event.preventDefault();
    if (interaction.type === "node") {
      interaction.preview = { x: clampNumber(interaction.origin.x + dx / state.view.zoom, -1600, 1600, interaction.origin.x), y: clampNumber(interaction.origin.y + dy / state.view.zoom, -1200, 1200, interaction.origin.y) };
      interaction.element.style.setProperty("--ca-node-x", `${interaction.preview.x}px`); interaction.element.style.setProperty("--ca-node-y", `${interaction.preview.y}px`);
    } else {
      interaction.preview = { x: clampNumber(interaction.origin.x + dx, -2400, 2400, interaction.origin.x), y: clampNumber(interaction.origin.y + dy, -1600, 1600, interaction.origin.y) };
      grid.style.setProperty("--ca-pan-x", `${interaction.preview.x}px`); grid.style.setProperty("--ca-pan-y", `${interaction.preview.y}px`);
    }
  });
  function finishPointer(event, cancelled) {
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    const completed = interaction;
    interaction = null;
    if (completed.element.hasPointerCapture?.(event.pointerId)) completed.element.releasePointerCapture(event.pointerId);
    if (completed.moved && !cancelled && completed.preview) {
      if (completed.type === "node") dispatch({ type: "MOVE_NODE", id: completed.id, ...completed.preview });
      else dispatch({ type: "SET_VIEW", ...completed.preview });
      suppressClickUntil = performance.now() + 350;
    } else render();
  }
  stage.addEventListener("pointerup", (event) => finishPointer(event, false));
  stage.addEventListener("pointercancel", (event) => finishPointer(event, true));
  stage.addEventListener("lostpointercapture", (event) => finishPointer(event, true));
  stage.addEventListener("wheel", (event) => {
    if (!(event.ctrlKey || event.metaKey) || shell.dataset.workspace === "video") return;
    event.preventDefault(); dispatch({ type: "ZOOM", delta: event.deltaY < 0 ? 0.1 : -0.1 });
  }, { passive: false });

  document.querySelector("[data-testid='reset-button']")?.addEventListener("click", () => {
    dispatch({ type: "RESET_CANVAS" });
    queueMicrotask(() => {
      const destination = currentScope();
      try { localStorage.removeItem(storageKey(destination)); } catch {}
      scope = destination; state = createInitialState(); render(); emitSelection("global-reset");
    });
  }, true);
  new MutationObserver(changeScope).observe(shell, { attributes: true, attributeFilter: ["data-project", "data-workspace"] });
  window.addEventListener("pagehide", saveScope);
  changeScope();
})(typeof window !== "undefined" ? window : globalThis);
