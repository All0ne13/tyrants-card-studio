import {
  assets,
  backs,
  CARD_KINDS,
  deckComposition,
  findRule,
  matchesPack,
  packRulesURL,
  ruleDocuments,
} from "./library.js";
import { t } from "./i18n.js";
const e = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const book =
  '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M24 10v31M5 6l19 4 19-4v31l-19 4-19-4z" stroke="currentColor" stroke-width="2"/><path d="m10 15 9 2m-9 6 9 2m10-8 9-2m-9 10 9-2" stroke="currentColor" stroke-width="1.5"/></svg>';
const categories = [
  ["all", "Усі матеріали"],
  ["decks", "Колоди"],
  ["back", "Сорочки"],
  ["mats", "Планшети"],
  ["boards", "Поля"],
  ["rules", "Правила"],
];
const kinds = {
  market: "Карта ринку",
  back: "Сорочка",
  treasure: "Скарб",
  stalker: "Сталкер",
  exalted: "Додаткова карта",
  ascended: "Дракон",
  mat: "Планшет",
  board: "Поле",
  token: "Жетони",
  "card-sheet": "Аркуш карт",
  "back-sheet": "Аркуш сорочок",
  reference: "Правила",
  update: "Оновлення",
};
function printButton(pack, tile = false) {
  if (pack.category !== "decks") return "";
  return `<div class="${tile ? "pack-print-action" : "pack-print-header"}"><button type="button" class="button ${tile ? "small ghost" : "primary"}" data-print-pack="${e(pack.id)}" aria-label="${t("Друкувати колоду")}: ${e(pack.title)}"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 9V3h12v6M6 17H3V9h18v8h-3M6 14h12v7H6z"/></svg>${t("Друкувати колоду")}</button></div>`;
}

export function packList(library, filter, search) {
  return library.filter((p) => matchesPack(p, filter, search));
}
export function packTile(pack) {
  const composition = deckComposition(pack);
  const count = composition
    ? `${composition.total} ${t("карт")}${composition.conflict ? ` · ${t("за правилами")}` : pack.id === "svirfneblin" ? ` · ${t("оновлення")}` : ""}`
    : pack.category === "rules"
      ? t("Базова гра")
      : `${pack.pages.filter((a) => a.kind !== "rules").length} ${t("сторінок")}`;
  const breakdown =
    composition?.market && composition.extra
      ? `<small>${composition.market} ${t("ринкових")} + ${composition.extra} ${t("додаткових")}</small>`
      : "";
  const rulesURL = packRulesURL(pack);
  const rules = !!rulesURL;
  const externalRules = rulesURL.startsWith("https://");
  return `<article class="pack-tile"><a class="pack-main" data-pack="${e(pack.id)}" href="#library/${e(pack.id)}"><div class="pack-cover ${e(pack.category)}">${pack.cover ? `<img src="${e(pack.cover)}" alt="" loading="lazy">` : `<span class="document-cover">${book}</span>`}<span class="pack-category">${t(pack.category === "decks" ? "КОЛОДА" : pack.category === "mats" ? "ПЛАНШЕТИ" : pack.category === "rules" ? "ПРАВИЛА" : "ПОЛЕ / ЖЕТОНИ")}</span></div><div class="pack-info"><div><h3 data-source-text>${e(pack.title)}</h3><p ${pack.community ? "data-source-text" : ""}>${pack.community ? e(pack.subtitle) : t(pack.subtitle)}</p>${pack.community ? `<small class="community-author" data-source-text>${e(pack.author)}</small>` : ""}</div><span aria-hidden="true">›</span></div></a><div class="pack-meta"><span class="pack-count">${count}${breakdown}</span>${rules ? `<a class="pack-rules-link" href="${e(rulesURL)}" ${externalRules ? 'target="_blank" rel="noopener noreferrer"' : ""} aria-label="${e(t("Прочитати правила"))}: ${e(pack.title)}">${t("Прочитати правила")}</a>` : `<span>${pack.files.length} ${t("файлів")}</span>`}</div>${printButton(pack, true)}</article>`;
}
export function assetTile(asset, pack, showPack = false) {
  return `<button class="asset-tile" data-asset="${e(asset.id)}" data-in-pack="${e(pack.id)}"><div><img src="${e(asset.image)}" alt="${e(asset.name)}" loading="lazy"></div><h3 data-source-text>${e(showPack ? pack.title : asset.name)}</h3><p>${t(kinds[asset.kind] || "Компонент")}${showPack ? ` · ${e(asset.name)}` : ""}${asset.copies ? ` · ${asset.copies} ${t("коп.")}` : ""}</p></button>`;
}
function ruleTile({ pack, doc }) {
  const language = t(
    doc.language === "uk"
      ? "Мова джерела: українська"
      : doc.language === "other"
        ? "Мова джерела: інша"
        : "Мова джерела: англійська",
  );
  return `<a class="rule-tile" href="#rules/${e(doc.id)}"><span class="rule-book">${book}</span><div><span class="eyebrow">${t(pack.id === "base-game" ? "Базова гра" : "ФАНАТСЬКЕ ДОПОВНЕННЯ")}</span><h3 data-source-text>${e(doc.title)}</h3><p>${language}</p><span class="rule-read">${t("Читати правила")} <span aria-hidden="true">›</span></span></div></a>`;
}
export function libraryResults(library, filter, search) {
  if (filter === "rules")
    return `<div class="rule-grid">${ruleDocuments(library, search).map(ruleTile).join("") || empty()}</div>`;
  if (filter === "back")
    return `<div class="asset-grid back-grid">${
      backs(library, search)
        .map(({ pack, asset }) => assetTile(asset, pack, true))
        .join("") || empty()
    }</div>`;
  return `<div class="pack-grid">${packList(library, filter, search).map(packTile).join("") || empty()}</div>`;
}
const empty = () =>
  `<p class="empty-state">${t("Нічого не знайдено. Спробуйте іншу назву.")}</p>`;
export function libraryView({ library, filter, search, packId }) {
  const pack = library.find((p) => p.id === packId);
  if (pack) return packView(pack);
  return `<main class="content-page"><div class="library-hero"><div><div class="eyebrow">БІБЛІОТЕКА</div><h1>Усе для<br><i>вашого столу.</i></h1><p>Карти, доповнення та правила — кожне на своєму місці.</p><a class="button ghost community-submit-link" href="#submit">${t("Запропонувати колоду")}</a></div><div class="archive-mark">${book}<span>${library.length} ${t("наборів")} · ${ruleDocuments(library).length} ${t("документів")}</span></div></div><div class="library-toolbar"><div class="category-tabs" aria-label="Бібліотека">${categories.map(([id, label]) => `<button class="${filter === id ? "selected" : ""}" data-filter="${id}" aria-pressed="${filter === id}">${t(label)}</button>`).join("")}</div><input id="library-search" type="search" placeholder="Знайти колоду, карту або правила…" value="${e(search)}" aria-label="Пошук у бібліотеці"></div><div id="library-results">${libraryResults(library, filter, search)}</div><p class="library-note">Матеріали залишаються мовою оригіналу. Авторство належить їхнім творцям.</p></main>`;
}
function section(title, items, pack, sheets = false) {
  return items.length
    ? `<section class="library-section"><h2 class="section-label">${t(title)} <span>${items.length}</span></h2><div class="asset-grid ${sheets ? "sheets" : ""}">${items.map((a) => assetTile(a, pack)).join("")}</div></section>`
    : "";
}
function packView(pack) {
  const items = assets(pack);
  return `<main class="content-page"><button class="text-button back-library" id="back-library">← ${t("Уся бібліотека")}</button><div class="page-heading"><div><div class="eyebrow">${t(pack.category === "rules" ? "ПРАВИЛА" : "ФАНАТСЬКЕ ДОПОВНЕННЯ")}</div><h1 data-source-text>${e(pack.title)}</h1><p ${pack.community ? "data-source-text" : ""}>${pack.community ? e(pack.subtitle) : t(pack.subtitle)}</p>${pack.community ? `<small class="community-author" data-source-text>${e(pack.author)}</small>` : ""}</div>${printButton(pack)}</div>${pack.note ? `<div class="info-note">${t(pack.note)}</div>` : ""}${pack.rulesDocuments.length ? `<section class="pack-rules"><h2 class="section-label">Правила та пам’ятки</h2><div class="rule-grid">${pack.rulesDocuments.map((doc) => ruleTile({ pack, doc })).join("")}</div></section>` : ""}${section(
    "Карти",
    items.filter((a) => CARD_KINDS.has(a.kind)),
    pack,
  )}${section(
    "Сорочки",
    items.filter((a) => a.kind === "back"),
    pack,
  )}${section(
    "Планшети",
    items.filter((a) => a.kind === "mat"),
    pack,
    true,
  )}${section(
    "Поля",
    items.filter((a) => ["board", "token"].includes(a.kind)),
    pack,
    true,
  )}${section(
    "Аркуші для друку",
    items.filter((a) => ["card-sheet", "back-sheet"].includes(a.kind)),
    pack,
    true,
  )}${
    pack.files.some((f) => f.role !== "rules")
      ? `<section><h2 class="section-label">Друковані файли</h2><div class="resource-files">${pack.files
          .filter((f) => f.role !== "rules")
          .map(
            (f) =>
              `<a class="resource-file" href="${e(f.url)}" download><span><b data-source-text>${e(pack.title)}</b><small>${f.type}${f.pages ? ` · ${f.pages} ${t("стор.")}` : ""} · ${(f.size / 1048576).toFixed(1)} ${t("МБ")}</small><span class="file-original-name" data-source-text>${e(f.name)}</span></span><span aria-hidden="true">↓</span></a>`,
          )
          .join("")}</div></section>`
      : ""
  }</main>`;
}
function blockHTML(block, index) {
  const rich = block.runs?.length
    ? block.runs
        .map((r) => {
          let s = e(r.text);
          if (r.bold) s = `<strong>${s}</strong>`;
          if (r.italic) s = `<em>${s}</em>`;
          return s;
        })
        .join("")
    : e(block.text);
  if (block.type === "heading")
    return `<h2 id="rule-section-${index}">${e(block.text)}</h2>`;
  return `<${block.type === "item" ? "li" : "p"}>${rich}</${block.type === "item" ? "li" : "p"}>`;
}
function articleHTML(blocks) {
  let listing = false;
  let html = "";
  blocks.forEach((block, index) => {
    if (block.type === "item" && !listing) {
      html += "<ul>";
      listing = true;
    }
    if (block.type !== "item" && listing) {
      html += "</ul>";
      listing = false;
    }
    html += blockHTML(block, index);
  });
  return html + (listing ? "</ul>" : "");
}
export function rulesView(library, id, pageNumber = 0) {
  const found = findRule(library, id);
  if (!found)
    return `<main class="content-page"><h1>Правила не знайдено.</h1><a href="#library">Уся бібліотека</a></main>`;
  const { pack, doc } = found,
    headings =
      doc.blocks
        ?.map((b, i) => ({ ...b, index: i }))
        .filter((b) => b.type === "heading") || [];
  const selected = Math.max(
    0,
    Math.min(pageNumber, (doc.pages?.length || 1) - 1),
  );
  const downloadLabel =
    doc.sourceKind === "guide"
      ? "Завантажити пам’ятку PDF"
      : doc.format === "pdf"
        ? "Відкрити PDF"
        : "Завантажити оригінал";
  return `<main class="content-page rules-page"><a class="text-button back-library" href="#library">← ${t("Уся бібліотека")}</a><header class="rules-heading"><div class="eyebrow">Правила та інструкції</div><h1 data-source-text>${e(doc.title)}</h1><p class="source-language">${t(doc.language === "uk" ? "Мова джерела: українська" : doc.language === "other" ? "Мова джерела: інша" : "Мова джерела: англійська")}</p><div class="reader-actions">${doc.format !== "article" || !doc.sourceUrl.startsWith("#") ? `<a class="button primary" href="${e(doc.sourceUrl)}" target="_blank" rel="noopener">${t(downloadLabel)}</a>` : ""}<button class="button ghost" data-rule-pack="${e(pack.id)}">До матеріалів колоди</button></div></header>${doc.format === "article" ? `<div class="reader-layout">${headings.length ? `<aside class="rules-toc"><h2>Зміст</h2>${headings.map((h) => `<button data-rule-section="${h.index}" data-source-text>${e(h.text)}</button>`).join("")}</aside>` : ""}<article class="rules-article" lang="${doc.language || "en"}" data-source-text>${articleHTML(doc.blocks || [])}</article></div>` : doc.format === "pages" ? `<section class="page-reader"><div class="reader-pagination"><button class="button ghost small" data-rule-page="${selected - 1}" ${selected === 0 ? "disabled" : ""}>Попередня сторінка</button><span>${t("Сторінка")} ${selected + 1} / ${doc.pages.length}</span><button class="button ghost small" data-rule-page="${selected + 1}" ${selected === doc.pages.length - 1 ? "disabled" : ""}>Наступна сторінка</button></div><a class="rule-page-image" href="${e(doc.pages[selected])}" target="_blank" rel="noopener" aria-label="Відкрити на весь екран"><img src="${e(doc.pages[selected])}" alt="${e(doc.title)} — ${selected + 1}" width="1400"></a></section>` : `<section class="pdf-reader"><p>Оригінальний документ відкриється в новій вкладці.</p><object data="${e(doc.sourceUrl)}#view=FitH" type="application/pdf" aria-label="${e(doc.title)}"><a class="button primary" href="${e(doc.sourceUrl)}" target="_blank" rel="noopener">Відкрити PDF</a></object></section>`}</main>`;
}
