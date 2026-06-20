// PÁN KEBAB — frontend logic
(function () {
  "use strict";

  // ---- Opening hours model -------------------------------------------
  // close > 1440 means "closes after midnight" (e.g. 1500 = 01:00 next day)
  var HOURS = {
    0: { open: 11 * 60, close: 22 * 60, group: "ne" },          // Sun
    1: { open: 10 * 60, close: 23 * 60, group: "po-st" },       // Mon
    2: { open: 10 * 60, close: 23 * 60, group: "po-st" },       // Tue
    3: { open: 10 * 60, close: 23 * 60, group: "po-st" },       // Wed
    4: { open: 10 * 60, close: 23 * 60, group: "po-st" },       // Thu
    5: { open: 10 * 60, close: 25 * 60, group: "pi-so" },       // Fri
    6: { open: 10 * 60, close: 25 * 60, group: "pi-so" }        // Sat
  };

  var HOURS_BOARD = [
    { group: "po-st", label: "Po – Št", text: "10:00 – 23:00" },
    { group: "pi-so", label: "Pi – So", text: "10:00 – 01:00" },
    { group: "ne", label: "Ne", text: "11:00 – 22:00" }
  ];

  function isOpenNow(date) {
    var day = date.getDay();
    var minutes = date.getHours() * 60 + date.getMinutes();
    var today = HOURS[day];
    if (minutes >= today.open && minutes < Math.min(today.close, 1440)) return true;
    // wraparound from previous day closing after midnight
    var prevDay = (day + 6) % 7;
    var prev = HOURS[prevDay];
    if (prev.close > 1440) {
      var closeMinutesIntoToday = prev.close - 1440;
      if (minutes < closeMinutesIntoToday) return true;
    }
    return false;
  }

  function renderStatus() {
    var now = new Date();
    var open = isOpenNow(now);
    var dot = document.getElementById("status-dot");
    var label = document.getElementById("status-label");
    var todayHours = HOURS_BOARD.filter(function (g) { return g.group === HOURS[now.getDay()].group; })[0];
    if (dot) dot.className = "status-dot" + (open ? "" : " closed");
    if (label) {
      label.textContent = (open ? "Otvorené teraz" : "Momentálne zatvorené") +
        (todayHours ? " · dnes " + todayHours.text : "");
    }
  }

  function renderHoursBoard() {
    var board = document.getElementById("hours-board");
    if (!board) return;
    var todayGroup = HOURS[new Date().getDay()].group;
    board.innerHTML = "";
    HOURS_BOARD.forEach(function (row) {
      var div = document.createElement("div");
      div.className = "hours-row" + (row.group === todayGroup ? " today" : "");
      div.innerHTML = "<span>" + row.label + "</span><span>" + row.text + "</span>";
      board.appendChild(div);
    });
  }

  // ---- Menu ------------------------------------------------------------
  function formatPrice(value) {
    var n = Number(value);
    return n.toFixed(2).replace(".", ",") + " €";
  }

  function cardTemplate(item) {
    var badges = "";
    if (item.meat_options) {
      item.meat_options.split("/").forEach(function (m) {
        badges += '<span class="badge">' + m.trim() + "</span>";
      });
    }
    var placeholderTag = item.is_placeholder
      ? '<span class="placeholder-tag">Foto skoro tu</span>'
      : "";
    return (
      '<article class="card">' +
        '<div class="card-media">' +
          '<img src="' + item.image_url + '" alt="' + item.name + '" loading="lazy">' +
          placeholderTag +
          '<div class="stamp"><span>' + formatPrice(item.price).replace(" €", "") + "</span><small>EUR</small></div>" +
        "</div>" +
        '<div class="card-body">' +
          "<h3>" + item.name + "</h3>" +
          (badges ? '<div class="meat-badges">' + badges + "</div>" : "") +
          '<p class="desc">' + item.description + "</p>" +
        "</div>" +
      "</article>"
    );
  }

  function renderMenu(items) {
    var grid = document.getElementById("menu-grid");
    if (!grid) return;
    var sorted = items.slice().sort(function (a, b) {
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
    grid.innerHTML = sorted.map(cardTemplate).join("");
  }

  function loadMenu() {
    fetch("/.netlify/functions/get-menu")
      .then(function (res) {
        if (!res.ok) throw new Error("backend not ready");
        return res.json();
      })
      .then(function (data) {
        renderMenu(data.items || []);
      })
      .catch(function () {
        // Backend not deployed yet (or offline) — show local fallback data
        renderMenu(window.PAN_KEBAB_FALLBACK_MENU || []);
      });
  }

  function trackVisit() {
    // Silent, fire-and-forget — never blocks rendering, never surfaces errors.
    // Only called from the public site (never from /admin), so admin's own
    // visits never inflate the count.
    fetch("/.netlify/functions/track-visit", { method: "POST" }).catch(function () {});
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderHoursBoard();
    renderStatus();
    loadMenu();
    trackVisit();
    setInterval(renderStatus, 60000);

    var year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();
  });
})();
