(() => {
  "use strict";

  const page = document.body.dataset.authPage || "studio";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const errorMessages = {
    invalid_credentials: "Tài khoản hoặc mật khẩu chưa đúng.",
    current_password_incorrect: "Mật khẩu hiện tại chưa đúng.",
    too_many_attempts: "Đã thử quá nhiều lần. Vui lòng chờ một chút rồi thử lại.",
    password_length: "Mật khẩu mới phải từ 12 đến 128 ký tự.",
    password_confirmation_mismatch: "Hai mật khẩu mới chưa trùng nhau.",
    new_password_must_differ: "Mật khẩu mới cần khác mật khẩu hiện tại.",
    session_stale: "Phiên đăng nhập đã thay đổi. Vui lòng tải lại và đăng nhập lại.",
    authentication_required: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    credential_changed_retry: "Thông tin đăng nhập vừa thay đổi. Vui lòng đăng nhập lại rồi thử tiếp.",
    service_unavailable: "Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại sau."
  };

  async function request(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    const response = await fetch(path, {
      credentials: "same-origin",
      headers,
      ...options
    });
    let body = {};
    try { body = await response.json(); } catch { body = {}; }
    if (!response.ok) {
      const code = typeof body.error === "string" ? body.error : "";
      const error = new Error(errorMessages[code] || "Yêu cầu chưa thể hoàn tất. Vui lòng thử lại.");
      error.status = response.status;
      error.code = code;
      throw error;
    }
    return body;
  }

  function setBusy(form, busy, busyLabel) {
    const button = $("[data-submit]", form);
    if (!button) return;
    if (!button.dataset.idleLabel) button.dataset.idleLabel = $("[data-submit-label]", button)?.textContent || "Tiếp tục";
    button.disabled = busy;
    button.setAttribute("aria-busy", String(busy));
    const label = $("[data-submit-label]", button);
    if (label) label.textContent = busy ? busyLabel : button.dataset.idleLabel;
  }

  function showMessage(element, message) {
    if (!element) return;
    element.textContent = message;
    element.hidden = !message;
    if (message && element.matches("[role='alert']")) element.focus();
  }

  function clearErrors(form) {
    $$("[aria-invalid='true']", form).forEach((input) => input.removeAttribute("aria-invalid"));
    $$("[data-field-error]", form).forEach((node) => { node.textContent = ""; });
    showMessage($("[data-form-error]"), "");
  }

  function fieldError(form, name, message) {
    const input = form.elements[name];
    const error = $(`[data-field-error='${name}']`, form);
    input?.setAttribute("aria-invalid", "true");
    if (error) error.textContent = message;
  }

  function initPasswordToggles() {
    $$('[data-password-toggle]').forEach((button) => {
      button.addEventListener("click", () => {
        const input = document.getElementById(button.dataset.passwordToggle);
        if (!input) return;
        const showing = input.type === "text";
        input.type = showing ? "password" : "text";
        button.textContent = showing ? "Hiện" : "Ẩn";
        button.setAttribute("aria-pressed", String(!showing));
        input.focus({ preventScroll: true });
      });
    });
  }

  async function logout() {
    await request("/api/auth/logout", { method: "POST", body: "{}" });
    window.location.assign("/login");
  }

  function initLogoutForms() {
    $$('[data-logout-form]').forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const button = $("button", form);
        const errorBox = $("[data-logout-error]", form);
        showMessage(errorBox, "");
        if (button) { button.disabled = true; button.setAttribute("aria-busy", "true"); }
        try {
          await logout();
        } catch (error) {
          showMessage(errorBox, error.message);
          if (button) { button.disabled = false; button.setAttribute("aria-busy", "false"); }
        }
      });
    });
  }

  async function initLogin() {
    const form = $("[data-login-form]");
    const errorBox = $("[data-form-error]");
    const successBox = $("[data-login-success]");
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") === "/account" ? "/account" : "/";
    let sessionReady = false;
    form.addEventListener("submit", (event) => { if (!sessionReady) event.preventDefault(); });
    setBusy(form, true, "Đang kiểm tra phiên…");
    if (params.get("changed") === "1") successBox.hidden = false;

    try {
      const session = await request("/api/auth/session");
      if (session.authenticated) {
        window.location.replace(next);
        return;
      }
    } catch { /* An unauthenticated response is the expected login state. */ }
    sessionReady = true;
    setBusy(form, false);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearErrors(form);
      const username = form.elements.username.value.trim();
      const password = form.elements.password.value;
      if (!password) {
        fieldError(form, "password", "Vui lòng nhập mật khẩu.");
        form.elements.password.focus();
        return;
      }
      setBusy(form, true, "Đang đăng nhập…");
      try {
        await request("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
        window.location.assign(next);
      } catch (error) {
        showMessage(errorBox, error.message);
        form.elements.password.select();
      } finally {
        setBusy(form, false);
      }
    });
  }

  function validatePasswordForm(form) {
    const currentPassword = form.elements.currentPassword.value;
    const newPassword = form.elements.newPassword.value;
    const confirmPassword = form.elements.confirmPassword.value;
    let firstInvalid = null;
    const add = (name, message) => { fieldError(form, name, message); if (!firstInvalid) firstInvalid = form.elements[name]; };

    if (!currentPassword || currentPassword.length > 128) add("currentPassword", "Vui lòng nhập mật khẩu hiện tại, tối đa 128 ký tự.");
    if (newPassword.length < 12 || newPassword.length > 128) add("newPassword", "Mật khẩu mới phải từ 12 đến 128 ký tự.");
    else if (newPassword === currentPassword) add("newPassword", "Mật khẩu mới cần khác mật khẩu hiện tại.");
    if (confirmPassword.length < 12 || confirmPassword.length > 128) add("confirmPassword", "Phần xác nhận phải từ 12 đến 128 ký tự.");
    else if (confirmPassword !== newPassword) add("confirmPassword", "Hai mật khẩu mới chưa trùng nhau.");

    firstInvalid?.focus();
    return firstInvalid ? null : { currentPassword, newPassword, confirmPassword };
  }

  async function initAccount() {
    const form = $("[data-password-form]");
    const errorBox = $("[data-form-error]");
    const successBox = $("[data-form-success]");
    let sessionReady = false;
    form.addEventListener("submit", (event) => { if (!sessionReady) event.preventDefault(); });
    setBusy(form, true, "Đang kiểm tra phiên…");
    try {
      const session = await request("/api/auth/session");
      if (!session.authenticated) throw Object.assign(new Error("Phiên đăng nhập đã hết hạn."), { status: 401 });
      $("[data-session-username]").textContent = session.username || "team";
      sessionReady = true;
      setBusy(form, false);
    } catch (error) {
      if (error.status === 401 || ["authentication_required", "session_stale"].includes(error.code)) {
        window.location.replace("/login?next=%2Faccount");
        return;
      }
      $("[data-session-username]").textContent = "Không thể kiểm tra phiên";
      showMessage(errorBox, error.message);
      const button = $("[data-submit]", form);
      const label = $("[data-submit-label]", button);
      if (button) { button.disabled = true; button.setAttribute("aria-busy", "false"); }
      if (label) label.textContent = "Tải lại trang để thử lại";
      return;
    }

    const newPassword = form.elements.newPassword;
    newPassword.addEventListener("input", () => { $("[data-password-count]").textContent = String(newPassword.value.length); });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearErrors(form);
      showMessage(successBox, "");
      const payload = validatePasswordForm(form);
      if (!payload) {
        showMessage(errorBox, "Vui lòng kiểm tra các trường được đánh dấu.");
        return;
      }
      setBusy(form, true, "Đang lưu…");
      try {
        await request("/api/auth/password", { method: "POST", body: JSON.stringify(payload) });
        try { await request("/api/auth/logout", { method: "POST", body: "{}" }); } catch { /* The changed credential still takes effect server-side. */ }
        form.reset();
        $("[data-password-count]").textContent = "0";
        showMessage(successBox, "Đổi mật khẩu thành công. Đang chuyển về trang đăng nhập…");
        window.setTimeout(() => window.location.assign("/login?changed=1"), 700);
      } catch (error) {
        if (error.code === "current_password_incorrect") {
          fieldError(form, "currentPassword", error.message);
          form.elements.currentPassword.focus();
        } else if (["password_length", "new_password_must_differ"].includes(error.code)) {
          fieldError(form, "newPassword", error.message);
          form.elements.newPassword.focus();
        } else if (error.code === "password_confirmation_mismatch") {
          fieldError(form, "confirmPassword", error.message);
          form.elements.confirmPassword.focus();
        }
        showMessage(errorBox, error.message);
      } finally {
        setBusy(form, false);
      }
    });
  }

  initPasswordToggles();
  initLogoutForms();
  if (page === "login") initLogin();
  if (page === "account") initAccount();
})();
