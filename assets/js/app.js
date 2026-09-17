/* ============================================================
   Семёнова Яна — лендинг
   Прайсы, галереи, лайтбокс и формы записи с отправкой в WhatsApp.
   ============================================================ */
(function () {
  'use strict';

  /* --- Настройки, которые может понадобиться поменять --- */
  var CONFIG = {
    whatsapp: '79213257631',     // номер для всех форм, только цифры
    telegram: 'dryana_semenova'  // username в Telegram, без @
  };

  var FORMS = {
    consult: {
      title: 'Запись на консультацию',
      note: 'Заполните форму — сообщение откроется в WhatsApp уже готовым, останется только нажать «Отправить».',
      prefix: 'Здравствуйте, Яна! Хочу записаться на консультацию.'
    },
    bonus: {
      title: 'Запись со скидкой для новых клиентов',
      note: 'Бонус для новых клиентов: глубокое бикини + подмышки — 1 500 ₽. Заполните форму, и сообщение откроется в WhatsApp готовым.',
      prefix: 'Здравствуйте, Яна! Я новый клиент, хочу записаться по бонусу для новых клиентов.'
    },
    order: {
      title: 'Заказ продукции',
      note: 'Отметьте нужное в «Выборе продукции» — сообщение откроется в WhatsApp уже готовым.',
      prefix: 'Здравствуйте, Яна! Хочу заказать продукцию.',
      // в заказе дата и время не нужны — вместо них список продукции
      datetime: false,
      products: true
    }
  };

  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ==========================================================
     1. ПРАЙСЫ: превращаем строки «Название — цена» в таблицу
     ========================================================== */

  // «что угодно» + разделитель + цена (с ₽ или без, с диапазоном, с «от»)
  var PRICE_RE = /^(.*?)\s*[—–\-−:]\s*((?:от\s+)?\d[\d\s.,]*(?:\s*[—–\-−]\s*\d[\d\s.,]*)?\s*₽?)$/;

  var NB = ' ';   // неразрывный пробел: цена не разорвётся на две строки

  // «16500» → «16 500»; точки и запятые в исходнике — это разряды, не дроби
  function groupDigits(raw) {
    return raw.replace(/[\s.,]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, NB);
  }

  /* Единый формат цен по всему сайту: «10 000 ₽».
     Разряды — через пробел, знак рубля — тоже через пробел.
     «16500₽», «3.000 ₽», «13000−15000₽», «от 4000 ₽», «13000» → приводятся сюда же. */
  function formatPrice(value) {
    var text = String(value).replace(/₽/g, '').trim();
    var prefix = '';

    var lead = text.match(/^(от|до)\s+/i);
    if (lead) {
      prefix = lead[1].toLowerCase() + NB;
      text = text.slice(lead[0].length);
    }

    var parts = text.split(/\s*[—–\-−]\s*/).filter(Boolean).map(groupDigits);
    if (!parts.length) { return value; }

    return prefix + parts.join('–') + NB + '₽';
  }

  function makeRow(name, value) {
    var row = document.createElement('div');
    row.className = 'price__row';

    var n = document.createElement('span');
    n.className = 'price__name';
    n.textContent = name;

    var d = document.createElement('span');
    d.className = 'price__dots';

    var v = document.createElement('span');
    v.className = 'price__val';
    v.textContent = value;

    row.appendChild(n);
    row.appendChild(d);
    row.appendChild(v);
    return row;
  }

  function makeGap() {
    var g = document.createElement('div');
    g.className = 'price__gap';
    return g;
  }

  /* Продукция из прайсов с атрибутом data-picker: её показывает окно «Выбор продукции».
     [{ title: 'Коллаген', entries: [{type:'sub'|'item', ...}] }] */
  var CATALOG = [];

  function parsePrice(el) {
    var lines = el.textContent.replace(/\r/g, '').split('\n');
    var frag = document.createDocumentFragment();
    var last = null;
    var lastEntry = null;
    var gapPending = false;
    var started = false;
    var i, line, m, name, value, row, sub;

    var acc = el.closest('.acc');
    var head = acc ? $('.acc__title', acc) : null;
    var group = { title: head ? head.textContent.trim() : '', entries: [] };

    for (i = 0; i < lines.length; i++) {
      line = lines[i].trim();

      if (!line) {
        if (started) { gapPending = true; }
        continue;
      }

      m = line.match(PRICE_RE);

      if (m) {
        name = m[1].trim();
        value = formatPrice(m[2].trim());

        // строка вида «— 6000 ₽» — это цена к предыдущей строке-заголовку
        if (!name && last && last.className === 'price__sub') {
          row = makeRow(last.textContent, value);
          frag.replaceChild(row, last);
          last = row;

          // тот же перенос в каталоге: подзаголовок превращается в позицию
          if (lastEntry && lastEntry.type === 'sub') {
            lastEntry.type = 'item';
            lastEntry.name = lastEntry.text;
            lastEntry.price = value;
            delete lastEntry.text;
          }

          gapPending = false;
          continue;
        }

        if (gapPending) { frag.appendChild(makeGap()); gapPending = false; }
        row = makeRow(name, value);
        frag.appendChild(row);
        last = row;

        lastEntry = { type: 'item', name: name, price: value };
        group.entries.push(lastEntry);
      } else {
        if (gapPending) { frag.appendChild(makeGap()); gapPending = false; }
        sub = document.createElement('div');
        sub.className = 'price__sub';
        sub.textContent = line;
        frag.appendChild(sub);
        last = sub;

        lastEntry = { type: 'sub', text: line };
        group.entries.push(lastEntry);
      }

      started = true;
    }

    el.textContent = '';
    el.appendChild(frag);
    el.classList.add('is-parsed');

    if (el.hasAttribute('data-picker') && group.title && group.entries.length) { CATALOG.push(group); }
  }

  $$('[data-price]').forEach(parsePrice);

  /* ==========================================================
     2. ГАЛЕРЕИ
     ========================================================== */

  function initGallery(gallery) {
    var track = $('[data-track]', gallery);
    var dotsWrap = $('[data-dots]', gallery);
    var slides = Array.prototype.slice.call(track.children);
    if (!slides.length) { return; }

    var dots = slides.map(function (slide, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'gallery__dot';
      b.setAttribute('aria-label', 'Фото ' + (i + 1));
      b.addEventListener('click', function () {
        track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: 'smooth' });
      });
      dotsWrap.appendChild(b);
      return b;
    });

    function current() {
      var center = track.scrollLeft + track.clientWidth / 2;
      var best = 0;
      var bestDist = Infinity;
      slides.forEach(function (s, i) {
        var c = s.offsetLeft - track.offsetLeft + s.offsetWidth / 2;
        var d = Math.abs(c - center);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      return best;
    }

    function sync() {
      var idx = current();
      dots.forEach(function (d, i) { d.classList.toggle('is-active', i === idx); });
    }

    function step(dir) {
      var idx = Math.min(slides.length - 1, Math.max(0, current() + dir));
      track.scrollTo({ left: slides[idx].offsetLeft - track.offsetLeft, behavior: 'smooth' });
    }

    $('[data-prev]', gallery).addEventListener('click', function () { step(-1); });
    $('[data-next]', gallery).addEventListener('click', function () { step(1); });

    var raf = null;
    track.addEventListener('scroll', function () {
      if (raf) { return; }
      raf = requestAnimationFrame(function () { raf = null; sync(); });
    }, { passive: true });

    window.addEventListener('resize', sync);
    sync();
  }

  $$('[data-gallery]').forEach(initGallery);

  /* ==========================================================
     3. ЛАЙТБОКС
     ========================================================== */

  var lightbox = $('#lightbox');
  var lightboxImg = $('#lightboxImg');

  function openLightbox(src, alt) {
    lightboxImg.src = src;
    lightboxImg.alt = alt || '';
    lightbox.hidden = false;
    document.body.classList.add('is-locked');
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImg.src = '';
    document.body.classList.remove('is-locked');
  }

  $$('.gallery__slide img').forEach(function (img) {
    img.addEventListener('click', function () { openLightbox(img.src, img.alt); });
  });

  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox || e.target.closest('[data-lb-close]')) { closeLightbox(); }
  });

  /* ==========================================================
     4. ФОРМА ЗАПИСИ → WHATSAPP
     ========================================================== */

  var modal = $('#modal');
  var modalTitle = $('#modalTitle');
  var modalNote = $('#modalNote');
  var form = $('#bookForm');
  var fName = $('#f-name');
  var fPhone = $('#f-phone');
  var fDate = $('#f-date');
  var fTime = $('#f-time');
  var fComment = $('#f-comment');

  var dateTimeRow = $('[data-field="datetime"]', form);
  var productsField = $('[data-field="products"]', form);
  var pickedList = $('[data-picked]', form);
  var pickBtn = $('[data-open-products]', form);

  var activePreset = FORMS.consult;
  var lastFocused = null;

  /* --- маска телефона --- */
  function formatPhone(raw) {
    var digits = raw.replace(/\D/g, '');

    if (digits[0] === '8') { digits = '7' + digits.slice(1); }
    if (digits[0] !== '7') { digits = '7' + digits; }
    digits = digits.slice(0, 11);

    var rest = digits.slice(1);
    var out = '+7';
    if (rest.length) { out += ' (' + rest.slice(0, 3); }
    if (rest.length >= 3) { out += ')'; }
    if (rest.length > 3) { out += ' ' + rest.slice(3, 6); }
    if (rest.length > 6) { out += '-' + rest.slice(6, 8); }
    if (rest.length > 8) { out += '-' + rest.slice(8, 10); }
    return out;
  }

  fPhone.addEventListener('input', function () {
    if (!fPhone.value.replace(/\D/g, '')) { fPhone.value = ''; return; }
    fPhone.value = formatPhone(fPhone.value);
  });

  fPhone.addEventListener('focus', function () {
    if (!fPhone.value) { fPhone.value = '+7 ('; }
  });

  fPhone.addEventListener('blur', function () {
    if (fPhone.value.replace(/\D/g, '').length <= 1) { fPhone.value = ''; }
  });

  /* --- валидация --- */
  function setError(input, message) {
    var field = input.closest('.field');
    var box = $('[data-error-for="' + input.name + '"]', field);
    if (message) {
      field.classList.add('has-error');
      if (box) { box.textContent = message; }
    } else {
      field.classList.remove('has-error');
      if (box) { box.textContent = ''; }
    }
    return !message;
  }

  function validate() {
    var ok = true;

    ok = setError(fName, fName.value.trim().length >= 2 ? '' : 'Напишите, пожалуйста, имя') && ok;
    ok = setError(fPhone, fPhone.value.replace(/\D/g, '').length === 11 ? '' : 'Введите телефон полностью') && ok;

    return ok;
  }

  [fName, fPhone].forEach(function (input) {
    input.addEventListener('input', function () {
      if (input.closest('.field').classList.contains('has-error')) { validate(); }
    });
  });

  /* --- сборка сообщения --- */
  function humanDate(value) {
    var parts = value.split('-');
    if (parts.length !== 3) { return value; }
    return parts[2] + '.' + parts[1] + '.' + parts[0];
  }

  function buildMessage() {
    var lines = [activePreset.prefix];

    lines.push('Имя: ' + fName.value.trim());
    lines.push('Телефон: ' + fPhone.value.trim());

    if (activePreset.datetime !== false) {
      if (fDate.value) { lines.push('Желаемая дата: ' + humanDate(fDate.value)); }
      if (fTime.value) { lines.push('Желаемое время: ' + fTime.value); }
    }

    if (activePreset.products && picked.length) {
      lines.push('');
      lines.push('Продукция:');
      picked.forEach(function (item) {
        lines.push('• ' + item.name + ' — ' + item.price);
      });
      lines.push('');
    }

    var comment = fComment.value.trim();
    if (comment) { lines.push('Комментарий: ' + comment); }

    return lines.join('\n');
  }

  function waLink(text) {
    return 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(text);
  }

  /* --- открытие / закрытие --- */
  function openModal(key) {
    activePreset = FORMS[key] || FORMS.consult;

    modalTitle.textContent = activePreset.title;
    modalNote.textContent = activePreset.note;

    // подсветку ошибок с прошлого раза не тащим
    $$('.field', form).forEach(function (f) { f.classList.remove('has-error'); });

    // в заказе продукции дата и время уступают место списку продукции
    var wantsDateTime = activePreset.datetime !== false;
    dateTimeRow.hidden = !wantsDateTime;
    productsField.hidden = !activePreset.products;
    if (!activePreset.products) { clearPicked(); }

    // дату в прошлом выбрать нельзя
    var today = new Date();
    var tzOffset = today.getTimezoneOffset() * 60000;
    fDate.min = new Date(today - tzOffset).toISOString().slice(0, 10);

    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('is-locked');

    setTimeout(function () { fName.focus(); }, 40);
  }

  function closeModal() {
    modal.hidden = true;
    $('#products').hidden = true;
    document.body.classList.remove('is-locked');
    if (lastFocused && lastFocused.focus) { lastFocused.focus(); }
  }

  $$('[data-open-form]').forEach(function (btn) {
    btn.addEventListener('click', function () { openModal(btn.getAttribute('data-open-form')); });
  });

  modal.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) { closeModal(); }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') { return; }
    if (!lightbox.hidden) { closeLightbox(); return; }
    if (!$('#products').hidden) { closeProducts(); return; }
    if (!modal.hidden) { closeModal(); }
  });

  /* --- фокус не уходит из модалки --- */
  modal.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || modal.hidden) { return; }

    var focusable = $$('button, [href], input, textarea, select', modal).filter(function (el) {
      return !el.disabled && el.offsetParent !== null;
    });
    if (!focusable.length) { return; }

    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  /* --- отправка --- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) {
      var bad = $('.field.has-error .field__input', form);
      if (bad) { bad.focus(); }
      return;
    }

    var url = waLink(buildMessage());

    // окно открываем прямо в обработчике клика, иначе его срежет блокировщик
    var win = window.open(url, '_blank', 'noopener');
    if (!win) { window.location.href = url; }

    closeModal();
    form.reset();
    clearPicked();
    $$('.field', form).forEach(function (f) { f.classList.remove('has-error'); });
  });

  /* ==========================================================
     5. ВЫБОР ПРОДУКЦИИ
     Список собирается из прайсов, отмеченное уходит в сообщение.
     ========================================================== */

  var productsModal = $('#products');
  var productsList = $('[data-products-list]', productsModal);
  var productsSearch = $('[data-products-search]', productsModal);

  var picked = [];
  var pickerBuilt = false;

  function buildPicker() {
    if (pickerBuilt) { return; }
    pickerBuilt = true;

    CATALOG.forEach(function (group, gi) {
      var box = document.createElement('div');
      box.className = 'picker__group';

      var title = document.createElement('h3');
      title.className = 'picker__group-title';
      title.textContent = group.title;
      box.appendChild(title);

      group.entries.forEach(function (entry, ei) {
        if (entry.type === 'sub') {
          var sub = document.createElement('div');
          sub.className = 'picker__sub';
          sub.setAttribute('data-sub', '');
          sub.textContent = entry.text;
          box.appendChild(sub);
          return;
        }

        var label = document.createElement('label');
        label.className = 'picker__item';
        label.setAttribute('data-search', (group.title + ' ' + entry.name).toLowerCase());

        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = gi + ':' + ei;

        var n = document.createElement('span');
        n.className = 'picker__name';
        n.textContent = entry.name;

        var p = document.createElement('span');
        p.className = 'picker__price';
        p.textContent = entry.price;

        cb.addEventListener('change', function () {
          togglePick({ key: cb.value, group: group.title, name: entry.name, price: entry.price }, cb.checked);
        });

        label.appendChild(cb);
        label.appendChild(n);
        label.appendChild(p);
        box.appendChild(label);
      });

      productsList.appendChild(box);
    });

    if (!CATALOG.length) {
      var empty = document.createElement('p');
      empty.className = 'picker__empty';
      empty.textContent = 'Список продукции пока пуст.';
      productsList.appendChild(empty);
    }
  }

  function indexOfPick(key) {
    var at = -1;
    picked.forEach(function (item, i) { if (item.key === key) { at = i; } });
    return at;
  }

  function togglePick(item, on) {
    var at = indexOfPick(item.key);

    if (on && at === -1) { picked.push(item); }
    if (!on && at !== -1) { picked.splice(at, 1); }

    syncPicked();
  }

  function syncPicked() {
    pickedList.textContent = '';

    picked.forEach(function (item) {
      var li = document.createElement('li');
      li.className = 'picked__item';

      var n = document.createElement('span');
      n.className = 'picked__name';
      n.textContent = item.name;

      var p = document.createElement('span');
      p.className = 'picked__price';
      p.textContent = item.price;

      var drop = document.createElement('button');
      drop.type = 'button';
      drop.className = 'picked__drop';
      drop.setAttribute('aria-label', 'Убрать «' + item.name + '»');
      drop.textContent = '×';
      drop.addEventListener('click', function () {
        var cb = $('input[value="' + item.key + '"]', productsList);
        if (cb) { cb.checked = false; }
        togglePick(item, false);
      });

      li.appendChild(n);
      li.appendChild(p);
      li.appendChild(drop);
      pickedList.appendChild(li);
    });

    pickedList.hidden = !picked.length;

    var count = $('.picker__btn-count', pickBtn);
    if (picked.length) {
      if (!count) {
        count = document.createElement('span');
        count.className = 'picker__btn-count';
        pickBtn.appendChild(count);
      }
      count.textContent = String(picked.length);
    } else if (count) {
      count.parentNode.removeChild(count);
    }
  }

  function clearPicked() {
    picked = [];
    $$('input[type="checkbox"]', productsList).forEach(function (cb) { cb.checked = false; });
    syncPicked();
  }

  function applyFilter() {
    var q = productsSearch.value.trim().toLowerCase();

    $$('.picker__group', productsList).forEach(function (box) {
      var shown = 0;

      $$('.picker__item', box).forEach(function (item) {
        var hit = !q || item.getAttribute('data-search').indexOf(q) !== -1;
        item.hidden = !hit;
        if (hit) { shown++; }
      });

      // при поиске подзаголовки только мешают читать результат
      $$('[data-sub]', box).forEach(function (sub) { sub.hidden = !!q; });

      box.hidden = !shown;
    });
  }

  function openProducts() {
    buildPicker();
    productsModal.hidden = false;
    setTimeout(function () { productsSearch.focus(); }, 40);
  }

  function closeProducts() {
    productsModal.hidden = true;
    pickBtn.focus();
  }

  pickBtn.addEventListener('click', openProducts);
  productsSearch.addEventListener('input', applyFilter);

  productsModal.addEventListener('click', function (e) {
    if (e.target.closest('[data-products-close]') || e.target.closest('[data-products-done]')) {
      closeProducts();
    }
  });

  /* ==========================================================
     6. Telegram: пока username не задан — ведём на общий поиск
     ========================================================== */

  if (CONFIG.telegram) {
    $$('[data-tg]').forEach(function (a) {
      a.href = 'https://t.me/' + CONFIG.telegram;
    });
  }
})();
