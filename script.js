document.addEventListener('DOMContentLoaded', function () {

  /* ===================== 主分頁切換 ===================== */
  var mainTabs = document.querySelectorAll('.main-tab');
  var mainPanes = document.querySelectorAll('.main-pane');

  mainTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = tab.getAttribute('data-main');
      mainTabs.forEach(function (t) { t.classList.remove('active'); });
      mainPanes.forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById(target).classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  /* ===================== 每日行程分頁切換 ===================== */
  var pills = document.querySelectorAll('.day-pill');
  var panes = document.querySelectorAll('.day-pane');

  function activateDay(dayId) {
    pills.forEach(function (p) { p.classList.remove('active'); });
    panes.forEach(function (p) { p.classList.remove('active'); });
    var pill = document.querySelector('.day-pill[data-day="' + dayId + '"]');
    var pane = document.getElementById(dayId);
    if (pill) pill.classList.add('active');
    if (pane) pane.classList.add('active');
  }

  pills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      var target = pill.getAttribute('data-day');
      activateDay(target);
      pill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      var daynav = document.getElementById('daynav');
      if (daynav) window.scrollTo({ top: daynav.offsetTop, behavior: 'smooth' });
    });
  });

  /* ===================== 今天自動定位 ===================== */
  (function jumpToToday() {
    var dayDates = {
      d1: '2026-08-13', d2: '2026-08-14', d3: '2026-08-15', d4: '2026-08-16',
      d5: '2026-08-17', d6: '2026-08-18', d7: '2026-08-19', d8: '2026-08-20'
    };
    var todayStr = new Date().toISOString().slice(0, 10);
    var todayDayId = null;

    Object.keys(dayDates).forEach(function (id) {
      if (dayDates[id] === todayStr) todayDayId = id;
    });

    if (todayDayId) {
      var pill = document.querySelector('.day-pill[data-day="' + todayDayId + '"]');
      if (pill) pill.classList.add('is-today');
      activateDay(todayDayId);
      // 預設停在「每日行程」分頁，並切到今天卡片
      var itineraryTab = document.querySelector('.main-tab[data-main="itinerary"]');
      if (itineraryTab) {
        document.querySelectorAll('.main-tab').forEach(function (t) { t.classList.remove('active'); });
        document.querySelectorAll('.main-pane').forEach(function (p) { p.classList.remove('active'); });
        itineraryTab.classList.add('active');
        document.getElementById('itinerary').classList.add('active');
      }
    }
  })();

  /* ===================== 子分頁切換（依各自的 .subtabs 群組獨立運作） ===================== */
  document.querySelectorAll('.subtabs').forEach(function (group) {
    var groupTabs = group.querySelectorAll('.sub-tab');
    groupTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = tab.getAttribute('data-sub');
        groupTabs.forEach(function (t) { t.classList.remove('active'); });
        // 只切換屬於同一組的 sub-pane：用「這個 tab 群組管轄的所有 target id」判斷
        groupTabs.forEach(function (t) {
          var pane = document.getElementById(t.getAttribute('data-sub'));
          if (pane) pane.classList.remove('active');
        });
        tab.classList.add('active');
        var targetPane = document.getElementById(target);
        if (targetPane) targetPane.classList.add('active');
      });
    });
  });

  /* ===================== 每日行程：自動產生 Outline ===================== */
  (function buildDayOutlines() {
    document.querySelectorAll('.day-pane').forEach(function (pane) {
      var timeline = pane.querySelector('.timeline');
      if (!timeline) return;
      var events = timeline.querySelectorAll('.event');
      if (events.length === 0) return;

      var listItems = [];
      events.forEach(function (evt, idx) {
        var timeEl = evt.querySelector('.event-time');
        var titleEl = evt.querySelector('.event-body h3');
        if (!titleEl) return;
        if (!evt.id) evt.id = pane.id + '-stop-' + (idx + 1);
        var timeText = timeEl ? timeEl.textContent.trim() : '';
        var titleText = titleEl.childNodes[0] ? titleEl.childNodes[0].textContent.trim() : titleEl.textContent.trim();
        var isMedical = evt.classList.contains('medical-event');
        listItems.push(
          '<li><a class="day-outline-link' + (isMedical ? ' is-medical' : '') + '" href="#' + evt.id + '">' +
            '<span class="day-outline-time">' + timeText + '</span>' +
            '<span class="day-outline-name">' + titleText + '</span>' +
          '</a></li>'
        );
      });

      if (listItems.length === 0) return;

      var outline = document.createElement('div');
      outline.className = 'day-outline';
      outline.innerHTML =
        '<p class="day-outline-title">今日行程 Outline</p>' +
        '<ul class="day-outline-list">' + listItems.join('') + '</ul>';

      var insertBefore = pane.querySelector('.klook-tag, .alert-box, .timeline');
      insertBefore.parentNode.insertBefore(outline, insertBefore);

      outline.querySelectorAll('.day-outline-link').forEach(function (link) {
        link.addEventListener('click', function (e) {
          e.preventDefault();
          var targetEl = document.getElementById(link.getAttribute('href').slice(1));
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
    });
  })();

  /* ===================== 天氣資訊（Open-Meteo，免金鑰） ===================== */
  // 釜山座標
  var BUSAN_LAT = 35.1796;
  var BUSAN_LON = 129.0756;

  function weatherCodeToText(code) {
    var map = {
      0: ['☀️', '晴朗'], 1: ['🌤️', '晴時多雲'], 2: ['⛅', '多雲'], 3: ['☁️', '陰天'],
      45: ['🌫️', '有霧'], 48: ['🌫️', '有霧'],
      51: ['🌦️', '小毛雨'], 53: ['🌦️', '毛雨'], 55: ['🌧️', '大毛雨'],
      61: ['🌦️', '小雨'], 63: ['🌧️', '中雨'], 65: ['🌧️', '大雨'],
      80: ['🌦️', '陣雨'], 81: ['🌧️', '強陣雨'], 82: ['⛈️', '暴雨'],
      95: ['⛈️', '雷雨'], 96: ['⛈️', '雷雨冰雹'], 99: ['⛈️', '強烈雷雨']
    };
    return map[code] || ['🌤️', '天氣多變'];
  }

  function loadWeather() {
    var boxes = document.querySelectorAll('.weather-box');
    if (boxes.length === 0) return;

    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + BUSAN_LAT +
      '&longitude=' + BUSAN_LON +
      '&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Asia%2FSeoul' +
      '&start_date=2026-08-13&end_date=2026-08-20';

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('weather fetch failed');
        return res.json();
      })
      .then(function (data) {
        var dates = data.daily.time;
        var codes = data.daily.weathercode;
        var max = data.daily.temperature_2m_max;
        var min = data.daily.temperature_2m_min;

        boxes.forEach(function (box) {
          var d = box.getAttribute('data-date');
          var idx = dates.indexOf(d);
          if (idx === -1) {
            box.innerHTML = '<span class="weather-icon">🌤️</span><span>釜山 8 月平均 25–33°C，天氣預報要再接近出發日才查得到喔</span>';
            return;
          }
          var wc = weatherCodeToText(codes[idx]);
          box.innerHTML = '<span class="weather-icon">' + wc[0] + '</span><span>' + wc[1] +
            '　最高 ' + Math.round(max[idx]) + '°C／最低 ' + Math.round(min[idx]) + '°C</span>';
        });
      })
      .catch(function () {
        boxes.forEach(function (box) {
          box.innerHTML = '<span class="weather-icon">🌤️</span><span>釜山 8 月平均氣溫約 25–33°C，記得帶防曬與雨具（天氣預報暫時讀取不到，可能要連網才查得到）</span>';
        });
      });
  }
  loadWeather();

  /* ===================== 匯率：自動抓取（共用邏輯） ===================== */
  var RATE_KEY = 'busanTripRate';
  var RATE_MANUAL_KEY = 'busanTripRateIsManual';
  var RATE_FETCHED_AT_KEY = 'busanTripRateFetchedAt';
  var DEFAULT_RATE = 0.0238;
  var rateListeners = [];

  function getStoredRate() {
    var saved = localStorage.getItem(RATE_KEY);
    return saved ? parseFloat(saved) : DEFAULT_RATE;
  }

  function setStoredRate(rate, opts) {
    opts = opts || {};
    localStorage.setItem(RATE_KEY, rate);
    if (opts.manual) {
      localStorage.setItem(RATE_MANUAL_KEY, '1');
    }
    if (opts.fetchedAt) {
      localStorage.setItem(RATE_FETCHED_AT_KEY, opts.fetchedAt);
    }
    rateListeners.forEach(function (fn) { fn(rate); });
  }

  function isManualRate() {
    return localStorage.getItem(RATE_MANUAL_KEY) === '1';
  }

  // 用 Frankfurter（免費、免金鑰的中央銀行匯率資料）抓 KRW → TWD
  function fetchTodayRate(force) {
    return new Promise(function (resolve, reject) {
      if (!force && isManualRate()) {
        // 使用者手動改過匯率，且這次不是強制重新抓取，就不要覆蓋
        reject({ skipped: true });
        return;
      }
      fetch('https://api.frankfurter.app/latest?from=KRW&to=TWD')
        .then(function (res) {
          if (!res.ok) throw new Error('rate fetch failed');
          return res.json();
        })
        .then(function (data) {
          var rate = data && data.rates && data.rates.TWD;
          if (!rate || isNaN(rate)) throw new Error('invalid rate');
          var fetchedAt = data.date || new Date().toISOString().slice(0, 10);
          localStorage.removeItem(RATE_MANUAL_KEY); // 自動抓到的不算手動
          setStoredRate(rate, { fetchedAt: fetchedAt });
          resolve({ rate: rate, date: fetchedAt });
        })
        .catch(function (err) { reject(err); });
    });
  }

  /* ===================== 匯率換算小工具（浮動） ===================== */
  (function setupRateWidget() {
    var toggleBtn = document.getElementById('rateWidgetToggle');
    var widget = document.getElementById('rateWidget');
    var closeBtn = document.getElementById('rateWidgetClose');
    var quickKRW = document.getElementById('quickKRW');
    var quickTWD = document.getElementById('quickTWD');
    if (!toggleBtn || !widget) return;

    function updateQuickResult() {
      var krw = Number(quickKRW.value) || 0;
      var twd = Math.round(krw * getStoredRate());
      quickTWD.textContent = 'NT$' + twd.toLocaleString('zh-Hant-TW');
    }

    toggleBtn.addEventListener('click', function () {
      widget.classList.toggle('hidden');
      if (!widget.classList.contains('hidden')) quickKRW.focus();
    });
    closeBtn.addEventListener('click', function () {
      widget.classList.add('hidden');
    });
    quickKRW.addEventListener('input', updateQuickResult);
    rateListeners.push(updateQuickResult);
    updateQuickResult();
  })();

  /* ===================== 回到頂端 ===================== */
  (function setupBackToTop() {
    var btn = document.getElementById('backToTop');
    if (!btn) return;
    window.addEventListener('scroll', function () {
      if (window.scrollY > 500) {
        btn.classList.remove('hidden');
      } else {
        btn.classList.add('hidden');
      }
    });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  })();

  /* ===================== 記帳本 ===================== */
  var STORAGE_KEY = 'busanTripExpenses';

  var rateInput = document.getElementById('exchangeRate');
  var rateStatus = document.getElementById('rateStatus');
  var refreshRateBtn = document.getElementById('refreshRateBtn');
  var form = document.getElementById('expenseForm');
  var dateInput = document.getElementById('expDate');
  var itemInput = document.getElementById('expItem');
  var qtyInput = document.getElementById('expQty');
  var categoryInput = document.getElementById('expCategory');
  var amountInput = document.getElementById('expAmount');
  var methodInput = document.getElementById('expMethod');
  var methodOtherRow = document.getElementById('expMethodOtherRow');
  var methodOtherInput = document.getElementById('expMethodOther');
  var paymentInfoInput = document.getElementById('expPaymentInfo');
  var paymentInfoOtherRow = document.getElementById('expPaymentInfoOtherRow');
  var paymentInfoOtherInput = document.getElementById('expPaymentInfoOther');
  var noteInput = document.getElementById('expNote');
  var payerInput = document.getElementById('expPayer');
  var payerToggle = document.getElementById('payerToggle');
  var submitBtn = document.getElementById('submitExpenseBtn');
  var syncStatusEl = document.getElementById('syncStatus');
  var listEl = document.getElementById('expenseList');
  var editingId = null; // 目前正在編輯的花費 id，null 代表是新增模式

  function toggleOtherRow(selectEl, rowEl) {
    if (!selectEl || !rowEl) return;
    rowEl.style.display = selectEl.value === '其他' ? '' : 'none';
  }
  if (methodInput) {
    toggleOtherRow(methodInput, methodOtherRow);
    methodInput.addEventListener('change', function () { toggleOtherRow(methodInput, methodOtherRow); });
  }
  if (paymentInfoInput) {
    toggleOtherRow(paymentInfoInput, paymentInfoOtherRow);
    paymentInfoInput.addEventListener('change', function () { toggleOtherRow(paymentInfoInput, paymentInfoOtherRow); });
  }
  var totalKRWEl = document.getElementById('totalKRW');
  var totalTWDEl = document.getElementById('totalTWD');
  var payerSummaryEl = document.getElementById('payerSummary');
  var categorySummaryEl = document.getElementById('categorySummary');
  var clearBtn = document.getElementById('clearAllBtn');
  var exportBtn = document.getElementById('exportBtn');
  var exportStatus = document.getElementById('exportStatus');

  var CATEGORY_EMOJI = {
    '餐飲': '🍽️', '購物': '🛍️', '交通': '🚕', '門票': '🎫', '住宿': '🏨', '其他': '📦'
  };

  /* ===================== 付款人切換（乃勻／惠祺） ===================== */
  if (payerToggle && payerInput) {
    payerToggle.querySelectorAll('.payer-toggle-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        payerToggle.querySelectorAll('.payer-toggle-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        payerInput.value = btn.getAttribute('data-payer');
      });
    });
  }

  /* ===================== Google 試算表同步 =====================
     部署方式：
     1. 開啟旅費記帳本試算表 → 擴充功能 → Apps Script
     2. 貼上 apps-script.gs 的內容（隨這個網站一起附上），儲存
     3. 部署 → 新增部署 → 類型選「網頁應用程式」，「誰可以存取」選「所有人」
     4. 複製產生的網頁應用程式網址，貼到下面 GAS_WEBAPP_URL
     部署完成前，記帳功能仍會照常把資料存在手機瀏覽器裡，只是不會同步到試算表。
  ============================================================= */
  var GAS_WEBAPP_URL = ''; // ← 部署 Apps Script 網頁應用程式後，把網址貼在這裡的引號中間

  function syncExpenseToSheet(exp) {
    if (!GAS_WEBAPP_URL) {
      return Promise.resolve({ skipped: true });
    }
    var payload = {
      sheet: exp.payer, // 分頁名稱：乃勻 或 惠祺
      日期: exp.date,
      分類: exp.category,
      品項: exp.item,
      數目: exp.qty,
      '價錢(韓元)': exp.amount,
      付款方式: exp.method,
      付款資訊: exp.paymentInfo,
      備註: exp.note
    };
    return fetch(GAS_WEBAPP_URL, {
      method: 'POST',
      mode: 'no-cors', // Apps Script 網頁應用程式的回應無法被讀取，但送出仍會成功寫入試算表
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).then(function () {
      return { ok: true };
    }).catch(function (err) {
      return { ok: false, error: err };
    });
  }

  function formatFetchedTime() {
    var d = localStorage.getItem(RATE_FETCHED_AT_KEY);
    return d ? d : '';
  }

  function refreshRateStatusText(state, extra) {
    if (!rateStatus) return;
    rateStatus.classList.remove('is-error');
    if (state === 'loading') {
      rateStatus.textContent = '正在抓取今天的匯率…';
    } else if (state === 'success') {
      rateStatus.textContent = '✅ 已自動抓取 ' + (extra || formatFetchedTime()) + ' 的即時匯率';
    } else if (state === 'manual') {
      rateStatus.textContent = '✏️ 目前使用你手動輸入的匯率';
    } else if (state === 'error') {
      rateStatus.classList.add('is-error');
      rateStatus.textContent = '⚠️ 暫時抓不到匯率（可能沒有網路），先用上次的數字，你也可以手動輸入';
    }
  }

  if (form && rateInput) {
    // 畫面先顯示目前已知的匯率（上次抓到的或預設值）
    rateInput.value = getStoredRate();
    refreshRateStatusText(isManualRate() ? 'manual' : 'loading');

    // 開啟記帳本時自動嘗試抓一次最新匯率
    fetchTodayRate(false).then(function (result) {
      rateInput.value = result.rate;
      refreshRateStatusText('success', result.date);
      renderExpenses();
    }).catch(function (err) {
      if (err && err.skipped) {
        refreshRateStatusText('manual');
      } else {
        refreshRateStatusText('error');
      }
    });

    rateListeners.push(function (rate) {
      rateInput.value = rate;
      renderExpenses();
    });

    // 使用者手動輸入時，記下「這是手動值」，之後自動抓取就不會覆蓋它
    rateInput.addEventListener('input', function () {
      setStoredRate(rateInput.value, { manual: true });
      refreshRateStatusText('manual');
      renderExpenses();
    });

    if (refreshRateBtn) {
      refreshRateBtn.addEventListener('click', function () {
        refreshRateBtn.disabled = true;
        refreshRateStatusText('loading');
        fetchTodayRate(true).then(function (result) {
          rateInput.value = result.rate;
          refreshRateStatusText('success', result.date);
          renderExpenses();
        }).catch(function () {
          refreshRateStatusText('error');
        }).finally(function () {
          refreshRateBtn.disabled = false;
        });
      });
    }

    // 預設日期為今天，若超出旅程範圍則設為出發日
    var todayStr = new Date().toISOString().slice(0, 10);
    dateInput.value = (todayStr >= '2026-08-13' && todayStr <= '2026-08-20') ? todayStr : '2026-08-13';

    function getExpenses() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    }

    function saveExpenses(list) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }

    function formatNumber(n) {
      return n.toLocaleString('zh-Hant-TW');
    }

    function renderExpenses() {
      var expenses = getExpenses();
      var rate = parseFloat(rateInput.value) || 0;

      if (expenses.length === 0) {
        listEl.innerHTML = '<p class="empty-state">還沒有任何花費紀錄，新增第一筆吧！</p>';
      } else {
        var sorted = expenses.slice().sort(function (a, b) {
          return (b.date || '').localeCompare(a.date || '') || (b.id - a.id);
        });

        listEl.innerHTML = sorted.map(function (exp) {
          var dateLabel = exp.date ? exp.date.slice(5).replace('-', '/') : '';
          var catEmoji = CATEGORY_EMOJI[exp.category] || '📦';
          var qtyLabel = (exp.qty && exp.qty !== 1) ? ('　x' + exp.qty) : '';
          var metaParts = [dateLabel, escapeHtml(exp.category || '其他'), escapeHtml(exp.method || '')];
          if (exp.paymentInfo) metaParts.push(escapeHtml(exp.paymentInfo));
          metaParts.push(escapeHtml(exp.payer) + ' 付款');
          var metaLine = metaParts.filter(Boolean).join('　');
          var noteLine = exp.note ? '<p class="expense-item-meta">📝 ' + escapeHtml(exp.note) + '</p>' : '';
          return '<div class="expense-item">' +
            '<div class="expense-info">' +
              '<p class="expense-item-name">' + catEmoji + ' ' + escapeHtml(exp.item) + qtyLabel + '</p>' +
              '<p class="expense-item-meta">' + metaLine + '</p>' +
              noteLine +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:6px;">' +
              '<span class="expense-item-amount">₩' + formatNumber(exp.amount) + '</span>' +
              '<button class="delete-btn edit-btn" data-id="' + exp.id + '" aria-label="編輯這筆">✏️</button>' +
              '<button class="delete-btn" data-id="' + exp.id + '" aria-label="刪除這筆">🗑️</button>' +
            '</div>' +
          '</div>';
        }).join('');
      }

      var totalKRW = expenses.reduce(function (sum, e) { return sum + (Number(e.amount) || 0); }, 0);
      var totalTWD = totalKRW * rate;

      totalKRWEl.textContent = '₩' + formatNumber(totalKRW);
      totalTWDEl.textContent = 'NT$' + formatNumber(Math.round(totalTWD));

      var payerTotals = {};
      expenses.forEach(function (e) {
        var p = e.payer || '未指定';
        payerTotals[p] = (payerTotals[p] || 0) + (Number(e.amount) || 0);
      });

      var payerKeys = Object.keys(payerTotals);
      if (payerKeys.length === 0) {
        payerSummaryEl.innerHTML = '';
      } else {
        payerSummaryEl.innerHTML = payerKeys.map(function (p) {
          var krw = payerTotals[p];
          var twd = Math.round(krw * rate);
          return '<div class="payer-row"><span><strong>' + escapeHtml(p) + '</strong> 付了多少</span>' +
            '<span>₩' + formatNumber(krw) + '（約 NT$' + formatNumber(twd) + '）</span></div>';
        }).join('');
      }

      var categoryTotals = {};
      expenses.forEach(function (e) {
        var c = e.category || '其他';
        categoryTotals[c] = (categoryTotals[c] || 0) + (Number(e.amount) || 0);
      });

      var categoryKeys = Object.keys(categoryTotals);
      if (categoryKeys.length === 0) {
        categorySummaryEl.innerHTML = '';
      } else {
        // 依金額由大到小排序，花最多的分類排前面
        categoryKeys.sort(function (a, b) { return categoryTotals[b] - categoryTotals[a]; });
        categorySummaryEl.innerHTML = categoryKeys.map(function (c) {
          var krw = categoryTotals[c];
          var twd = Math.round(krw * rate);
          var emoji = CATEGORY_EMOJI[c] || '📦';
          return '<div class="payer-row"><span>' + emoji + ' <strong>' + escapeHtml(c) + '</strong></span>' +
            '<span>₩' + formatNumber(krw) + '（約 NT$' + formatNumber(twd) + '）</span></div>';
        }).join('');
      }

      // 重新綁定刪除按鈕
      listEl.querySelectorAll('.delete-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = Number(btn.getAttribute('data-id'));
          var updated = getExpenses().filter(function (e) { return e.id !== id; });
          saveExpenses(updated);
          renderExpenses();
        });
      });
    }

    function readFormValues() {
      var method = methodInput.value === '其他' && methodOtherInput && methodOtherInput.value.trim()
        ? methodOtherInput.value.trim() : methodInput.value;
      var paymentInfo = paymentInfoInput.value === '其他' && paymentInfoOtherInput && paymentInfoOtherInput.value.trim()
        ? paymentInfoOtherInput.value.trim() : paymentInfoInput.value;
      return {
        date: dateInput.value,
        item: itemInput.value.trim(),
        qty: Number(qtyInput && qtyInput.value) || 1,
        category: categoryInput.value,
        amount: Number(amountInput.value) || 0,
        method: method,
        paymentInfo: paymentInfo,
        note: noteInput ? noteInput.value.trim() : '',
        payer: payerInput.value
      };
    }

    function resetForm() {
      itemInput.value = '';
      amountInput.value = '';
      if (qtyInput) qtyInput.value = '1';
      if (noteInput) noteInput.value = '';
      if (methodOtherInput) methodOtherInput.value = '';
      if (paymentInfoOtherInput) paymentInfoOtherInput.value = '';
      toggleOtherRow(methodInput, methodOtherRow);
      toggleOtherRow(paymentInfoInput, paymentInfoOtherRow);
      editingId = null;
      if (submitBtn) submitBtn.textContent = '新增這筆花費（同步到 Google 試算表）';
      var cancelBtn = document.getElementById('cancelEditBtn');
      if (cancelBtn) cancelBtn.remove();
    }

    function startEdit(exp) {
      editingId = exp.id;
      dateInput.value = exp.date || '';
      itemInput.value = exp.item || '';
      if (qtyInput) qtyInput.value = exp.qty || 1;
      categoryInput.value = exp.category || '其他';
      amountInput.value = exp.amount || '';
      var methodPreset = ['信用卡', '現金', '電子支付'].indexOf(exp.method) !== -1 ? exp.method : '其他';
      methodInput.value = methodPreset;
      if (methodPreset === '其他' && methodOtherInput) methodOtherInput.value = exp.method || '';
      toggleOtherRow(methodInput, methodOtherRow);
      var infoPreset = ['台灣PAY', 'Linepay', '街口支付', '台新玫瑰卡', '國泰CUBE卡'].indexOf(exp.paymentInfo) !== -1 ? exp.paymentInfo : '其他';
      paymentInfoInput.value = infoPreset;
      if (infoPreset === '其他' && paymentInfoOtherInput) paymentInfoOtherInput.value = exp.paymentInfo || '';
      toggleOtherRow(paymentInfoInput, paymentInfoOtherRow);
      if (noteInput) noteInput.value = exp.note || '';
      var payerBtns = payerToggle ? payerToggle.querySelectorAll('.payer-toggle-btn') : [];
      payerBtns.forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-payer') === exp.payer);
      });
      payerInput.value = exp.payer || '乃勻';

      if (submitBtn) submitBtn.textContent = '儲存修改（僅更新手機端，試算表請手動修改）';
      if (!document.getElementById('cancelEditBtn')) {
        var cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.id = 'cancelEditBtn';
        cancelBtn.className = 'clear-btn';
        cancelBtn.textContent = '取消編輯';
        cancelBtn.addEventListener('click', resetForm);
        submitBtn.insertAdjacentElement('afterend', cancelBtn);
      }
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function escapeHtml(str) {
      var div = document.createElement('div');
      div.textContent = str == null ? '' : str;
      return div.innerHTML;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var values = readFormValues();

      if (editingId !== null) {
        // 編輯模式：只更新手機本機的這筆紀錄，不會再重新同步到試算表
        // （試算表裡對應那筆資料已經寫入過了，請直接到試算表手動修改／刪除那一列）
        var expenses = getExpenses().map(function (e2) {
          return e2.id === editingId ? Object.assign({}, e2, values) : e2;
        });
        saveExpenses(expenses);
        resetForm();
        renderExpenses();
        if (syncStatusEl) {
          syncStatusEl.className = 'sync-status';
          syncStatusEl.textContent = '✏️ 已更新手機端紀錄（Google 試算表需自行手動修改對應那一列）';
          setTimeout(function () { if (syncStatusEl) syncStatusEl.textContent = ''; }, 5000);
        }
        return;
      }

      var newExpense = Object.assign({ id: Date.now() }, values);
      var expenses = getExpenses();
      expenses.push(newExpense);
      saveExpenses(expenses);
      resetForm();
      itemInput.focus();
      renderExpenses();

      if (submitBtn) submitBtn.disabled = true;
      if (syncStatusEl) {
        syncStatusEl.className = 'sync-status';
        syncStatusEl.textContent = GAS_WEBAPP_URL ? '同步到 Google 試算表中…' : '已存在手機裡（尚未連接 Google 試算表，僅本機記錄）';
      }
      syncExpenseToSheet(newExpense).then(function (result) {
        if (submitBtn) submitBtn.disabled = false;
        if (!syncStatusEl) return;
        if (result && result.skipped) {
          syncStatusEl.className = 'sync-status';
          syncStatusEl.textContent = '已存在手機裡（尚未連接 Google 試算表，僅本機記錄）';
        } else if (result && result.ok) {
          syncStatusEl.className = 'sync-status is-ok';
          syncStatusEl.textContent = '✅ 已同步到「' + newExpense.payer + '」分頁';
        } else {
          syncStatusEl.className = 'sync-status is-error';
          syncStatusEl.textContent = '⚠️ 同步失敗，但已存在手機裡，之後可以再手動補上試算表';
        }
        setTimeout(function () { if (syncStatusEl) syncStatusEl.textContent = ''; }, 4000);
      });
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (confirm('確定要清空所有記帳資料嗎？這個動作沒辦法復原喔。')) {
          localStorage.removeItem(STORAGE_KEY);
          renderExpenses();
        }
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        var expenses = getExpenses();
        if (expenses.length === 0) {
          exportStatus.textContent = '目前還沒有任何花費紀錄喔';
          setTimeout(function () { exportStatus.textContent = ''; }, 2500);
          return;
        }
        var rate = parseFloat(rateInput.value) || 0;
        var sorted = expenses.slice().sort(function (a, b) {
          return (a.date || '').localeCompare(b.date || '') || (a.id - b.id);
        });

        var lines = ['🌊 釜山旅行記帳明細', ''];
        sorted.forEach(function (exp) {
          var dateLabel = exp.date ? exp.date.slice(5).replace('-', '/') : '';
          lines.push(dateLabel + '｜' + (exp.category || '其他') + '｜' + exp.item +
            '｜₩' + Number(exp.amount).toLocaleString('zh-Hant-TW') +
            '｜' + exp.method + '｜' + exp.payer + '付');
        });

        var totalKRW = expenses.reduce(function (sum, e) { return sum + (Number(e.amount) || 0); }, 0);
        lines.push('');
        lines.push('總計：₩' + totalKRW.toLocaleString('zh-Hant-TW') + '（約 NT$' + Math.round(totalKRW * rate).toLocaleString('zh-Hant-TW') + '）');

        var text = lines.join('\n');

        function showCopiedMessage() {
          exportStatus.textContent = '✅ 已複製，可以直接貼到 LINE 傳出去了';
          setTimeout(function () { exportStatus.textContent = ''; }, 3000);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(showCopiedMessage).catch(function () {
            fallbackCopy(text, showCopiedMessage);
          });
        } else {
          fallbackCopy(text, showCopiedMessage);
        }
      });
    }

    function fallbackCopy(text, onSuccess) {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand('copy');
        onSuccess();
      } catch (e) {
        exportStatus.textContent = '複製失敗，請手動截圖明細';
        setTimeout(function () { exportStatus.textContent = ''; }, 3000);
      }
      document.body.removeChild(textarea);
    }

    renderExpenses();
  }
});
