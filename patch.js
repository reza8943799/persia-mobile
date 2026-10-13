// ═══════════════════════════════════════════════════════════════
// patch.js — متغیرها، توابع Brand-Autocomplete و یادگیری خودکار
// ═══════════════════════════════════════════════════════════════

// ─── ۱. لیست برندها و ایموجی‌ها ───
var BRAND_LIST = ['سامسونگ', 'اپل', 'شیائومی', 'هواوی', 'آنر', 'نوکیا', 'ال جی', 'سایر'];
var BRAND_EMOJIS = {
  'سامسونگ': '🌌', 'اپل': '🍏', 'شیائومی': '🟠', 'هواوی': '🌸',
  'آنر': '⭐', 'نوکیا': '📞', 'ال جی': '📺', 'سایر': '📱'
};

// ─── ۲. متغیرهای یادگیری ───
var LEARNED_MODELS_KEY = 'db_learned_models_v1';
var _learnedModels = null;
var currentDevBrand = '';
var currentEqBrand = '';
var _modelSuggestionIndex = -1;

// ─── ۳. توابع یادگیری ───
function loadLearnedModels() {
  if (_learnedModels) return _learnedModels;
  try {
    var raw = localStorage.getItem(LEARNED_MODELS_KEY);
    _learnedModels = raw ? JSON.parse(raw) : {};
  } catch(e) { _learnedModels = {}; }
  return _learnedModels;
}

function saveLearnedModels() {
  try {
    localStorage.setItem(LEARNED_MODELS_KEY, JSON.stringify(_learnedModels || {}));
  } catch(e) {}
}

function learnBrandModel(brand, model) {
  if (!brand || !model || brand === 'سایر') return false;
  var m = (model || '').trim();
  if (!m) return false;

  var learned = loadLearnedModels();
  if (!learned[brand]) learned[brand] = [];

  var defaultList = (window.PHONE_BRANDS_DB && window.PHONE_BRANDS_DB[brand]) || [];
  if (defaultList.indexOf(m) !== -1) return false;

  var existing = learned[brand].find(function(x) { return x.model === m; });
  if (existing) {
    existing.lastUsed = Date.now();
    saveLearnedModels();
    return false;
  }

  learned[brand].push({ model: m, createdAt: Date.now(), lastUsed: Date.now() });
  saveLearnedModels();
  return true;
}

function cleanupLearnedModels() {
  var learned = loadLearnedModels();
  var now = Date.now();
  var yearMs = 365 * 24 * 60 * 60 * 1000;
  var removed = 0;

  for (var brand in learned) {
    var before = learned[brand].length;
    learned[brand] = learned[brand].filter(function(x) {
      return (now - (x.lastUsed || x.createdAt || 0)) < yearMs;
    });
    removed += (before - learned[brand].length);
    if (learned[brand].length === 0) delete learned[brand];
  }

  if (removed > 0) {
    _learnedModels = learned;
    saveLearnedModels();
  }
  return removed;
}

// ─── ۴. جستجو در DB + learned ───
function searchBrandModels(brand, query) {
  var defaultList = (window.PHONE_BRANDS_DB && window.PHONE_BRANDS_DB[brand]) || [];
  var learnedList = (loadLearnedModels()[brand] || []).map(function(x) { return x.model; });

  var allModels = [];
  learnedList.forEach(function(m) { allModels.push({ name: m, learned: true }); });
  defaultList.forEach(function(m) {
    if (learnedList.indexOf(m) === -1) allModels.push({ name: m, learned: false });
  });

  var q = (query || '').trim().toLowerCase();
  if (!q) return allModels.slice(0, 15);

  var qCompact = q.replace(/\s+/g, '');
  return allModels.filter(function(item) {
    var mCompact = item.name.toLowerCase().replace(/\s+/g, '');
    return mCompact.indexOf(qCompact) !== -1;
  }).slice(0, 15);
}

// ─── ۵. helper نمایش نام دستگاه ───
function getDeviceDisplayName(item) {
  if (!item) return 'نامشخص';
  var brand = item.brand || '';
  var model = item.model || '';
  if (brand && brand !== 'سایر' && model) return brand + ' ' + model;
  if (model) return model;
  return 'نامشخص';
}

function getDeviceDisplayNameShort(item) {
  if (!item) return 'نامشخص';
  var model = item.model || '';
  var brand = item.brand || '';
  if (model) {
    if (brand === 'اپل' && model.indexOf('iPhone') === 0) return '🍏 ' + model;
    if (brand === 'سامسونگ' && model.indexOf('Galaxy') === 0) return '🌌 ' + model;
    if (brand && brand !== 'سایر') return BRAND_EMOJIS[brand] + ' ' + model;
    return '📱 ' + model;
  }
  return '📱 نامشخص';
}

// ─── ۶. چیپ‌های برند ───
function renderBrandChips(containerId, selectedBrand, onSelect) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  BRAND_LIST.forEach(function(brand) {
    var chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'brand-chip' + (brand === selectedBrand ? ' active' : '');
    chip.innerHTML = '<span class="brand-emoji">' + (BRAND_EMOJIS[brand] || '📱') + '</span>' + brand;
    chip.onclick = function() { onSelect(brand); };
    container.appendChild(chip);
  });
}

// ─── ۷. Autocomplete مدل ───
function setupModelAutocomplete(inputId, suggestionsId, getBrandFn) {
  var input = document.getElementById(inputId);
  var box = document.getElementById(suggestionsId);
  if (!input || !box) return;

  function showSuggestions() {
    var brand = getBrandFn();
    if (!brand) {
      box.innerHTML = '<div class="model-suggestion-empty">اول برند رو انتخاب کن 📱</div>';
      box.style.display = 'block';
      return;
    }
    if (brand === 'سایر') {
      box.style.display = 'none';
      return;
    }

    var results = searchBrandModels(brand, input.value);

    if (results.length === 0) {
      box.innerHTML = '<div class="model-suggestion-empty">مدل جدید — موقع ثبت، خودکار یاد گرفته می‌شه ✨</div>';
      box.style.display = 'block';
      return;
    }

    box.innerHTML = '';
    results.forEach(function(item) {
      var row = document.createElement('div');
      row.className = 'model-suggestion-item' + (item.learned ? ' learned' : '');
      var right = '<span>' + (typeof esc === 'function' ? esc(item.name) : item.name) + '</span>';
      var left = item.learned ? '<span class="learned-tag">⭐ یادگرفته</span>' : '';
      row.innerHTML = right + left;
      row.onclick = function() {
        input.value = item.name;
        box.style.display = 'none';
        _modelSuggestionIndex = -1;
      };
      box.appendChild(row);
    });
    box.style.display = 'block';
    _modelSuggestionIndex = -1;
  }

  input.addEventListener('focus', showSuggestions);
  input.addEventListener('input', showSuggestions);

  input.addEventListener('keydown', function(e) {
    if (box.style.display === 'none') return;
    var items = box.querySelectorAll('.model-suggestion-item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _modelSuggestionIndex = Math.min(_modelSuggestionIndex + 1, items.length - 1);
      items.forEach(function(it, idx) { it.classList.toggle('active', idx === _modelSuggestionIndex); });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _modelSuggestionIndex = Math.max(_modelSuggestionIndex - 1, -1);
      items.forEach(function(it, idx) { it.classList.toggle('active', idx === _modelSuggestionIndex); });
    } else if (e.key === 'Enter') {
      if (_modelSuggestionIndex >= 0) {
        e.preventDefault();
        items[_modelSuggestionIndex].click();
      }
    } else if (e.key === 'Escape') {
      box.style.display = 'none';
    }
  });

  document.addEventListener('click', function(e) {
    if (!input.contains(e.target) && !box.contains(e.target)) {
      box.style.display = 'none';
    }
  });
}

// ─── ۸. انتخاب برند ───
function selectDevBrand(brand) {
  currentDevBrand = brand;
  document.getElementById('dev-brand').value = brand;
  renderBrandChips('dev-brand-chips', brand, selectDevBrand);
  document.getElementById('dev-model').value = '';
  var sbox = document.getElementById('dev-model-suggestions');
  if (sbox) sbox.style.display = 'none';
  setTimeout(function() {
    try { document.getElementById('dev-model').focus(); } catch(e) {}
  }, 100);
}

function selectEqBrand(brand) {
  currentEqBrand = brand;
  document.getElementById('eq-brand').value = brand;
  renderBrandChips('eq-brand-chips', brand, selectEqBrand);
  document.getElementById('eq-model').value = '';
  var sbox = document.getElementById('eq-model-suggestions');
  if (sbox) sbox.style.display = 'none';
}

// ─── ۹. رندر مدل‌های یادگرفته در تنظیمات ───
function renderLearnedModels() {
  var container = document.getElementById('learned-models-list');
  if (!container) return;
  container.innerHTML = '';

  var learned = loadLearnedModels();
  var totalModels = 0;
  Object.keys(learned).forEach(function(b) { totalModels += learned[b].length; });

  if (totalModels === 0) {
    container.innerHTML = '<div style="text-align:center;color:#92400e;padding:20px;font-size:0.85rem;">' +
      '<div style="font-size:2rem;margin-bottom:8px;">📭</div>' +
      'هنوز مدل سفارشی نداری.' +
      '</div>';
    return;
  }

  BRAND_LIST.forEach(function(brand) {
    if (!learned[brand] || learned[brand].length === 0) return;
    var section = document.createElement('div');
    section.className = 'learned-brand-section';

    var title = document.createElement('div');
    title.className = 'learned-brand-title';
    title.innerHTML = (BRAND_EMOJIS[brand] || '📱') + ' ' + brand +
      ' <span style="background:#fef3c7;color:#92400e;padding:1px 8px;border-radius:10px;font-size:0.7rem;">' +
      learned[brand].length + ' مدل</span>';
    section.appendChild(title);

    learned[brand].sort(function(a, b) { return (b.lastUsed || 0) - (a.lastUsed || 0); }).forEach(function(item) {
      var row = document.createElement('div');
      row.className = 'learned-model-row';
      row.innerHTML = '<span>' + (typeof esc === 'function' ? esc(item.model) : item.model) + '</span>';
      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.innerHTML = '🗑 حذف';
      delBtn.onclick = function() {
        if (!confirm('مدل «' + item.model + '» حذف شود؟')) return;
        var l = loadLearnedModels();
        if (l[brand]) {
          l[brand] = l[brand].filter(function(x) { return x.model !== item.model; });
          if (l[brand].length === 0) delete l[brand];
          _learnedModels = l;
          saveLearnedModels();
        }
        renderLearnedModels();
        if (typeof showToast === 'function') showToast('✅ مدل حذف شد', 'success');
      };
      row.appendChild(delBtn);
      section.appendChild(row);
    });

    container.appendChild(section);
  });
}

// ─── ۱۰. راه‌اندازی بعد از لود DOM ───
document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('dev-brand-chips')) {
    renderBrandChips('dev-brand-chips', currentDevBrand, selectDevBrand);
  }
  if (document.getElementById('dev-model') && document.getElementById('dev-model-suggestions')) {
    setupModelAutocomplete('dev-model', 'dev-model-suggestions', function() {
      return document.getElementById('dev-brand').value || currentDevBrand;
    });
  }
  if (document.getElementById('eq-brand-chips')) {
    renderBrandChips('eq-brand-chips', '', selectEqBrand);
  }
  if (document.getElementById('eq-model') && document.getElementById('eq-model-suggestions')) {
    setupModelAutocomplete('eq-model', 'eq-model-suggestions', function() {
      return document.getElementById('eq-brand').value || currentEqBrand;
    });
  }
});

setTimeout(function() {
  try {
    var removed = cleanupLearnedModels();
    if (removed > 0) console.log('🧹 ' + removed + ' learned model(s) cleaned up');
  } catch(e) {}
}, 2500);

console.log('✅ patch.js بارگذاری شد');
