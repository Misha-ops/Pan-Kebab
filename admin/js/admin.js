// PÁN KEBAB — admin panel logic
(function () {
  "use strict";

  var TOKEN_KEY = "pk_admin_token";

  function getToken() { return sessionStorage.getItem(TOKEN_KEY); }
  function setToken(t) { sessionStorage.setItem(TOKEN_KEY, t); }
  function clearToken() { sessionStorage.removeItem(TOKEN_KEY); }

  function showView(id) {
    ["login-view", "dashboard-view"].forEach(function (v) {
      document.getElementById(v).style.display = v === id ? "" : "none";
    });
  }

  function flash(el, text, type) {
    el.textContent = text;
    el.className = "msg show " + (type || "");
    if (type === "success") {
      setTimeout(function () { el.className = "msg"; }, 2500);
    }
  }

  // ---- Login ------------------------------------------------------------
  function handleLogin(e) {
    e.preventDefault();
    var password = document.getElementById("password").value;
    var msg = document.getElementById("login-msg");
    msg.className = "msg";

    fetch("/.netlify/functions/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: password })
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok) {
          flash(msg, result.data.error || "Prihlásenie sa nepodarilo.", "error");
          return;
        }
        setToken(result.data.token);
        document.getElementById("password").value = "";
        showView("dashboard-view");
        loadItems();
      })
      .catch(function () {
        flash(msg, "Server neodpovedá. Skúste znova.", "error");
      });
  }

  function handleLogout() {
    clearToken();
    showView("login-view");
  }

  function bounceToLogin(message) {
    clearToken();
    showView("login-view");
    if (message) flash(document.getElementById("login-msg"), message, "error");
  }

  // ---- Load + render items -----------------------------------------------
  function loadItems() {
    var list = document.getElementById("items-list");
    list.innerHTML = "<p>Načítavam menu…</p>";
    fetch("/.netlify/functions/get-menu")
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var items = (data.items || []).slice().sort(function (a, b) {
          return (a.sort_order || 0) - (b.sort_order || 0);
        });
        list.innerHTML = items.map(itemTemplate).join("");
        items.forEach(wireItem);
      })
      .catch(function () {
        list.innerHTML = '<p>Menu sa nepodarilo načítať. Skontrolujte, či sú nastavené Supabase premenné.</p>';
      });
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function itemTemplate(item) {
    var phTag = item.is_placeholder ? '<span class="ph-tag">Foto skoro tu</span>' : "";
    return (
      '<div class="item-editor" data-id="' + item.id + '">' +
        '<div>' +
          '<div class="item-photo">' +
            '<img src="' + escapeHtml(item.image_url) + '" alt="">' +
            phTag +
          "</div>" +
          '<div class="item-photo-actions">' +
            '<input type="file" accept="image/png,image/jpeg,image/webp" class="js-photo-input">' +
          "</div>" +
        "</div>" +
        '<div class="item-fields">' +
          "<h3>" + escapeHtml(item.name) + "</h3>" +
          '<div class="field-row">' +
            '<div class="field"><label>Názov</label><input class="js-name" value="' + escapeHtml(item.name) + '"></div>' +
            '<div class="field" style="max-width:120px;"><label>Cena (€)</label><input class="js-price" type="number" step="0.10" min="0" value="' + item.price + '"></div>' +
          "</div>" +
          '<div class="field"><label>Mäso (oddeľte / )</label><input class="js-meat" value="' + escapeHtml(item.meat_options || "") + '" placeholder="napr. Kuriacie / Teľacie — nechajte prázdne, ak sa nehodí"></div>' +
          '<div class="field"><label>Popis</label><textarea class="js-desc">' + escapeHtml(item.description) + "</textarea></div>" +
          '<div class="item-footer">' +
            '<span class="item-status js-status"></span>' +
            '<button class="btn btn-primary btn-sm js-save">Uložiť</button>' +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function authHeaders() {
    return { "Content-Type": "application/json", "Authorization": "Bearer " + getToken() };
  }

  function wireItem(item) {
    var row = document.querySelector('.item-editor[data-id="' + item.id + '"]');
    if (!row) return;
    var statusEl = row.querySelector(".js-status");

    row.querySelector(".js-save").addEventListener("click", function () {
      var payload = {
        id: item.id,
        name: row.querySelector(".js-name").value.trim(),
        price: row.querySelector(".js-price").value,
        meat_options: row.querySelector(".js-meat").value.trim() || null,
        description: row.querySelector(".js-desc").value.trim()
      };
      statusEl.textContent = "Ukladám…";

      fetch("/.netlify/functions/save-item", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (res.status === 401) { bounceToLogin("Prihlásenie vypršalo. Prihláste sa znova."); return null; }
          return res.json().then(function (data) { return { ok: res.ok, data: data }; });
        })
        .then(function (result) {
          if (!result) return;
          if (!result.ok) { statusEl.textContent = result.data.error || "Chyba pri ukladaní."; return; }
          statusEl.textContent = "Uložené ✓";
          row.querySelector("h3").textContent = result.data.item.name;
          setTimeout(function () { statusEl.textContent = ""; }, 2500);
        })
        .catch(function () { statusEl.textContent = "Server neodpovedá."; });
    });

    row.querySelector(".js-photo-input").addEventListener("change", function (e) {
      var file = e.target.files[0];
      if (!file) return;
      statusEl.textContent = "Nahrávam fotku…";
      var reader = new FileReader();
      reader.onload = function () {
        var base64 = reader.result.split(",")[1];
        fetch("/.netlify/functions/upload-image", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ id: item.id, content_base64: base64, content_type: file.type })
        })
          .then(function (res) {
            if (res.status === 401) { bounceToLogin("Prihlásenie vypršalo. Prihláste sa znova."); return null; }
            return res.json().then(function (data) { return { ok: res.ok, data: data }; });
          })
          .then(function (result) {
            if (!result) return;
            if (!result.ok) { statusEl.textContent = result.data.error || "Nahranie fotky zlyhalo."; return; }
            row.querySelector(".item-photo img").src = result.data.item.image_url;
            var phTag = row.querySelector(".ph-tag");
            if (phTag) phTag.remove();
            statusEl.textContent = "Fotka nahraná ✓";
            setTimeout(function () { statusEl.textContent = ""; }, 2500);
          })
          .catch(function () { statusEl.textContent = "Server neodpovedá."; });
      };
      reader.readAsDataURL(file);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("login-form").addEventListener("submit", handleLogin);
    document.getElementById("logout-btn").addEventListener("click", handleLogout);

    if (getToken()) {
      showView("dashboard-view");
      loadItems();
    } else {
      showView("login-view");
    }
  });
})();
