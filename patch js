// patch.js — متغیرها و توابع گمشده برای Brand Autocomplete
// این فایل باید بعد از brands-db.js و قبل از اسکریپت اصلی لود بشه

// ========== متغیرهای سراسری ==========
var BRAND_LIST = ['سامسونگ', 'اپل', 'شیائومی', 'هواوی', 'آنر', 'نوکیا', 'ال جی', 'سایر'];

var BRAND_EMOJIS = {
  'سامسونگ': '🌌',
  'اپل': '🍏',
  'شیائومی': '🟠',
  'هواوی': '🌸',
  'آنر': '⭐',
  'نوکیا': '📞',
  'ال جی': '📺',
  'سایر': '📱'
};

var LEARNED_MODELS_KEY = 'db_learned_models_v1';
var _learnedModels = null;
var currentDevBrand = '';
var currentEqBrand = '';
var _modelSuggestionIndex = -1;

// ========== توابع یادگیری ==========
function loadLearnedModels() {
  if (_learnedModels) return _learnedModels;
  try {
    var raw = localStorage.getItem(LEARNED_MODELS_KEY);
    _learnedModels = raw ? JSON.parse(raw) : {};
  } catch (e) {
    _learnedModels = {};
  }
  return _learnedModels;
}

function saveLearnedModels() {
  try {
    localStorage.setItem(LEARNED_MODELS_KEY, JSON.stringify(_learnedModels || {}));
  } catch (e) {
    console.warn('خطا در ذخیره مدل‌های یادگرفته', e);
  }
}

function learnBrandModel(brand, model) {
  if (!brand || !model) return false;
  var m = String(model).trim();
  if (!m || m.length < 2) return false;

  loadLearnedModels();
  if (!_learnedModels[brand]) _learnedModels[brand] = {};

  var now = Date.now();
  // چک کن که آیا مدل قبلاً هست یا نه (case-insensitive)
  var exists = Object.keys(_learnedModels[brand]).some(function(k) {
    return k.toLowerCase() === m.toLowerCase();
  });

  if (exists) {
    // فقط تاریخ آخرین استفاده رو آپدیت کن
    Object.keys(_learnedModels[brand]).forEach(function(k) {
      if (k.toLowerCase() === m.toLowerCase()) {
        _learnedModels[brand][k] = now;
      }
    });
    saveLearnedModels();
    return false;
  }

  // اضافه کردن مدل جدید
  _learnedModels[brand][m] = now;
  saveLearnedModels();
  return true;
}

// پاکسازی مدل‌هایی که ۳۶۵ روز استفاده نشدن
function cleanupLearnedModels() {
  loadLearnedModels();
  var cutoff = Date.now() - (365 * 24 * 60 * 60 * 1000);
  var changed = false;
  Object.keys(_learnedModels).forEach(function(brand) {
    Object.keys(_learnedModels[brand]).forEach(function(model) {
      if (_learnedModels[brand][model] < cutoff) {
        delete _learnedModels[brand][model];
        changed = true;
      }
    });
    if (Object.keys(_learnedModels[brand]).length === 0) {
      delete _learnedModels[brand];
    }
  });
  if (changed) saveLearnedModels();
}

// گرفتن مدل‌های یادگرفته یک برند (مرتب‌شده بر اساس آخرین استفاده)
function getLearnedModelsForBrand(brand) {
  loadLearnedModels();
  if (!_learnedModels[brand]) return [];
  return Object.keys(_learnedModels[brand])
    .map(function(m) { return { model: m, ts: _learnedModels[brand][m] }; })
    .sort(function(a, b) { return b.ts - a.ts; })
    .map(function(x) { return x.model; });
}

// ========== توابع Brand Chip ==========
function selectDevBrand(brand) {
  currentDevBrand = brand;
  var input = document.getElementById('deviceBrand') || document.getElementById('devBrand');
  if (input) input.value = brand;
  document.querySelectorAll('[data-dev-brand]').forEach(function(el) {
    el.classList.toggle('active', el.getAttribute('data-dev-brand') === brand);
  });
  if (typeof renderBrandChips === 'function') renderBrandChips();
  if (typeof setupModelAutocomplete === 'function') setupModelAutocomplete('dev');
}

function selectEqBrand(brand) {
  currentEqBrand = brand;
  var input = document.getElementById('eqBrand');
  if (input) input.value = brand;
  document.querySelectorAll('[data-eq-brand]').forEach(function(el) {
    el.classList.toggle('active', el.getAttribute('data-eq-brand') === brand);
  });
  if (typeof renderBrandChips === 'function') renderBrandChips();
  if (typeof setupModelAutocomplete === 'function') setupModelAutocomplete('eq');
}

function renderBrandChips() {
  var containers = document.querySelectorAll('.brand-chips-container');
  if (!containers.length) return;
  containers.forEach(function(container) {
    var mode = container.getAttribute('data-mode') || 'dev';
    var current = mode === 'eq' ? currentEqBrand : currentDevBrand;
    container.innerHTML = BRAND_LIST.map(function(brand) {
      var emoji = BRAND_EMOJIS[brand] || '📱';
      var active = brand === current ? ' active' : '';
      return '<button type="button" class="brand-chip' + active + '" ' +
             'data-' + (mode === 'eq' ? 'eq' : 'dev') + '-brand="' + brand + '" ' +
             'onclick="' + (mode === 'eq' ? 'selectEqBrand' : 'selectDevBrand') + '(\'' + brand + '\')">' +
             emoji + ' ' + brand + '</button>';
    }).join('');
  });
}

function renderLearnedModels() {
  var container = document.getElementById('learnedModelsList');
  if (!container) return;
  loadLearnedModels();
  var brands = Object.keys(_learnedModels);
  if (!brands.length) {
    container.innerHTML = '<p style="opacity:.6;text-align:center;padding:1rem">هنوز مدلی یاد گرفته نشده</p>';
    return;
  }
  var html = '';
  brands.forEach(function(brand) {
    var models = getLearnedModelsForBrand(brand);
    if (!models.length) return;
    html += '<div style="margin-bottom:1rem">';
    html += '<div style="font-weight:bold;margin-bottom:.5rem">' + (BRAND_EMOJIS[brand] || '📱') + ' ' + brand + '</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:.4rem">';
    models.forEach(function(m) {
      html += '<span class="learned-model-chip">⭐ ' + m + '</span>';
    });
    html += '</div></div>';
  });
  container.innerHTML = html;
}

// ========== Autocomplete مدل ==========
function setupModelAutocomplete(mode) {
  var inputId = mode === 'eq' ? 'eqModel' : 'deviceModel';
  var input = document.getElementById(inputId);
  if (!input) return;

  // اگر قبلاً راه‌اندازی شده، دوباره وصل نکن
  if (input._acSetup) return;
  input._acSetup = true;

  var wrap = document.createElement('div');
  wrap.className = 'ac-suggestions';
  wrap.style.cssText = 'position:absolute;background:#fff;border:1px solid #ccc;border-radius:8px;max-height:220px;overflow-y:auto;z-index:9999;display:none;min-width:200px;box-shadow:0 4px 12px rgba(0,0,0,.15)';
  input.parentNode.style.position = 'relative';
  input.parentNode.appendChild(wrap);

  function hide() { wrap.style.display = 'none'; _modelSuggestionIndex = -1; }

  function show(items) {
    if (!items.length) { hide(); return; }
    wrap.innerHTML = items.map(function(it, i) {
      var isLearned = it.learned;
      var style = 'padding:.6rem .8rem;cursor:pointer;border-bottom:1px solid #eee;' +
                  (isLearned ? 'background:#fffbe6;font-weight:bold;' : '');
      var prefix = isLearned ? '⭐ ' : '';
      return '<div data-idx="' + i + '" style="' + style + '">' + prefix + it.model + '</div>';
    }).join('');
    wrap.style.display = 'block';
    wrap.querySelectorAll('[data-idx]').forEach(function(el) {
      el.addEventListener('click', function() {
        var idx = parseInt(el.getAttribute('data-idx'), 10);
        input.value = items[idx].model;
        hide();
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
  }

  input.addEventListener('input', function() {
    var q = input.value.trim();
    var brand = mode === 'eq' ? currentEqBrand : currentDevBrand;
    if (!brand || !q) { hide(); return; }
    var learned = getLearnedModelsForBrand(brand).filter(function(m) {
      return m.toLowerCase().indexOf(q.toLowerCase()) !== -1;
    }).map(function(m) { return { model: m, learned: true }; });
    var all = (window.searchBrandModels ? window.searchBrandModels(brand, q) : []).filter(function(m) {
      return !learned.some(function(l) { return l.model.toLowerCase() === m.toLowerCase(); });
    }).map(function(m) { return { model: m, learned: false }; });
    show(learned.concat(all).slice(0, 15));
  });

  input.addEventListener('blur', function() {
    setTimeout(hide, 200);
  });
}

// ========== راه‌اندازی ==========
document.addEventListener('DOMContentLoaded', function() {
  // پاکسازی مدل‌های قدیمی
  cleanupLearnedModels();

  // بارگذاری چیپ‌های برند
  setTimeout(function() {
    if (typeof renderBrandChips === 'function') renderBrandChips();
    setupModelAutocomplete('dev');
    setupModelAutocomplete('eq');
    renderLearnedModels();
  }, 500);
});

// استایل‌های کوچک برای chip ها
(function() {
  var style = document.createElement('style');
  style.textContent = `
    .brand-chip { padding:.4rem .8rem; margin:.2rem; border:1px solid #ccc; border-radius:16px; background:#fff; cursor:pointer; font-family:inherit; font-size:.9rem; }
    .brand-chip.active { background:#0d6efd; color:#fff; border-color:#0d6efd; }
    .learned-model-chip { padding:.3rem .7rem; border-radius:12px; background:#fffbe6; border:1px solid #f0c040; font-size:.85rem; }
  `;
  document.head.appendChild(style);
})();

console.log('✅ patch.js بارگذاری شد');
