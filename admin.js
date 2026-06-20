// PÁN KEBAB — admin panel logic
(function () {
  "use strict";

  var TOKEN_KEY = "pk_admin_token";
  var currentItems = [];

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

  function authHeaders() {
    return { "Content-Type": "application/json", "Authorization": "Bearer " + getToken() };
  }

  // Phone photos are often 3-10 MB — way past what Netlify's function
  // payload limit allows once base64-encoded (~4.5 MB effective). Shrink
  // to a sensible web size client-side before ever sending it.
  function resizeImageToJpeg(file, maxDim, quality) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var w = img.naturalWidth, h = img.naturalHeight;
        if (w > maxDim || h > maxDim) {
          if (w >= h) { h = Math.round((h * maxDim) / w); w = maxDim; }
          else { w = Math.round((w * maxDim) / h); h = maxDim; }
        }
        var canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        canvas.toBlob(function (blob) {
          if (!blob) { reject(new Error("canvas export failed")); return; }
          resolve(blob);
        }, "image/jpeg", quality);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("image load failed")); };
      img.src = url;
    });
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result.split(",")[1]); };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
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
        loadVisitStats();
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
        currentItems = (data.items || []).slice().sort(function (a, b) {
          return (a.sort_order || 0) - (b.sort_order || 0);
        });
        renderItems();
      })
      .catch(function () {
        list.innerHTML = '<p>Menu sa nepodarilo načítať. Skontrolujte, či sú nastavené Supabase premenné.</p>';
      });
  }

  function renderItems() {
    var list = document.getElementById("items-list");
    list.innerHTML = currentItems.map(itemTemplate).join("");
    currentItems.forEach(wireItem);
  }

  function itemTemplate(item, index) {
    var phTag = item.is_placeholder ? '<span class="ph-tag">Foto skoro tu</span>' : "";
    var isFirst = index === 0;
    var isLast = index === currentItems.length - 1;
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
          '<div class="reorder-btns">' +
            '<button class="btn-icon js-up" title="Posunúť hore"' + (isFirst ? " disabled" : "") + '>▲</button>' +
            '<button class="btn-icon js-down" title="Posunúť dole"' + (isLast ? " disabled" : "") + '>▼</button>' +
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
            '<span style="flex:1"></span>' +
            '<button class="btn btn-sm js-delete" style="background:#fff;color:#921912;border:2px solid #FCE4E1;">Vymazať</button>' +
            '<button class="btn btn-primary btn-sm js-save">Uložiť</button>' +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function persistOrder() {
    var ids = currentItems.map(function (it) { return it.id; });
    var dashMsg = document.getElementById("dash-msg");
    fetch("/.netlify/functions/reorder-items", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ order: ids })
    })
      .then(function (res) {
        if (res.status === 401) { bounceToLogin("Prihlásenie vypršalo. Prihláste sa znova."); return null; }
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (result) {
        if (!result) return;
        if (!result.ok) {
          flash(dashMsg, result.data.error || "Zmena poradia sa nepodarila.", "error");
          loadItems(); // resync UI with what's actually saved on the server
          return;
        }
        flash(dashMsg, "Poradie uložené ✓", "success");
      })
      .catch(function () {
        flash(dashMsg, "Server neodpovedá, poradie sa možno neuložilo.", "error");
        loadItems();
      });
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

    row.querySelector(".js-delete").addEventListener("click", function () {
      if (!window.confirm('Naozaj vymazať "' + item.name + '" z menu? Toto sa nedá vrátiť späť.')) return;
      statusEl.textContent = "Vymazávam…";
      fetch("/.netlify/functions/delete-item", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ id: item.id })
      })
        .then(function (res) {
          if (res.status === 401) { bounceToLogin("Prihlásenie vypršalo. Prihláste sa znova."); return null; }
          return res.json().then(function (data) { return { ok: res.ok, data: data }; });
        })
        .then(function (result) {
          if (!result) return;
          if (!result.ok) { statusEl.textContent = result.data.error || "Vymazanie zlyhalo."; return; }
          loadItems();
        })
        .catch(function () { statusEl.textContent = "Server neodpovedá."; });
    });

    var upBtn = row.querySelector(".js-up");
    var downBtn = row.querySelector(".js-down");
    if (upBtn) upBtn.addEventListener("click", function () { moveItem(item.id, -1); });
    if (downBtn) downBtn.addEventListener("click", function () { moveItem(item.id, 1); });

    row.querySelector(".js-photo-input").addEventListener("change", function (e) {
      var file = e.target.files[0];
      if (!file) return;
      if (!file.type || file.type.indexOf("image/") !== 0) {
        statusEl.textContent = "Vyberte obrázok (jpg, png, webp).";
        return;
      }
      statusEl.textContent = "Upravujem fotku…";

      resizeImageToJpeg(file, 1200, 0.82)
        .then(function (blob) {
          statusEl.textContent = "Nahrávam fotku…";
          return blobToBase64(blob);
        })
        .then(function (base64) {
          return fetch("/.netlify/functions/upload-image", {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ id: item.id, content_base64: base64, content_type: "image/jpeg" })
          });
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
        .catch(function () {
          statusEl.textContent = "Nepodarilo sa upraviť alebo odoslať fotku. Skúste inú fotku.";
        });
    });
  }

  function moveItem(id, direction) {
    var idx = currentItems.findIndex(function (it) { return it.id === id; });
    var swapWith = idx + direction;
    if (idx < 0 || swapWith < 0 || swapWith >= currentItems.length) return;
    var tmp = currentItems[idx];
    currentItems[idx] = currentItems[swapWith];
    currentItems[swapWith] = tmp;
    renderItems();
    persistOrder();
  }

  // ---- Add new item -------------------------------------------------------
  function wireAddForm() {
    var toggleBtn = document.getElementById("add-toggle-btn");
    var form = document.getElementById("add-form");
    var msg = document.getElementById("add-msg");

    toggleBtn.addEventListener("click", function () {
      var hidden = form.style.display === "none";
      form.style.display = hidden ? "" : "none";
      toggleBtn.textContent = hidden ? "Zrušiť" : "+ Pridať položku";
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var payload = {
        name: document.getElementById("new-name").value.trim(),
        price: document.getElementById("new-price").value,
        meat_options: document.getElementById("new-meat").value.trim() || null,
        description: document.getElementById("new-desc").value.trim(),
        category: document.getElementById("new-category").value.trim() || "Kebab"
      };
      if (!payload.name) { flash(msg, "Zadajte názov.", "error"); return; }

      fetch("/.netlify/functions/add-item", {
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
          if (!result.ok) { flash(msg, result.data.error || "Pridanie sa nepodarilo.", "error"); return; }
          form.reset();
          form.style.display = "none";
          toggleBtn.textContent = "+ Pridať položku";
          msg.className = "msg";
          loadItems();
        })
        .catch(function () { flash(msg, "Server neodpovedá.", "error"); });
    });
  }

  // ---- Visit stats --------------------------------------------------------
  function loadVisitStats() {
    var chart = document.getElementById("stats-chart");
    var totalEl = document.getElementById("stats-total");
    fetch("/.netlify/functions/get-visit-stats?days=30", { headers: authHeaders() })
      .then(function (res) {
        if (res.status === 401) { bounceToLogin("Prihlásenie vypršalo. Prihláste sa znova."); return null; }
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (result) {
        if (!result) return;
        if (!result.ok) { chart.innerHTML = "<p>Návštevnosť sa nepodarilo načítať.</p>"; return; }
        renderVisitChart(result.data.days, result.data.total);
        totalEl.textContent = result.data.total + " za 30 dní";
      })
      .catch(function () {
        chart.innerHTML = "<p>Server neodpovedá.</p>";
      });
  }

  function renderVisitChart(days, total) {
    var chart = document.getElementById("stats-chart");
    if (!days || days.length === 0) { chart.innerHTML = "<p>Zatiaľ žiadne dáta.</p>"; return; }
    var max = Math.max.apply(null, days.map(function (d) { return d.count; })) || 1;
    var todayStr = new Date().toISOString().slice(0, 10);

    chart.innerHTML = days.map(function (d) {
      var h = Math.max(2, Math.round((d.count / max) * 100));
      var isToday = d.date === todayStr;
      var dd = d.date.slice(8, 10);
      var mm = d.date.slice(5, 7);
      var title = dd + "." + mm + " — " + d.count;
      return (
        '<div class="stats-bar-wrap" title="' + title + '">' +
          '<div class="stats-bar' + (isToday ? " today" : "") + '" style="height:' + h + '%"></div>' +
        "</div>"
      );
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("login-form").addEventListener("submit", handleLogin);
    document.getElementById("logout-btn").addEventListener("click", handleLogout);
    wireAddForm();

    if (getToken()) {
      showView("dashboard-view");
      loadItems();
      loadVisitStats();
    } else {
      showView("login-view");
    }
  });
})();
