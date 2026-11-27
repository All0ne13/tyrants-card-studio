import {
  blankCard,
  validateCard,
  ASPECTS,
  safeName,
  cardNumberLabel,
  cardNumberError,
} from "./model.js";
import { DECK_MARKS } from "./deck-marks.js";
import { ARCANE_SCHOOLS } from "./arcane-schools.js";
import { renderCard, getImage } from "./render.js";
import { download, exportPDF, exportPNG, exportBundle } from "./export.js";
import { SYMBOLS, symbolToken } from "./symbols.js";
import { locale, setLocale, t, localizeUI } from "./i18n.js";
import { supportURL } from "./library.js";
import {
  expandLanguageVersions,
  withTranslationDemo,
} from "./library-languages.js";
import { artworkRect, artworkPlacement, dragArtwork } from "./artwork.js";
import { FrameColors } from "./frame-colors.js";
import { libraryPrintPlan } from "./library-print-plan.js";
import { exportLibraryDeck } from "./library-print.js";
import {
  fetchCommunityPacks,
  loadCommunityDraft,
  captureSetupToken,
  submissionView,
  bindSubmission,
  addCardToProposal,
  moderationView,
  bindModeration,
} from "./community.js";
import { showAsset } from "./asset-viewer.js";
import {
  libraryView as renderLibrary,
  libraryResults,
  rulesView,
} from "./library-view.js";
const $ = (s, r = document) => r.querySelector(s),
  $$ = (s, r = document) => [...r.querySelectorAll(s)];
const e = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const icons = {
  card: '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="m12 8 3 4-3 4-3-4z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  book: '<path d="M12 5v16M3 3l9 2 9-2v16l-9 2-9-2z"/>',
  folder: '<path d="M3 7V4h6l3 3h9v13H3z"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload: '<path d="M12 17V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  image:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  duplicate:
    '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v13h5"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  print: '<path d="M6 9V3h12v6M6 17H3V9h18v8h-3M6 14h12v7H6z"/>',
  heart:
    '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  rotate:
    '<path d="M20 7v5h-5M4 17v-5h5M5 8a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3"/>',
};
const icon = (key, size = 18) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[key] || icons.card}</svg>`;
let state = { cards: [blankCard()], active: 0 },
  side = "front",
  tab = "text",
  library = [],
  filter = "all",
  search = "",
  packId = null,
  rulePage = 0,
  siteConfig = {},
  drawVersion = 0,
  timer;
let db;
let recentColors = [];
try {
  const saved = JSON.parse(
    localStorage.getItem("tyrants-studio-frame-colors") || "[]",
  );
  if (Array.isArray(saved)) recentColors = saved;
} catch {}
const frameColors = new FrameColors(recentColors);
function rememberFrameColors() {
  try {
    localStorage.setItem(
      "tyrants-studio-frame-colors",
      JSON.stringify(frameColors.recent),
    );
  } catch {}
}
function frameColorControls() {
  return `<section class="frame-color-settings"><label class="field color-field"><span>Колір рамки</span><input type="color" data-key="purple" value="${card().purple}"><code id="frame-color-value">${card().purple}</code></label><div id="frame-color-history">${frameColorHistory()}</div></section>`;
}
function frameColorHistory() {
  return `<button type="button" class="button small ghost" id="undo-frame-color" ${frameColors.canUndo(card().id) ? "" : "disabled"}>${icon("rotate", 15)} ${t("Скасувати колір")}</button>${frameColors.recent.length ? `<p class="recent-color-label">${t("Останні кольори")}</p><div class="recent-colors" role="group" aria-label="${t("Останні кольори")}">${frameColors.recent.map((color) => `<button type="button" class="recent-color ${color === card().purple.toLowerCase() ? "selected" : ""}" data-frame-color="${color}" style="--swatch:${color}" title="${color}" aria-label="${t("Колір рамки")}: ${color}" aria-pressed="${color === card().purple.toLowerCase()}"></button>`).join("")}</div>` : ""}`;
}
function updateFrameColors() {
  const input = $('[data-key="purple"]');
  if (input) input.value = card().purple;
  if ($("#frame-color-value"))
    $("#frame-color-value").textContent = card().purple;
  if ($("#frame-color-history"))
    $("#frame-color-history").innerHTML = frameColorHistory();
  if ($("#undo-frame-color"))
    $("#undo-frame-color").onclick = () => {
      frameColors.finish(card().id, card().purple);
      const previous = frameColors.undo(card().id);
      if (previous) {
        card().purple = previous;
        changed();
        persist();
      }
      rememberFrameColors();
      updateFrameColors();
    };
  $$("[data-frame-color]").forEach(
    (n) =>
      (n.onclick = () => {
        frameColors.finish(card().id, card().purple);
        frameColors.begin(card().id, card().purple);
        card().purple = n.dataset.frameColor;
        frameColors.finish(card().id, card().purple);
        rememberFrameColors();
        changed();
        persist();
        updateFrameColors();
      }),
  );
}
function toast(text, bad = false) {
  const n = $("#toast");
  n.textContent = t(text);
  n.className = "show" + (bad ? " error" : "");
  clearTimeout(n.timer);
  n.timer = setTimeout(() => (n.className = ""), 4500);
}
const card = () => state.cards[state.active] || state.cards[0];
async function database() {
  if (db) return db;
  db = await new Promise((resolve, reject) => {
    const r = indexedDB.open("underdark-atelier", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("workspace");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return db;
}
async function persist() {
  try {
    const d = await database();
    await new Promise((resolve, reject) => {
      const t = d.transaction("workspace", "readwrite");
      t.objectStore("workspace").put(state, "current");
      t.oncomplete = resolve;
      t.onerror = () => reject(t.error);
    });
    if ($("#saved"))
      $("#saved").innerHTML =
        icon("check", 13) + " " + t("Збережено на пристрої");
  } catch {
    if ($("#saved")) $("#saved").textContent = t("Не збережено");
    toast("Не вдалося зберегти в браузері. Експортуйте проєкт у JSON.", true);
  }
}
function changed() {
  if ($("#saved")) $("#saved").textContent = t("Збереження…");
  clearTimeout(timer);
  timer = setTimeout(persist, 450);
  preview();
  updateNumberFeedback();
}
function updateNumberFeedback() {
  const summary = $("#card-number-summary"),
    error = $("#card-number-error");
  if (summary) summary.textContent = cardNumberLabel(card());
  if (error) {
    error.textContent = t(cardNumberError(card()));
    error.hidden = !error.textContent;
  }
}
function supportMenu() {
  const mono = supportURL(siteConfig);
  const address = /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(
    siteConfig.supportUsdtTrc20 || "",
  )
    ? siteConfig.supportUsdtTrc20
    : "";
  if (!mono && !address) return "";
  return `<details class="support-menu" id="support-menu"><summary aria-controls="support-options">${icon("heart", 16)}<span>Підтримати проєкт</span></summary><div class="support-options" id="support-options"><p class="support-thanks">Дякую за підтримку майстерні карт!</p>${mono ? `<a class="support-mono" href="${e(mono)}" target="_blank" rel="noopener noreferrer"><strong>Банка Monobank</strong><span>Відкрити банку</span></a>` : ""}${address ? `<section class="support-crypto"><strong>USDT <small>TRC20 · TRON</small></strong><input id="support-address" aria-label="Адреса USDT у мережі TRC20" value="${e(address)}" readonly spellcheck="false"><button class="button ghost small" id="copy-support-address" type="button">Копіювати адресу</button><span class="support-copy-status" id="support-copy-status" role="status" aria-live="polite"></span></section>` : ""}</div></details>`;
}
function header(route) {
  return `<header class="topbar"><a class="brand" href="#editor"><span class="brand-icon">${icon("card", 27)}</span><span class="brand-name">Конструктор карт<span class="brand-sub">Тирани Підземелля</span></span></a><nav aria-label="Основна навігація"><a class="${route === "editor" ? "active" : ""}" href="#editor">${icon("card")}<span>Конструктор</span></a><a class="${["library", "rules"].includes(route) ? "active" : ""}" href="#library">${icon("book")}<span>Бібліотека</span></a><a class="${route === "projects" ? "active" : ""}" href="#projects">${icon("folder")}<span>Мої карти <b>${state.cards.length}</b></span></a></nav><div class="header-actions"><select id="locale-switch" aria-label="Мова інтерфейсу"><option value="en" ${locale === "en" ? "selected" : ""}>English</option><option value="uk" ${locale === "uk" ? "selected" : ""}>Українська</option></select><span class="save-status" id="saved">${icon("check", 13)} Збережено на пристрої</span><button class="button small ghost import-project">${icon("upload")}<span>Імпорт</span></button>${supportMenu()}</div></header>`;
}
function footer() {
  return `<footer class="studio-footer"><div class="app-footer"><span>Конструктор карт <b>Неофіційний фанатський конструктор</b></span><span><a href="#submit">${t("Запропонувати колоду")}</a> · <a href="#moderation">${t("Для власника")}</a> · 63,5 × 88 мм</span></div></footer>`;
}
function field(label, key, { area = false, placeholder = "", max = 250 } = {}) {
  if (["deckVP", "innerVP"].includes(key)) {
    const caption = locale === "uk" ? "Змінні очки" : "Variable points";
    return `<div class="field"><label for="points-${key}">${label}</label><div class="points-input"><input id="points-${key}" data-key="${key}" maxlength="${max}" value="${e(card()[key])}" placeholder="${placeholder}"><button type="button" class="button ghost" data-variable-points="${key}" aria-label="${caption}: ${label}" title="${caption}" aria-pressed="${card()[key].includes("*")}">*</button></div></div>`;
  }
  return `<label class="field"><span>${label}</span>${area ? `<textarea data-key="${key}" rows="${key === "effect" ? 4 : 3}" maxlength="${max}" placeholder="${placeholder}">${e(card()[key])}</textarea>` : `<input data-key="${key}" maxlength="${max}" value="${e(card()[key])}" placeholder="${placeholder}">`}</label>`;
}
function footerSettings() {
  return `<section class="deck-mark-settings"><h3>Знак та номер карти · зліва внизу</h3><div class="deck-mark-grid" role="group" aria-label="Вибір знака колоди">${Object.entries(
    DECK_MARKS,
  )
    .map(
      ([key, v]) =>
        `<button type="button" data-deck-mark="${key}" class="deck-mark-choice ${card().deckMark === key ? "selected" : ""}" aria-label="Знак колоди: ${e(v.label)}" aria-pressed="${card().deckMark === key}" title="${e(v.label)}"><img src="${v.image}" alt=""><span>${e(v.label)}</span></button>`,
    )
    .join(
      "",
    )}${card().deckIcon ? `<button type="button" data-deck-mark="custom" class="deck-mark-choice ${card().deckMark === "custom" ? "selected" : ""}" aria-label="Власний знак колоди" aria-pressed="${card().deckMark === "custom"}"><img src="${e(card().deckIcon)}" alt=""><span>Мій знак</span></button>` : ""}<button type="button" data-deck-mark="none" class="deck-mark-choice ${card().deckMark === "none" ? "selected" : ""}" aria-label="Без знака колоди" aria-pressed="${card().deckMark === "none"}"><b>—</b><span>Без знака</span></button></div><button type="button" class="text-button upload-deck" data-upload="deckIcon">${icon("upload", 14)} Додати власний знак</button><div class="card-number-fields"><label class="field"><span>Номер карти</span><input type="number" inputmode="numeric" data-key="cardNumber" min="1" max="9999" step="1" value="${e(card().cardNumber)}"></label><b>/</b><label class="field"><span>Карт у колоді</span><input type="number" inputmode="numeric" data-key="deckSize" min="1" max="9999" step="1" value="${e(card().deckSize)}"></label></div><p class="number-feedback">На карті: <strong id="card-number-summary">${e(cardNumberLabel(card()))}</strong></p><p class="number-error" id="card-number-error" ${cardNumberError(card()) ? "" : "hidden"}>${e(cardNumberError(card()))}</p></section>`;
}
function layoutSettings() {
  return secondaryAspectSettings() + standardLayoutSettings();
}
function secondaryAspectSettings() {
  const uk = locale === "uk";
  const label = (en, ua) => (uk ? ua : en);
  const choices = `<div class="deck-mark-grid arcane-school-grid">${Object.entries(
    ARCANE_SCHOOLS,
  )
    .map(
      ([id, school]) =>
        `<button type="button" class="deck-mark-choice ${card().secondaryAspectSchool === id ? "selected" : ""}" data-arcane-school="${id}" aria-pressed="${card().secondaryAspectSchool === id}"><img src="${school.image}" alt=""><span>${school.label}</span></button>`,
    )
    .join(
      "",
    )}</div><button type="button" class="text-button" data-arcane-school="">${label("No secondary aspect", "Без другого аспекту")}</button>`;
  return `<details class="symbol-tools" open><summary>${label("Secondary aspect", "Другий аспект")}</summary>${choices}${field(label("Name", "Назва"), "secondaryAspectText", { placeholder: "Abjuration", max: 35 })}<label class="field range"><span>${label("Text position ↕", "Положення тексту ↕")} <b>${card().secondaryAspectOffsetY} px</b></span><input data-key="secondaryAspectOffsetY" type="range" min="-10" max="12" step="1" value="${card().secondaryAspectOffsetY}"></label><details><summary>${label("Custom icon", "Власний значок")}</summary><button type="button" class="button ghost" data-upload="secondaryAspectIcon">${label("Upload icon", "Завантажити значок")}</button><button type="button" class="text-button" data-reset-school-icon>${label("Use original icon", "Оригінальний значок")}</button></details></details>`;
}
function standardLayoutSettings() {
  return `<label class="field"><span>Макет карти</span><select data-key="rulesHeight"><option value="170" ${Number(card().rulesHeight) === 170 ? "selected" : ""}>Короткий ефект</option><option value="260" ${Number(card().rulesHeight) === 260 ? "selected" : ""}>Стандартний</option><option value="340" ${Number(card().rulesHeight) === 340 ? "selected" : ""}>Великий блок правил</option></select></label>`;
}
function previewInstruction() {
  return `<div class="preview-foot">${card().art && side === "front" ? t("Перетягніть ілюстрацію, щоб змінити кадрування. Текст і значки можна натиснути.") : t("Натисніть текст або значок на карті, щоб змінити.")}</div>`;
}
function symbolButton(key, target) {
  const s = SYMBOLS[key];
  return `<button type="button" class="symbol-button" data-insert-symbol="${e(symbolToken(key))}" data-target="${target}" title="${e(s.label)}" aria-label="${e(s.label)}">${s.image ? `<img src="${s.image}" alt="">` : `<span>${s.text}</span>`}</button>`;
}
function richField(label, key, placeholder, max) {
  return `<div class="rich-field">${field(label, key, { area: true, placeholder, max })}<div class="text-tools" role="group" aria-label="Форматування: ${label}"><button class="symbol-button" data-format="**" data-target="${key}" aria-label="Жирний текст"><b>B</b></button><button class="symbol-button" data-format="*" data-target="${key}" aria-label="Курсив"><i>I</i></button>${["influence", "power", "arrow", "bullet", "plus"].map((s) => symbolButton(s, key)).join("")}</div><details class="more-symbols"><summary>Інші символи та власні значки</summary><div class="symbol-options">${["obedience", "malice", "ambition", "conquest", "guile", "vp", "infinity"].map((s) => symbolButton(s, key)).join("")}${card()
    .customSymbols.map(
      (s) =>
        `<button class="symbol-button" data-user-content data-insert-symbol="[icon:${s.id}]" data-target="${key}" aria-label="${e(s.name)}" title="${e(s.name)}"><img src="${e(s.data)}" alt=""></button>`,
    )
    .join(
      "",
    )}</div><button class="button ghost small" data-upload-symbol="${key}">${icon("upload", 14)} Завантажити свій значок</button><div class="unicode-insert"><input id="unicode-${key}" placeholder="Наприклад: ∞ ◆ ♥" maxlength="16" aria-label="Власні текстові символи"><button class="button small ghost" data-insert-unicode="${key}">Вставити</button></div></details></div>`;
}
function panel() {
  if (tab === "text")
    return `<div class="panel-caption">01 / ТЕКСТ КАРТИ</div>${footerSettings()}${layoutSettings()}${field("Назва", "name", { placeholder: "Наприклад, High Priestess", max: 65 })}<div class="field-row">${field("Вартість", "cost", { placeholder: "—", max: 4 })}${field("Тип / раса", "type", { placeholder: "Drow", max: 35 })}</div>${field("Назва аспекту", "aspectText", { placeholder: "Obedience", max: 35 })}${richField("Ефект карти", "effect", "Напишіть дію та її умови…", 1500)}${richField("Художній текст", "flavour", "Цитата або коротка історія…", 900)}<p class="markup-help">Кнопки вставляють символ у місце курсора. **Текст** — жирний, *текст* — курсив. Коди [influence] і [power] у прев’ю та файлах стають значками.</p><div class="field-row">${field("Очки в колоді", "deckVP", { placeholder: "1", max: 3 })}${field("Внутрішнє коло", "innerVP", { placeholder: "3", max: 3 })}</div><div class="field-row">${field("Кількість крапок", "copies", { placeholder: "1–8", max: 1 })}</div>${field("Підпис праворуч унизу", "footer", { placeholder: "© 2020 Wizards", max: 90 })}<label class="field range"><span>Розмір тексту <b>${card().fontSize} px</b></span><input data-key="fontSize" type="range" min="17" max="46" step="0.1" value="${card().fontSize}"></label>`;
  if (tab === "art")
    return `<div class="panel-caption">02 / ІЛЮСТРАЦІЯ</div><button class="upload-box" data-upload="art">${icon("image", 34)}<strong>${card().art ? "Змінити зображення" : "Додати ілюстрацію"}</strong><span>PNG, JPG або WebP · до 15 МБ</span></button><p class="muted">Зображення заповнює вікно карти. Зсуньте та збільште його, щоб вибрати композицію.</p>${[
      ["artScale", "Масштаб", 1, 3, 0.01],
      ["artX", "Горизонталь", -100, 100, 1],
      ["artY", "Вертикаль", -100, 100, 1],
    ]
      .map(
        ([key, label, min, max, step]) =>
          `<label class="field range"><span>${label}</span><input data-key="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${card()[key]}"></label>`,
      )
      .join(
        "",
      )}<button class="button ghost" id="reset-crop">${icon("rotate")} Скинути кадрування</button>${card().art ? '<button class="text-button danger" data-clear="art">Прибрати ілюстрацію</button>' : ""}`;
  if (tab === "icons")
    return `<div class="panel-caption">03 / АСПЕКТ І РАМКА</div><p class="muted">Коло залишається частиною рамки. Виберіть символ або завантажте власну іконку.</p><div class="aspect-grid">${Object.entries(
      ASPECTS,
    )
      .map(
        ([key, v]) =>
          `<button data-aspect="${key}" class="aspect ${card().aspect === key ? "selected" : ""}" aria-pressed="${card().aspect === key}"><span>${SYMBOLS[key]?.image ? `<img src="${SYMBOLS[key].image}" alt="">` : "—"}</span>${v.label}</button>`,
      )
      .join(
        "",
      )}</div><button class="button ghost" data-upload="icon">${icon("upload")} Власна іконка</button>${card().icon ? '<button class="text-button" data-clear="icon">Повернути стандартний символ</button>' : ""}${footerSettings()}${frameColorControls()}`;
  return `<div class="panel-caption">04 / СОРОЧКА</div><p class="muted">Сорочка збережеться разом із картою. Для двостороннього друку вона експортується на звороті.</p><label class="field"><span>Вигляд сорочки</span><select data-key="backMode"><option value="original" ${card().backMode === "original" ? "selected" : ""}>Оригінальна MINION</option><option value="pattern" ${card().backMode === "pattern" ? "selected" : ""}>Власний візерунок і напис</option><option value="image" ${card().backMode === "image" ? "selected" : ""}>Моє зображення</option></select></label>${card().backMode === "pattern" ? field("Назва колоди", "backTitle", { placeholder: "MINION", max: 40 }) + field("Додатковий рядок", "backSubtitle", { placeholder: "Назва доповнення", max: 50 }) : card().backMode === "image" ? `<button class="upload-box" data-upload="backImage">${icon("image", 32)}<strong>Завантажити сорочку</strong><span>PNG, JPG або WebP</span></button>` : `<p><a class="text-button" href="assets/minion-back-print.png" download="MINION-63.5x88mm.png">Скачати PNG для друку</a></p><p><a class="text-button" href="assets/minion-back-source.png" download="MINION-source-822x1122.png">Оригінальне зображення</a></p>`}`;
}
function editor() {
  const proposalMode = location.hash.split("/")[2];
  return `<div class="editor-intro"><div><div class="eyebrow">ВАШ ДІМ. ВАШІ КАРТИ.</div><h1>Майстерня карт</h1><p>Ваші історії. Ваші правила. Справжня карта на виході.</p></div><div class="editor-create-actions">${location.hash.startsWith("#editor/proposal/") ? `<button class="button primary" id="save-proposal-card">${t(proposalMode === "new" ? "Зберегти та додати до колоди" : "Зберегти та повернутися до колоди")}</button><a class="text-button" href="#submit">${t("Повернутися до колоди")}</a>` : ""}<button class="button ghost" id="new-card">${icon("plus")} Нова карта</button></div></div><div class="workspace"><aside class="editor-panel"><div class="panel-tabs" role="tablist">${[
    ["text", "Текст"],
    ["art", "Ілюстрація"],
    ["icons", "Іконки"],
    ["back", "Сорочка"],
  ]
    .map(
      ([k, v]) =>
        `<button role="tab" aria-selected="${tab === k}" data-tab="${k}" class="${tab === k ? "selected" : ""}">${v}</button>`,
    )
    .join(
      "",
    )}</div><div class="panel-content">${panel()}</div></aside><main class="preview-panel"><div class="preview-top"><span class="pill"><i></i> ЖИВЕ ПРЕВ’Ю</span><span>63,5 × 88 мм</span></div><div class="card-stage"><span class="stage-measure measure-top">63,5 ММ</span><canvas id="preview" aria-label="Прев’ю карти"></canvas><div id="card-hit-areas" class="card-hit-areas"></div><span class="stage-measure measure-side">88 ММ</span></div><div class="side-switch"><button data-side="front" class="${side === "front" ? "selected" : ""}">Лицьова сторона</button><button data-side="back" class="${side === "back" ? "selected" : ""}">Сорочка</button></div><div class="overflow-warning" id="overflow-warning" hidden>Текст не вміщується. Зменште шрифт або скоротіть текст.</div>${previewInstruction()}</main><aside class="export-panel"><div class="panel-caption">ГОТОВО ДО ДРУКУ</div><h2>З паперу —<br>у Підзем’я.</h2><p class="muted">Друкований PDF із точним розміром карти. Без скриншотів і ручного масштабування.</p><div class="print-spec"><div><span>Розмір</span><strong>63,5 × 88 мм</strong></div><div><span>Зображення</span><strong>≈ 300 DPI</strong></div><div><span>Ваша колода</span><strong>${state.cards.length} ${state.cards.length === 1 ? "карта" : "карт"}</strong></div></div><label class="field"><span>Експортувати</span><select id="export-scope"><option value="current">Поточну карту</option><option value="all">Усі мої карти</option></select></label><label class="check-field"><input id="include-back" type="checkbox" checked><span>Додати сорочки</span></label><button class="button primary wide" data-export="pdf">${icon("download")} Зберегти PDF</button><button class="button ghost wide" data-export="a4">${icon("print")} Аркуш A4 · до 9 карт</button><div class="export-links"><button data-export="png">PNG</button><button data-export="zip">ZIP</button><button data-export="json">Проєкт JSON</button></div><div class="print-hint"><b>Друкуйте в масштабі 100%.</b><br>Вимкніть «Підігнати до сторінки». Для A4 із сорочками — переворот уздовж довгого краю. Спочатку перевірте один аркуш.</div><div class="workspace-actions"><button class="button small ghost" id="duplicate">${icon("duplicate")} Копія</button><button class="icon-button danger" id="delete-card" aria-label="Видалити карту">${icon("trash")}</button></div></aside></div>`;
}
async function preview() {
  const c = $("#preview");
  if (!c) return;
  const version = ++drawVersion;
  try {
    await document.fonts.ready;
    const r = await renderCard(card(), {
      back: side === "back",
      preview: true,
    });
    if (version !== drawVersion || !$("#preview")) return;
    const dest = $("#preview");
    dest.width = r.canvas.width;
    dest.height = r.canvas.height;
    dest.getContext("2d").drawImage(r.canvas, 0, 0);
    const hitAreas = $("#card-hit-areas");
    if (hitAreas)
      hitAreas.innerHTML = (r.regions || [])
        .map(
          (area) =>
            `<button type="button" data-card-edit="${area.key}" data-edit-tab="${area.tab || "text"}" class="card-edit-region ${area.key === "art" && card().art ? "art-drag-region" : ""}" style="left:${area.x / 7.5}%;top:${area.y / 10.4}%;width:${area.w / 7.5}%;height:${area.h / 10.4}%" aria-label="Редагувати: ${e(area.label)}" title="${e(area.label)}"></button>`,
        )
        .join("");
    localizeUI(hitAreas);
    $("#overflow-warning").hidden = !r.overflow;
  } catch (err) {
    toast(err.message, true);
  }
}
async function createCard(forProposal = false) {
  state.cards.push(blankCard());
  state.active = state.cards.length - 1;
  side = "front";
  tab = "text";
  await persist();
  const target = forProposal ? "#editor/proposal/new" : "#editor";
  if (location.hash === target) render();
  else location.hash = target;
}
function projects() {
  return `<main class="content-page"><div class="page-heading"><div><div class="eyebrow">МОЇ ПРОЄКТИ</div><h1>Мої карти <em>${state.cards.length}</em></h1><p>Зберігаються у цьому браузері. Експортуйте проєкт, щоб перенести на інший пристрій.</p></div><div class="project-page-actions"><a class="button ghost" href="#submit">${t("Запропонувати колоду")}</a><button class="button primary" id="new-card">${icon("plus")} Створити карту</button></div></div><div class="project-grid">${state.cards.map((c, i) => `<article class="project-card"><button class="project-open" data-open="${i}"><canvas data-thumbnail="${i}"></canvas></button><div><h3 data-user-content>${e(c.name || t("Без назви"))}</h3><p data-user-content>${e(c.type || t("Власна карта"))} · ${t("63,5 × 88 мм")}</p><button class="text-button" data-open="${i}">Редагувати ${icon("chevron", 14)}</button></div></article>`).join("")}</div></main>`;
}
function libraryView() {
  return renderLibrary({ library, filter, search, packId });
}
function openAsset(id, pack) {
  const p = library.find((p) => p.id === pack),
    a = [...p.cards, ...p.pages].find((a) => a.id === id);
  showAsset(p, a, {
    icon,
    escape: e,
    onUseBack: async () => {
      card().backImage = await blobData(await (await fetch(a.image)).blob());
      card().backMode = "image";
      tab = "back";
      side = "back";
      location.hash = "editor";
      await persist();
      render();
    },
  });
}
function route() {
  return (location.hash.slice(1) || "editor").split("/")[0];
}
function render() {
  const r = route();
  document.documentElement.lang = locale;
  document.title =
    locale === "en"
      ? "Card Builder — Tyrants of the Underdark"
      : "Конструктор карт — Тирани Підземелля";
  document.querySelector('meta[name="description"]').content =
    locale === "en"
      ? "Create print-ready Tyrants of the Underdark cards. Edit artwork, text and symbols, explore fan expansions and read game rules."
      : "Створюйте карти Тиранів Підземелля для друку. Редагуйте зображення, текст і символи, переглядайте доповнення та читайте правила.";
  $("#app").innerHTML =
    header(r) +
    (r === "library"
      ? libraryView()
      : r === "rules"
        ? rulesView(library, location.hash.slice(1).split("/")[1], rulePage)
        : r === "submit"
          ? submissionView(state.cards)
          : r === "moderation"
            ? moderationView()
            : r === "projects"
              ? projects()
              : editor()) +
    footer();
  localizeUI($("#app"));
  bind();
  if (r === "editor") preview();
  if (r === "projects")
    $$("[data-thumbnail]").forEach(async (n) => {
      const v = await renderCard(state.cards[+n.dataset.thumbnail]);
      n.width = 300;
      n.height = 416;
      n.getContext("2d").drawImage(v.canvas, 0, 0, 300, 416);
    });
}
function bind() {
  bindSubmission({
    cards: state.cards,
    render,
    toast,
    onCatalogChange: refreshCommunity,
    createSource: () => createCard(true),
    editSource: (id, back) => {
      const index = state.cards.findIndex((c) => c.id === id);
      if (index < 0) return;
      state.active = index;
      tab = back ? "back" : "text";
      side = back ? "back" : "front";
      persist();
      location.hash = "editor/proposal/edit";
    },
  });
  bindModeration({
    render,
    toast,
    onCatalogChange: refreshCommunity,
    showAsset: (pack, asset) =>
      showAsset(pack, asset, { icon, escape: e, onUseBack: async () => {} }),
    showRules: (pack) => {
      const dialog = document.createElement("dialog");
      dialog.className = "community-rules-dialog";
      dialog.innerHTML =
        `<form method="dialog"><button class="icon-button" aria-label="${t("Закрити")}">×</button></form>` +
        rulesView([pack], pack.rulesDocuments[0].id);
      localizeUI(dialog);
      dialog.querySelector(".back-library")?.remove();
      dialog.querySelector("[data-rule-pack]")?.remove();
      document.body.append(dialog);
      dialog.onclose = () => dialog.remove();
      dialog.showModal();
    },
  });
  updateFrameColors();
  $$("[data-print-pack]").forEach(
    (n) =>
      (n.onclick = () => {
        const pack = library.find((p) => p.id === n.dataset.printPack);
        if (pack) showPrintDialog(pack);
      }),
  );
  const copySupport = $("#copy-support-address");
  if (copySupport)
    copySupport.onclick = async () => {
      const address = $("#support-address");
      try {
        await navigator.clipboard.writeText(address.value);
        $("#support-copy-status").textContent = t("Адресу скопійовано");
      } catch {
        address.focus();
        address.select();
        $("#support-copy-status").textContent = t(
          "Виділіть адресу та скопіюйте її вручну.",
        );
      }
    };
  if ($("#support-address"))
    $("#support-address").onclick = (ev) => ev.target.select();
  if ($("#locale-switch"))
    $("#locale-switch").onchange = async (ev) => {
      setLocale(ev.target.value);
      await persist();
      render();
    };
  $$("[data-rule-page]").forEach(
    (n) =>
      (n.onclick = () => {
        rulePage = Number(n.dataset.rulePage);
        render();
      }),
  );
  $$("[data-rule-section]").forEach(
    (n) =>
      (n.onclick = () =>
        document
          .getElementById("rule-section-" + n.dataset.ruleSection)
          ?.scrollIntoView({ block: "start" })),
  );
  $$("[data-rule-pack]").forEach(
    (n) =>
      (n.onclick = () => {
        location.hash = "library/" + n.dataset.rulePack;
      }),
  );
  $$("[data-deck-mark]").forEach(
    (n) =>
      (n.onclick = async () => {
        card().deckMark = n.dataset.deckMark;
        changed();
        await persist();
        render();
      }),
  );
  $$("[data-arcane-school]").forEach((button) => {
    button.onclick = async () => {
      const id = button.dataset.arcaneSchool;
      card().secondaryAspectSchool = id;
      card().secondaryAspectText = ARCANE_SCHOOLS[id]?.label || "";
      card().secondaryAspectIcon = "";
      changed();
      await persist();
      render();
      const field = $('[data-key="secondaryAspectText"]');
      if (field) field.closest("details").open = true;
    };
  });
  $$("[data-reset-school-icon]").forEach((button) => {
    button.onclick = async () => {
      card().secondaryAspectIcon = "";
      if (!card().secondaryAspectSchool) card().secondaryAspectSchool = "any";
      if (!card().secondaryAspectText)
        card().secondaryAspectText = ARCANE_SCHOOLS.any.label;
      changed();
      await persist();
      render();
    };
  });
  $$("[data-variable-points]").forEach((button) => {
    button.onclick = () => {
      const key = button.dataset.variablePoints;
      const input = $(`[data-key="${key}"]`);
      const value = String(card()[key] || "");
      card()[key] = value.includes("*")
        ? value.replaceAll("*", "")
        : value.slice(0, 2) + "*";
      input.value = card()[key];
      button.setAttribute("aria-pressed", String(card()[key].includes("*")));
      changed();
    };
  });
  const hitAreas = $("#card-hit-areas");
  let artDrag = null,
    suppressArtClick = false;
  if (hitAreas) {
    hitAreas.onpointerdown = async (ev) => {
      if (
        ev.button !== 0 ||
        !ev.isPrimary ||
        side !== "front" ||
        !card().art ||
        !ev.target.closest('[data-card-edit="art"]')
      )
        return;
      const start = {
        pointer: ev.pointerId,
        x: ev.clientX,
        y: ev.clientY,
        artX: card().artX,
        artY: card().artY,
        artScale: card().artScale,
        moved: false,
        id: card().id,
      };
      artDrag = start;
      hitAreas.setPointerCapture(ev.pointerId);
      try {
        const image = await getImage(card().art);
        if (artDrag !== start) return;
        start.rect = artworkRect(card());
        start.placement = artworkPlacement(image, start.rect, card());
        start.scale = 750 / $("#preview").getBoundingClientRect().width;
      } catch {
        artDrag = null;
      }
    };
    hitAreas.onpointermove = (ev) => {
      if (
        !artDrag?.placement ||
        ev.pointerId !== artDrag.pointer ||
        artDrag.id !== card().id
      )
        return;
      const dx = ev.clientX - artDrag.x,
        dy = ev.clientY - artDrag.y;
      if (!artDrag.moved && Math.hypot(dx, dy) < 4) return;
      artDrag.moved = true;
      ev.preventDefault();
      hitAreas.classList.add("is-dragging-art");
      Object.assign(
        card(),
        dragArtwork(
          artDrag,
          artDrag.placement,
          artDrag.rect,
          dx * artDrag.scale,
          dy * artDrag.scale,
        ),
      );
      for (const key of ["artX", "artY", "artScale"]) {
        const slider = $(`[data-key="${key}"]`);
        if (slider) slider.value = card()[key];
      }
      changed();
    };
    const finishDrag = (ev, cancel = false) => {
      if (!artDrag || ev.pointerId !== artDrag.pointer) return;
      if (cancel && artDrag.moved)
        Object.assign(card(), {
          artX: artDrag.artX,
          artY: artDrag.artY,
          artScale: artDrag.artScale,
        });
      suppressArtClick = artDrag.moved;
      if (artDrag.moved) {
        changed();
        persist();
      }
      artDrag = null;
      hitAreas.classList.remove("is-dragging-art");
      if (hitAreas.hasPointerCapture(ev.pointerId))
        hitAreas.releasePointerCapture(ev.pointerId);
      setTimeout(() => {
        suppressArtClick = false;
      }, 0);
    };
    hitAreas.onpointerup = (ev) => finishDrag(ev);
    hitAreas.onpointercancel = (ev) => finishDrag(ev, true);
    hitAreas.onlostpointercapture = (ev) => finishDrag(ev);
  }
  if (hitAreas)
    hitAreas.onclick = (ev) => {
      if (suppressArtClick) return;
      const n = ev.target.closest("[data-card-edit]");
      if (!n) return;
      tab = n.dataset.editTab;
      side = "front";
      render();
      const target =
        $(`[data-key="${n.dataset.cardEdit}"]`) ||
        $(`[data-upload="${n.dataset.cardEdit}"]`) ||
        (n.dataset.cardEdit === "deckMark"
          ? $(".deck-mark-settings")
          : n.dataset.cardEdit === "aspect"
            ? $(".aspect-grid")
            : null);
      if (target) {
        target.scrollIntoView({ behavior: "instant", block: "center" });
        if (target.focus) target.focus({ preventScroll: true });
        if (target.select) target.select();
      }
    };
  $$("[data-insert-symbol]").forEach(
    (n) =>
      (n.onclick = () => insertText(n.dataset.target, n.dataset.insertSymbol)),
  );
  $$("[data-format]").forEach(
    (n) =>
      (n.onclick = () => {
        const input = $(`[data-key="${n.dataset.target}"]`),
          a = input.selectionStart,
          b = input.selectionEnd;
        if (a === b) {
          toast("Спочатку виділіть текст, який потрібно форматувати.");
          return;
        }
        const mark = n.dataset.format;
        insertText(n.dataset.target, mark + input.value.slice(a, b) + mark);
      }),
  );
  $$("[data-insert-unicode]").forEach(
    (n) =>
      (n.onclick = () => {
        const key = n.dataset.insertUnicode,
          value = $(`#unicode-${key}`).value;
        if (value) insertText(key, value);
      }),
  );
  $$("[data-upload-symbol]").forEach(
    (n) => (n.onclick = () => uploadSymbol(n.dataset.uploadSymbol)),
  );
  $$("[data-key]").forEach((n) =>
    n.addEventListener(
      n.type === "range" ||
        n.type === "color" ||
        n.tagName === "TEXTAREA" ||
        n.tagName === "INPUT"
        ? "input"
        : "change",
      () => {
        if (n.dataset.key === "purple")
          frameColors.begin(card().id, card().purple);
        card()[n.dataset.key] = n.type === "range" ? Number(n.value) : n.value;
        if (
          n.dataset.key === "secondaryAspectText" &&
          n.value &&
          !card().secondaryAspectSchool &&
          !card().secondaryAspectIcon
        )
          card().secondaryAspectSchool = "any";
        if (n.dataset.key === "purple" && $("#frame-color-value"))
          $("#frame-color-value").textContent = card().purple;
        if (n.type === "range") {
          const b = n.closest("label").querySelector("b");
          if (b) b.textContent = n.value + " px";
        }
        changed();
        if (n.tagName === "SELECT") persist();
        if (n.dataset.key === "backMode") render();
      },
    ),
  );
  const colorInput = $('[data-key="purple"]');
  if (colorInput)
    colorInput.addEventListener("change", () => {
      frameColors.finish(card().id, card().purple);
      rememberFrameColors();
      updateFrameColors();
      persist();
    });
  $$("[data-tab]").forEach(
    (n) =>
      (n.onclick = () => {
        tab = n.dataset.tab;
        if (tab === "back") side = "back";
        else side = "front";
        render();
      }),
  );
  $$("[data-side]").forEach(
    (n) =>
      (n.onclick = () => {
        side = n.dataset.side;
        render();
      }),
  );
  $$("[data-aspect]").forEach(
    (n) =>
      (n.onclick = () => {
        card().aspect = n.dataset.aspect;
        card().icon = "";
        changed();
        persist();
        render();
      }),
  );
  $$("[data-upload]").forEach(
    (n) => (n.onclick = () => upload(n.dataset.upload)),
  );
  $$("[data-clear]").forEach(
    (n) =>
      (n.onclick = () => {
        card()[n.dataset.clear] = "";
        changed();
        render();
      }),
  );
  if ($("#reset-crop"))
    $("#reset-crop").onclick = () => {
      Object.assign(card(), { artScale: 1, artX: 0, artY: 0 });
      changed();
      render();
    };
  if ($("#new-card"))
    $("#new-card").onclick = () =>
      createCard(location.hash.startsWith("#editor/proposal/"));
  if ($("#save-proposal-card"))
    $("#save-proposal-card").onclick = async (event) => {
      const button = event.currentTarget;
      if (!card().name.trim()) {
        toast("Додайте назву карти в конструкторі перед надсиланням.", true);
        tab = "text";
        render();
        $('[data-key="name"]')?.focus();
        return;
      }
      button.disabled = true;
      try {
        await persist();
        if (location.hash.endsWith("/new")) await addCardToProposal(card());
        location.hash = "submit";
      } catch (err) {
        toast(err.message, true);
        button.disabled = false;
      }
    };
  if ($("#duplicate"))
    $("#duplicate").onclick = () => {
      state.cards.push({ ...structuredClone(card()), id: crypto.randomUUID() });
      state.active = state.cards.length - 1;
      persist();
      render();
      toast("Створено копію карти.");
    };
  if ($("#delete-card"))
    $("#delete-card").onclick = () => {
      if (
        !confirm(
          t(
            "Видалити поточну карту? Експортуйте проєкт, якщо хочете залишити копію.",
          ),
        )
      )
        return;
      state.cards.splice(state.active, 1);
      if (!state.cards.length) state.cards.push(blankCard());
      state.active = Math.min(state.active, state.cards.length - 1);
      persist();
      render();
    };
  $$("[data-open]").forEach(
    (n) =>
      (n.onclick = () => {
        state.active = +n.dataset.open;
        location.hash = "editor";
        persist();
        render();
      }),
  );
  $$(".import-project").forEach((n) => (n.onclick = importProject));
  $$("[data-export]").forEach((n) => (n.onclick = () => doExport(n)));
  $$("[data-filter]").forEach(
    (n) =>
      (n.onclick = () => {
        filter = n.dataset.filter;
        packId = null;
        render();
      }),
  );
  $$("[data-pack]").forEach(
    (n) =>
      (n.onclick = () => {
        location.hash = "library/" + n.dataset.pack;
      }),
  );
  if ($("#back-library"))
    $("#back-library").onclick = () => {
      packId = null;
      if (location.hash !== "#library") location.hash = "library";
      else render();
    };
  if ($("#library-search"))
    $("#library-search").oninput = (ev) => {
      search = ev.target.value;
      $("#library-results").innerHTML = libraryResults(library, filter, search);
      localizeUI($("#library-results"));
      bind();
    };
  $$("[data-asset]").forEach(
    (n) => (n.onclick = () => openAsset(n.dataset.asset, n.dataset.inPack)),
  );
}
function showPrintDialog(pack) {
  const plan = libraryPrintPlan(pack);
  const controller = new AbortController();
  const dialog = document.createElement("dialog");
  dialog.className = "print-dialog";
  const singleAvailable = !plan.sourceSheets || !!pack.singleCardFiles;
  dialog.innerHTML = `<form method="dialog"><button class="icon-button print-close" aria-label="Закрити">${icon("close")}</button></form><div class="eyebrow">ДРУК КОЛОДИ</div><h2 data-source-text>${e(pack.title)}</h2><label class="field"><span>Формат PDF</span><select id="library-print-layout">${singleAvailable ? `<option value="single">Одна сторона карти на сторінку · 63,5 × 88 мм</option>` : ""}<option value="a4">${t(plan.sourceSheets ? "Оригінальні аркуші автора · ZIP" : "Аркуші A4 · до 9 карт")}</option></select></label><p id="print-layout-description"></p><p id="print-card-count"></p><label class="check-field" id="library-print-backs-field"><input id="library-print-backs" type="checkbox" checked><span>Додати сорочки карт</span></label>${plan.extra ? `<label class="check-field"><input id="library-print-extras" type="checkbox" checked><span>Додати додаткові карти та пам’ятки</span></label>` : ""}${pack.id === "delver" ? `<p class="print-source-warning">У джерелах є розбіжність: 41 ринкова карта замість 40. Експорт зберігає всі надані карти.</p>` : ""}${pack.id === "cohort" ? `<p>${t("Містить також альтернативні версії карт з авторського PDF.")}</p>` : ""}<p class="print-instructions" id="library-print-instructions"></p><progress id="library-print-progress" value="0" max="1" hidden></progress><p id="library-print-status" role="status" aria-live="polite"></p><button class="button primary wide" id="library-print-download"></button>`;
  document.body.append(dialog);
  localizeUI(dialog);
  const extras = $("#library-print-extras", dialog),
    backs = $("#library-print-backs", dialog);
  const layout = $("#library-print-layout", dialog);
  const downloadButton = $("#library-print-download", dialog);
  const syncOptions = () => {
    const single = layout.value === "single";
    const originals = plan.sourceSheets && !single;
    const count = plan.sourceSheets
      ? pack.singleCardCount
      : libraryPrintPlan(pack, {
          includeExtras: !extras || extras.checked,
        }).cards.length;
    $("#print-card-count", dialog).textContent = originals
      ? ""
      : `${count} ${t("карт")} · ${single ? count * (backs.checked ? 2 : 1) : Math.ceil(count / 9) * (backs.checked ? 2 : 1)} ${t("сторінок")}`;
    $("#library-print-backs-field", dialog).hidden = originals;
    $("#print-layout-description", dialog).textContent = t(
      originals
        ? "Оригінальні аркуші автора з картами та сорочками. Розміри й розташування збережено."
        : single
          ? backs.checked
            ? "Лице 1 → сорочка 1 → лице 2 → сорочка 2. Одна сторона карти на кожній сторінці."
            : "Одна лицьова сторона карти на кожній сторінці."
          : "Проміжок 3 мм і мітки різання",
    );
    $("#library-print-instructions", dialog).textContent =
      (originals
        ? t("Друкуйте оригінальні аркуші за вказівками автора.")
        : single
          ? t("PDF для типографії. Розмір кожної сторінки: 63,5 × 88 мм.")
          : t(
              "Для двостороннього друку виберіть переворот уздовж довгого краю.",
            )) +
      " " +
      t("Масштаб 100%, без підгонки. Спочатку надрукуйте один аркуш.");
    downloadButton.innerHTML =
      icon("download") +
      " " +
      t(
        originals
          ? "Завантажити друковані файли ZIP"
          : backs.checked
            ? "Завантажити PDF із сорочками"
            : "Завантажити PDF без сорочок",
      );
  };
  if (extras) extras.onchange = syncOptions;
  if (backs) backs.onchange = syncOptions;
  layout.onchange = syncOptions;
  syncOptions();
  dialog.onclose = () => {
    controller.abort();
    dialog.remove();
  };
  downloadButton.onclick = async () => {
    downloadButton.disabled = true;
    if (backs) backs.disabled = true;
    if (extras) extras.disabled = true;
    layout.disabled = true;
    const progress = $("#library-print-progress", dialog),
      status = $("#library-print-status", dialog);
    progress.hidden = false;
    try {
      const result = await exportLibraryDeck(pack, {
        layout: layout.value,
        duplex: backs?.checked ?? true,
        includeExtras: extras?.checked ?? true,
        signal: controller.signal,
        onProgress: (done, total) => {
          progress.max = total;
          progress.value = done;
          status.textContent = `${t("Підготовка друку")}: ${done} / ${total}`;
        },
      });
      if (controller.signal.aborted) return;
      download(
        result.blob,
        safeName(pack.title) +
          (layout.value === "single" ? "-single-cards" : "-print") +
          "." +
          result.extension,
      );
      status.textContent = t("Готово. Файл завантажено.");
    } catch (err) {
      if (err.name !== "AbortError")
        status.textContent = t(err.message || "Не вдалося підготувати друк.");
    } finally {
      downloadButton.disabled = false;
      if (backs) backs.disabled = false;
      if (extras) extras.disabled = false;
      layout.disabled = false;
    }
  };
  dialog.showModal();
}
async function doExport(button) {
  const type = button.dataset.export,
    cards = $("#export-scope")?.value === "all" ? state.cards : [card()],
    name = safeName(card().name);
  button.disabled = true;
  const original = button.innerHTML;
  button.textContent = t("Готуємо файл…");
  try {
    await persist();
    if (type === "json")
      download(
        new Blob(
          [
            JSON.stringify(
              { format: "tyrants-studio", version: 1, cards },
              null,
              2,
            ),
          ],
          { type: "application/json" },
        ),
        name + ".json",
      );
    else if (type === "png")
      download(
        await exportPNG(card(), { back: side === "back" }),
        name + (side === "back" ? "-back" : "-front") + ".png",
      );
    else if (type === "zip")
      download(await exportBundle(cards), name + "-cards.zip");
    else
      download(
        await exportPDF(cards, {
          a4: type === "a4",
          duplex: $("#include-back").checked,
        }),
        name + (type === "a4" ? "-A4" : "-63.5x88") + ".pdf",
      );
    toast("Файл готовий. Для друку PDF оберіть масштаб 100%.");
  } catch (err) {
    toast(err.message, true);
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}
const blobData = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
function filePicker(accept) {
  return new Promise((resolve) => {
    const i = document.createElement("input");
    i.type = "file";
    i.accept = accept;
    i.onchange = () => resolve(i.files?.[0]);
    i.oncancel = () => resolve(null);
    i.click();
  });
}
async function upload(key) {
  try {
    const f = await filePicker("image/png,image/jpeg,image/webp");
    if (!f) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(f.type) ||
      f.size > 15 * 1048576
    )
      throw Error("Оберіть PNG, JPG або WebP до 15 МБ.");
    const src = await blobData(f),
      im = await getImage(src);
    const canvas = document.createElement("canvas"),
      s = Math.min(1, 1800 / Math.max(im.width, im.height));
    canvas.width = Math.round(im.width * s);
    canvas.height = Math.round(im.height * s);
    canvas.getContext("2d").drawImage(im, 0, 0, canvas.width, canvas.height);
    card()[key] = canvas.toDataURL(
      ["icon", "deckIcon", "secondaryAspectIcon"].includes(key)
        ? "image/png"
        : "image/jpeg",
      0.94,
    );
    if (key === "art") Object.assign(card(), { artScale: 1, artX: 0, artY: 0 });
    if (key === "deckIcon") card().deckMark = "custom";
    changed();
    render();
  } catch (err) {
    toast(err.message, true);
  }
}
function insertText(key, value, selection) {
  const input = $(`[data-key="${key}"]`);
  if (!input) return;
  if (selection) input.setSelectionRange(selection[0], selection[1]);
  if (
    input.value.length -
      (input.selectionEnd - input.selectionStart) +
      value.length >
    input.maxLength
  ) {
    toast("У полі недостатньо місця для цього фрагмента.", true);
    return;
  }
  input.setRangeText(value, input.selectionStart, input.selectionEnd, "end");
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.focus();
}
async function uploadSymbol(target) {
  try {
    if (card().customSymbols.length >= 24)
      throw Error("На одну карту можна додати до 24 власних значків.");
    const input = $(`[data-key="${target}"]`),
      selection = [input.selectionStart, input.selectionEnd],
      f = await filePicker("image/png,image/jpeg,image/webp");
    if (!f) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(f.type) ||
      f.size > 5 * 1048576
    )
      throw Error("Оберіть PNG, JPG або WebP до 5 МБ.");
    const im = await getImage(await blobData(f)),
      canvas = document.createElement("canvas"),
      s = Math.min(1, 192 / Math.max(im.width, im.height));
    canvas.width = Math.round(im.width * s);
    canvas.height = Math.round(im.height * s);
    canvas.getContext("2d").drawImage(im, 0, 0, canvas.width, canvas.height);
    const id = "s" + crypto.randomUUID().replaceAll("-", "").slice(0, 12);
    card().customSymbols.push({
      id,
      name: f.name.replace(/\.[^.]+$/, "").slice(0, 40),
      data: canvas.toDataURL("image/png"),
    });
    render();
    insertText(target, `[icon:${id}]`, selection);
  } catch (err) {
    toast(err.message, true);
  }
}
async function importProject() {
  try {
    const f = await filePicker(".json,application/json");
    if (!f) return;
    if (f.size > 60 * 1048576) throw Error("Файл завеликий. Максимум 60 МБ.");
    const data = JSON.parse(await f.text());
    if (
      data.format !== "tyrants-studio" ||
      data.version !== 1 ||
      !Array.isArray(data.cards) ||
      !data.cards.length ||
      data.cards.length > 100
    )
      throw Error(
        "Це не проєкт Tyrants Card Studio або в ньому понад 100 карт.",
      );
    const cards = data.cards
      .map(validateCard)
      .map((c) => ({ ...c, id: crypto.randomUUID() }));
    state.cards.push(...cards);
    state.active = state.cards.length - cards.length;
    await persist();
    location.hash = "projects";
    render();
    toast(`Імпортовано карт: ${cards.length}.`);
  } catch (err) {
    toast(err.message || "Не вдалося імпортувати проєкт.", true);
  }
}
try {
  const d = await database();
  const saved = await new Promise((resolve) => {
    const r = d
      .transaction("workspace")
      .objectStore("workspace")
      .get("current");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => resolve(null);
  });
  if (saved?.cards?.length) {
    state = {
      cards: saved.cards.map(validateCard),
      active: Math.min(saved.active || 0, saved.cards.length - 1),
    };
  }
} catch {}
async function refreshCommunity() {
  const packs = await fetchCommunityPacks();
  library = [...library.filter((p) => !p.community), ...packs];
}
captureSetupToken();
await loadCommunityDraft();
try {
  library = await (await fetch("library.json", { cache: "no-store" })).json();
  library = expandLanguageVersions(
    withTranslationDemo(
      library,
      new URLSearchParams(location.search).get("demo") === "translations",
    ),
  );
} catch {
  toast("Бібліотека недоступна. Редактор працює незалежно.", true);
}
try {
  siteConfig = await (
    await fetch("site-config.json", { cache: "no-store" })
  ).json();
} catch {}
document.addEventListener("pointerdown", (event) => {
  const menu = $("#support-menu");
  if (menu?.open && !menu.contains(event.target)) menu.open = false;
});
document.addEventListener("keydown", (event) => {
  const menu = $("#support-menu");
  if (event.key === "Escape" && menu?.open) {
    menu.open = false;
    menu.querySelector("summary").focus();
  }
});
window.addEventListener("hashchange", () => {
  packId =
    route() === "library" ? location.hash.slice(1).split("/")[1] || null : null;
  rulePage = 0;
  render();
  window.scrollTo(0, 0);
});
packId =
  route() === "library" ? location.hash.slice(1).split("/")[1] || null : null;
render();
refreshCommunity()
  .then(() => {
    if (["library", "rules"].includes(route())) render();
  })
  .catch(() => {});
