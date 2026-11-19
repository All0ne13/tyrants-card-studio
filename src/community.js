import { t, localizeUI } from "./i18n.js";
import { printable } from "./export.js";
import { renderCard } from "./render.js";

export const COMMUNITY_API = "/.netlify/functions/decks";
const e = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const errors = {
  "You have reached the daily submission limit. Your draft is saved — try again tomorrow.":
    "Ви досягли денного ліміту заявок. Чернетку збережено — спробуйте завтра.",
  "Deck submissions are busy today. Your draft is saved — try again tomorrow.":
    "Прийом колод сьогодні перевантажено. Чернетку збережено — спробуйте завтра.",
  "Incorrect password.": "Неправильний пароль.",
  "The owner is setting up submissions. Please try again later.":
    "Власник налаштовує прийом колод. Спробуйте пізніше.",
  "Upload limit reached. Please try again later.":
    "Ліміт завантажень вичерпано. Спробуйте пізніше.",
  "Sign in to review submissions.": "Увійдіть, щоб переглянути заявки.",
  "Use a password with at least 12 characters.":
    "Використайте пароль із щонайменше 12 символів.",
  "This setup link is not valid.": "Це посилання налаштування недійсне.",
  "The administrator account is already configured.":
    "Обліковий запис власника вже налаштовано.",
};
export async function communityRequest(
  route,
  { method = "GET", body, id, asset, token } = {},
) {
  const url = new URL(COMMUNITY_API, location.origin);
  url.searchParams.set("route", route);
  if (id) url.searchParams.set("id", id);
  if (asset) url.searchParams.set("asset", asset);
  const headers = {};
  if (token) headers["X-Submission-Token"] = token;
  if (body && !(body instanceof Blob)) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }
  const response = await fetch(url, {
    method,
    headers,
    body,
    credentials: "same-origin",
    cache: "no-store",
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw Error(t("Сервіс тимчасово недоступний. Спробуйте пізніше."));
  }
  if (!response.ok)
    throw Error(
      t(
        errors[data.error] ||
          data.error ||
          "Сервіс тимчасово недоступний. Спробуйте пізніше.",
      ),
    );
  return data;
}
export async function fetchCommunityPacks() {
  return (await communityRequest("catalog")).packs;
}
const emptyDraft = () => ({
  title: "",
  author: "",
  description: "",
  rulesText: "",
  language: "en",
  rights: false,
  cards: [],
  back: null,
  backSourceId: "",
  rulesPDF: null,
  remote: null,
});
let draft = emptyDraft(),
  receipts = [],
  busy = false,
  dbPromise,
  submissionError = "";
const dataURL = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
function database() {
  return (dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open("underdark-community", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("drafts");
    req.onsuccess = () => resolve(req.result);
    req.onerror = reject;
  }));
}
async function saveDraft() {
  try {
    const db = await database();
    await new Promise((resolve, reject) => {
      const tx = db.transaction("drafts", "readwrite");
      tx.objectStore("drafts").put({ draft, receipts }, "current");
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch {
    throw Error(t("Не вдалося зберегти чернетку на пристрої."));
  }
}
export async function loadCommunityDraft() {
  try {
    const db = await database();
    const saved = await new Promise((resolve) => {
      const req = db.transaction("drafts").objectStore("drafts").get("current");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
    if (saved) {
      draft = { ...emptyDraft(), ...saved.draft };
      if (
        draft.back &&
        !saved.draft.backSourceId &&
        !draft.cards.some((c) => c.sourceId)
      )
        draft.backSourceId = "__saved";
      receipts = saved.receipts || [];
    }
  } catch {}
}
function statusLabel(status) {
  return t(
    {
      draft: "Завантаження",
      pending: "Очікує перевірки",
      approved: "Опубліковано",
      rejected: "Відхилено",
    }[status] || "Очікує перевірки",
  );
}
export function submissionView(cards) {
  const locked = busy || draft.remote;
  const selected = new Set(draft.cards.map((c) => c.sourceId).filter(Boolean));
  const backCard =
    draft.backSourceId === "__saved"
      ? null
      : cards.find((c) => c.id === draft.backSourceId) ||
        cards.find((c) => c.id === draft.cards[0]?.sourceId);
  return `<main class="content-page community-page"><div class="page-heading"><div><div class="eyebrow">${t("СПІЛЬНОТА")}</div><h1>${t("Запропонувати колоду")}</h1><p>${t("Додайте свої карти. Власник перегляне колоду перед публікацією в бібліотеці.")}</p></div><a class="text-button" href="#library">← ${t("Уся бібліотека")}</a></div>
  <form id="submission-form" class="submission-layout"><section class="community-panel"><h2>${t("Про колоду")}</h2><label class="field"><span>${t("Назва колоди")}</span><input data-sub-field="title" value="${e(draft.title)}" maxlength="100" required ${locked ? "disabled" : ""}></label><label class="field"><span>${t("Автор / псевдонім")}</span><input data-sub-field="author" value="${e(draft.author)}" maxlength="100" required ${locked ? "disabled" : ""}></label><label class="field"><span>${t("Короткий опис")}</span><textarea data-sub-field="description" maxlength="1000" ${locked ? "disabled" : ""}>${e(draft.description)}</textarea></label>
  <h2>${t("Сорочка та правила")}</h2><p class="muted">${t("Виберіть сорочку однієї зі своїх карт. Вона буде спільною для всієї колоди.")}</p><label class="field"><span>${t("Сорочка з конструктора")}</span><select id="submission-back-source" ${locked ? "disabled" : ""}><option value="" ${!draft.backSourceId ? "selected" : ""}>${t("Сорочка першої вибраної карти")}</option>${cards.map((c, i) => `<option value="${e(c.id)}" ${draft.backSourceId === c.id ? "selected" : ""}>${e(c.name || `${t("Без назви")} · ${i + 1}`)}</option>`).join("")}${draft.backSourceId === "__saved" ? `<option value="__saved" selected>${t("Збережена сорочка чернетки")}</option>` : ""}</select></label>
  ${backCard ? `<div class="submission-back-preview"><canvas data-sub-preview="${e(backCard.id)}" data-back="true" aria-label="${t("Сорочка")}"></canvas><button type="button" class="text-button" data-edit-source-back="${e(backCard.id)}" ${locked ? "disabled" : ""}>${t("Редагувати сорочку")}</button></div>` : draft.back ? `<div class="submission-back-preview"><img src="${draft.back}" alt="${t("Сорочка")}"></div>` : `<p class="muted">${t("Додайте карту, щоб побачити її сорочку.")}</p>`}
  <label class="field"><span>${t("Правила колоди")}</span><textarea data-sub-field="rulesText" maxlength="20000" ${locked ? "disabled" : ""}>${e(draft.rulesText)}</textarea></label><label class="field"><span>${t("Правила PDF · до 3 МБ")}</span><input id="submission-rules-pdf" type="file" accept="application/pdf" ${locked ? "disabled" : ""}></label>${draft.rulesPDF ? `<p class="muted">${e(draft.rulesPDF.name)} <button type="button" class="text-button" id="remove-submission-rules" ${locked ? "disabled" : ""}>${t("Прибрати")}</button></p>` : ""}</section>
  <section class="community-panel"><div class="submission-card-heading"><h2>${t("Карти")} <span>${draft.cards.length} / 60</span></h2><span>${draft.cards.reduce((sum, c) => sum + c.copies, 0)} ${t("примірників")}</span></div>
  <h3>${t("Карти в колоді")}</h3><div class="submission-cards">${
    draft.cards
      .map((c, i) => {
        const source = cards.find((source) => source.id === c.sourceId);
        return `<article class="submission-card">${source ? `<canvas data-sub-preview="${e(source.id)}" aria-label="${e(source.name || t("Без назви"))}"></canvas>` : `<img src="${c.data}" alt="">`}<div class="submission-card-name"><strong data-user-content>${e(source?.name || c.name || t("Без назви"))}</strong>${source ? `<button type="button" class="text-button" data-edit-source="${e(source.id)}" ${locked ? "disabled" : ""}>${t("Редагувати в конструкторі")}</button>` : ""}</div><label class="field copies-field"><span>${t("Копії")}</span><input type="number" data-sub-copies="${i}" min="1" max="40" value="${c.copies}" required ${locked ? "disabled" : ""}></label><button type="button" class="icon-button" data-remove-sub-card="${i}" aria-label="${t("Прибрати")}" ${locked ? "disabled" : ""}>×</button></article>`;
      })
      .join("") ||
    `<p class="empty-state">${t("Виберіть карти нижче, щоб зібрати колоду.")}</p>`
  }</div>
  <div class="submission-picker-heading"><h3>${t("Вибрати з «Мої карти»")}</h3><a class="text-button" href="#editor">${t("Створити карту")}</a></div><p class="muted">${t("Назви та зображення беруться з ваших збережених карт автоматично.")}</p>
  <div class="submission-source-grid">${
    cards
      .filter((c) => !selected.has(c.id))
      .map(
        (c) =>
          `<article class="submission-source-card"><canvas data-sub-preview="${e(c.id)}" aria-label="${e(c.name || t("Без назви"))}"></canvas><strong data-user-content>${e(c.name || t("Без назви"))}</strong><button type="button" class="button ghost small" data-add-source="${e(c.id)}" ${locked ? "disabled" : ""}>${t("Додати до колоди")}</button><button type="button" class="text-button" data-edit-source="${e(c.id)}" ${locked ? "disabled" : ""}>${t("Редагувати в конструкторі")}</button></article>`,
      )
      .join("") ||
    `<p class="muted">${t("Усі збережені карти вже додано.")}</p>`
  }</div>
  <label class="check-field submission-rights"><input data-sub-field="rights" type="checkbox" ${draft.rights ? "checked" : ""} required ${locked ? "disabled" : ""}><span>${t("Я маю право ділитися цими матеріалами й дозволяю розмістити їх у бібліотеці з моїм авторством.")}</span></label><label class="submission-honeypot" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label><progress id="submission-progress" hidden></progress><p id="submission-status" class="${submissionError ? "error" : ""}" role="status" aria-live="polite">${e(submissionError)}</p><button class="button primary" id="send-submission" ${busy ? "disabled" : ""}>${t(draft.remote ? "Продовжити надсилання" : "Надіслати на перевірку")}</button>${draft.remote && !busy ? `<button class="text-button" type="button" id="edit-submission-again">${t("Повернутися до редагування")}</button>` : ""}</section></form>
  ${receipts.length ? `<section class="community-panel submission-receipts"><h2>${t("Мої заявки")}</h2>${receipts.map((r, i) => `<article><div><strong data-user-content>${e(r.title)}</strong><p>${statusLabel(r.status)}</p>${r.decisionNote ? `<p data-user-content>${e(r.decisionNote)}</p>` : ""}${r.status === "approved" ? `<a href="#library/${e(r.id)}">${t("Відкрити колоду")}</a>` : ""}</div><button class="button ghost small" data-refresh-receipt="${i}">${t("Оновити статус")}</button></article>`).join("")}</section>` : ""}</main>`;
}
async function cardImage(card, back = false) {
  const canvas = await printable(card, { back });
  return dataURL(
    await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.96)),
  );
}
export function bindSubmission({
  cards,
  render,
  toast,
  onCatalogChange,
  editSource,
}) {
  const form = document.querySelector("#submission-form");
  if (!form) return;
  const status = (message, error = false) => {
    const n = document.querySelector("#submission-status");
    if (n) {
      n.textContent = message;
      n.classList.toggle("error", error);
    }
  };
  const save = () => saveDraft().catch((err) => toast(err.message, true));
  form.querySelectorAll("[data-sub-field]").forEach(
    (n) =>
      (n.oninput = () => {
        draft[n.dataset.subField] = n.type === "checkbox" ? n.checked : n.value;
        save();
      }),
  );
  async function renderPreviews() {
    for (const n of form.querySelectorAll("[data-sub-preview]")) {
      const source = cards.find((c) => c.id === n.dataset.subPreview);
      if (!source) continue;
      try {
        const { canvas } = await renderCard(source, {
          back: n.dataset.back === "true",
        });
        if (!n.isConnected) return;
        n.width = 225;
        n.height = 312;
        n.getContext("2d").drawImage(canvas, 0, 0, n.width, n.height);
      } catch (err) {
        toast(err.message, true);
      }
    }
  }
  renderPreviews();
  form
    .querySelectorAll("[data-edit-source], [data-edit-source-back]")
    .forEach(
      (n) =>
        (n.onclick = () =>
          editSource(
            n.dataset.editSource || n.dataset.editSourceBack,
            !!n.dataset.editSourceBack,
          )),
    );
  form.querySelectorAll("[data-sub-copies]").forEach(
    (n) =>
      (n.onchange = () => {
        draft.cards[Number(n.dataset.subCopies)].copies = Math.max(
          1,
          Math.min(40, Number(n.value) || 1),
        );
        save();
        render();
      }),
  );
  form.querySelectorAll("[data-remove-sub-card]").forEach(
    (n) =>
      (n.onclick = () => {
        draft.cards.splice(Number(n.dataset.removeSubCard), 1);
        save();
        render();
      }),
  );
  form.querySelectorAll("[data-add-source]").forEach(
    (n) =>
      (n.onclick = async () => {
        const source = cards.find((c) => c.id === n.dataset.addSource);
        if (
          !source ||
          busy ||
          draft.remote ||
          draft.cards.some((c) => c.sourceId === source.id)
        )
          return;
        if (!source.name.trim()) {
          toast(
            t("Додайте назву карти в конструкторі перед надсиланням."),
            true,
          );
          editSource(source.id, false);
          return;
        }
        try {
          if (draft.cards.length >= 60)
            throw Error(t("Можна додати щонайбільше 60 різних карт."));
          busy = true;
          n.disabled = true;
          draft.cards.push({
            sourceId: source.id,
            name: source.name,
            copies: Math.max(1, Math.min(40, Number(source.copies) || 1)),
            data: await cardImage(source),
          });
          await saveDraft();
        } catch (err) {
          toast(err.message, true);
        } finally {
          busy = false;
          render();
        }
      }),
  );
  document.querySelector("#submission-back-source").onchange = async (ev) => {
    draft.backSourceId = ev.target.value;
    const source =
      draft.backSourceId === "__saved"
        ? null
        : cards.find((c) => c.id === draft.backSourceId) ||
          cards.find((c) => c.id === draft.cards[0]?.sourceId);
    busy = true;
    render();
    try {
      if (source) draft.back = await cardImage(source, true);
      await saveDraft();
    } catch (err) {
      toast(err.message, true);
    } finally {
      busy = false;
      render();
    }
  };
  document.querySelector("#submission-rules-pdf").onchange = async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    try {
      if (file.type !== "application/pdf" || file.size > 3 * 1024 * 1024)
        throw Error(t("Виберіть PDF розміром до 3 МБ."));
      draft.rulesPDF = { name: file.name, data: await dataURL(file) };
      await saveDraft();
      render();
    } catch (err) {
      toast(err.message, true);
    }
  };
  document
    .querySelector("#remove-submission-rules")
    ?.addEventListener("click", () => {
      draft.rulesPDF = null;
      save();
      render();
    });
  document
    .querySelector("#edit-submission-again")
    ?.addEventListener("click", () => {
      draft.remote = null;
      save();
      render();
    });
  document.querySelectorAll("[data-refresh-receipt]").forEach(
    (n) =>
      (n.onclick = async () => {
        n.disabled = true;
        try {
          const r = receipts[Number(n.dataset.refreshReceipt)];
          Object.assign(
            r,
            await communityRequest("receipt", { id: r.id, token: r.token }),
          );
          await saveDraft();
          await onCatalogChange();
          render();
        } catch (err) {
          toast(err.message, true);
          n.disabled = false;
        }
      }),
  );
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    if (busy) return;
    if (!draft.cards.length) {
      status(t("Додайте першу карту колоди."), true);
      return;
    }
    submissionError = "";
    busy = true;
    render();
    try {
      if (!draft.remote) {
        // Refresh snapshots from the editor so artwork, titles and the chosen
        // back always match what the author most recently saved.
        for (const entry of draft.cards) {
          const source = cards.find((c) => c.id === entry.sourceId);
          if (source) {
            if (!source.name.trim()) throw Error(t("Введіть назву карти"));
            entry.name = source.name;
            entry.data = await cardImage(source);
          }
        }
        const backSource =
          draft.backSourceId === "__saved"
            ? null
            : cards.find((c) => c.id === draft.backSourceId) ||
              cards.find((c) => c.id === draft.cards[0]?.sourceId);
        if (backSource) draft.back = await cardImage(backSource, true);
        draft.remote = await communityRequest("create", {
          method: "POST",
          body: {
            title: draft.title,
            author: draft.author,
            description: draft.description,
            rulesText: draft.rulesText,
            language: draft.language,
            rights: draft.rights,
            cards: draft.cards.map(({ name, copies }) => ({ name, copies })),
            customBack: !!draft.back,
            rulesPDF: !!draft.rulesPDF,
            website: form.elements.website.value,
          },
        });
        await saveDraft();
      }
      const { id, token } = draft.remote,
        uploads = draft.cards.map((c, i) => ({
          asset: "card-" + i,
          data: c.data,
        }));
      if (draft.back) uploads.push({ asset: "back", data: draft.back });
      if (draft.rulesPDF)
        uploads.push({ asset: "rules", data: draft.rulesPDF.data });
      const progress = document.querySelector("#submission-progress");
      progress.hidden = false;
      progress.max = uploads.length + 1;
      for (let i = 0; i < uploads.length; i++) {
        status(`${t("Завантаження")}: ${i + 1} / ${uploads.length}`);
        await communityRequest("upload", {
          method: "PUT",
          id,
          token,
          asset: uploads[i].asset,
          body: await (await fetch(uploads[i].data)).blob(),
        });
        progress.value = i + 1;
      }
      await communityRequest("submit", { method: "POST", id, token });
      receipts.unshift({ id, token, title: draft.title, status: "pending" });
      draft = emptyDraft();
      submissionError = "";
      await saveDraft();
      toast(
        t(
          "Колоду надіслано. Вона з’явиться в бібліотеці лише після схвалення.",
        ),
      );
    } catch (err) {
      submissionError = err.message;
      status(err.message, true);
      toast(err.message, true);
    } finally {
      busy = false;
      render();
    }
  };
}

let reviewState = { loading: false, auth: null, packs: [], error: "" };
let setupToken = "";
export function captureSetupToken() {
  const match = location.hash.match(/^#moderation\/setup\/([a-f0-9]{64})$/);
  if (match) {
    setupToken = match[1];
    history.replaceState(null, "", "#moderation");
  }
}
export function moderationView() {
  return `<main class="content-page community-page"><div class="page-heading"><div><div class="eyebrow">${t("МОДЕРАЦІЯ")}</div><h1>${t("Запропоновані колоди")}</h1></div><a href="#library">← ${t("Уся бібліотека")}</a></div><div id="moderation-content">${reviewState.auth === null ? `<p>${t("Завантаження")}…</p>` : reviewState.auth ? `<div class="moderation-toolbar"><button class="button ghost small" id="refresh-moderation">${t("Оновити")}</button><button class="text-button" id="logout-moderation">${t("Вийти")}</button></div>${reviewState.packs.map((p) => `<article class="community-panel review-pack"><div class="review-pack-heading"><div><h2 data-source-text>${e(p.title)}</h2><p data-source-text>${e(p.author)} · ${p.cards.length} ${t("різних карт")} · ${p.cards.reduce((n, c) => n + c.copies, 0)} ${t("примірників")}</p><p data-source-text>${e(p.subtitle)}</p><p>${statusLabel(p.status)}</p></div></div><div class="review-cards">${[...p.cards, ...p.pages].map((c) => `<button type="button" class="review-card" data-review-asset="${e(c.id)}" data-review-pack="${e(p.id)}"><img src="${e(c.image)}" alt="${e(c.name)}" loading="lazy"><span data-source-text>${e(c.name)}</span>${c.copies ? `<small>${c.copies} ${t("коп.")}</small>` : ""}</button>`).join("")}</div>${p.rulesDocuments.length ? `<button type="button" class="button ghost small" data-review-rules="${e(p.id)}">${t("Прочитати правила")}</button>` : ""}<label class="field"><span>${t("Коментар автору")}</span><textarea data-review-note="${e(p.id)}" maxlength="1000">${e(p.decisionNote)}</textarea></label><div class="review-actions">${p.status !== "approved" ? `<button class="button primary" data-decision="approved" data-decision-id="${e(p.id)}">${t("Схвалити та опублікувати")}</button>` : `<a class="button ghost" href="#library/${e(p.id)}">${t("Відкрити колоду")}</a><button class="button ghost" data-decision="pending" data-decision-id="${e(p.id)}">${t("Приховати з бібліотеки")}</button>`}${p.status !== "rejected" ? `<button class="button ghost" data-decision="rejected" data-decision-id="${e(p.id)}">${t("Відхилити")}</button>` : ""}<span role="status" data-decision-status="${e(p.id)}"></span></div></article>`).join("") || `<p class="empty-state">${t("Заявок поки немає.")}</p>`}` : `<form id="moderation-login" class="community-panel moderation-login"><h2>${t(setupToken ? "Створити пароль адміністратора" : "Вхід для власника")}</h2><label class="field"><span>${t("Пароль")}</span><input id="moderation-password" type="password" autocomplete="${setupToken ? "new-password" : "current-password"}" minlength="${setupToken ? 12 : 1}" maxlength="200" required></label>${setupToken ? `<p class="muted">${t("Щонайменше 12 символів. Цей пароль потрібен лише для модерації.")}</p>` : ""}<button class="button primary">${t(setupToken ? "Зберегти пароль" : "Увійти")}</button><p id="moderation-login-error" role="alert"></p></form>`}${reviewState.error ? `<p role="alert">${e(reviewState.error)}</p>` : ""}</div></main>`;
}
export function bindModeration({
  render,
  toast,
  onCatalogChange,
  showAsset,
  showRules,
}) {
  if (!document.querySelector("#moderation-content")) return;
  async function load() {
    if (reviewState.loading) return;
    reviewState.loading = true;
    try {
      reviewState.auth = (await communityRequest("auth")).authenticated;
      if (reviewState.auth)
        reviewState.packs = (await communityRequest("review")).packs;
      reviewState.error = "";
    } catch (err) {
      reviewState.auth = false;
      reviewState.error = err.message;
    } finally {
      reviewState.loading = false;
      if (location.hash === "#moderation") render();
    }
  }
  if (reviewState.auth === null) {
    load();
    return;
  }
  const toolbar = document.querySelector(".moderation-toolbar");
  if (toolbar) {
    const change = document.createElement("button");
    change.className = "button ghost small";
    change.textContent = t("Змінити пароль");
    toolbar.append(change);
    change.onclick = () => {
      const dialog = document.createElement("dialog");
      dialog.className = "print-dialog";
      dialog.innerHTML = `<form id="change-password-form"><h2>${t("Змінити пароль")}</h2><label class="field"><span>${t("Новий пароль")}</span><input type="password" name="password" minlength="12" maxlength="200" autocomplete="new-password" required></label><p class="muted">${t("Щонайменше 12 символів. Цей пароль потрібен лише для модерації.")}</p><p role="alert"></p><button class="button primary">${t("Зберегти пароль")}</button> <button class="button ghost" type="button">${t("Закрити")}</button></form>`;
      document.body.append(dialog);
      dialog.showModal();
      dialog.onclose = () => dialog.remove();
      dialog.querySelector("[type=button]").onclick = () => dialog.close();
      dialog.querySelector("form").onsubmit = async (ev) => {
        ev.preventDefault();
        const button = dialog.querySelector(".primary");
        button.disabled = true;
        try {
          await communityRequest("password", {
            method: "POST",
            body: { password: dialog.querySelector("[name=password]").value },
          });
          dialog.close();
          toast(t("Пароль змінено."));
        } catch (err) {
          dialog.querySelector("[role=alert]").textContent = err.message;
          button.disabled = false;
        }
      };
    };
  }
  for (const p of reviewState.packs.filter((p) => p.status === "rejected")) {
    const actions = document.querySelector(
      `[data-decision-status="${p.id}"]`,
    )?.parentElement;
    if (!actions) continue;
    const button = document.createElement("button");
    button.className = "text-button danger";
    button.textContent = t("Видалити заявку та файли");
    actions.append(button);
    button.onclick = async () => {
      if (!confirm(t("Видалити цю відхилену заявку та її файли назавжди?")))
        return;
      button.disabled = true;
      try {
        await communityRequest("delete", { method: "POST", id: p.id });
        reviewState.packs = reviewState.packs.filter(
          (pack) => pack.id !== p.id,
        );
        render();
      } catch (err) {
        toast(err.message, true);
        button.disabled = false;
      }
    };
  }
  document
    .querySelector("#refresh-moderation")
    ?.addEventListener("click", load);
  document
    .querySelector("#logout-moderation")
    ?.addEventListener("click", async () => {
      await communityRequest("logout", { method: "POST" });
      reviewState.auth = false;
      reviewState.packs = [];
      render();
    });
  document
    .querySelector("#moderation-login")
    ?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const button = ev.target.querySelector("button");
      button.disabled = true;
      try {
        await communityRequest(setupToken ? "setup" : "login", {
          method: "POST",
          body: {
            password: document.querySelector("#moderation-password").value,
            ...(setupToken ? { token: setupToken } : {}),
          },
        });
        setupToken = "";
        await load();
      } catch (err) {
        document.querySelector("#moderation-login-error").textContent =
          err.message;
        button.disabled = false;
      }
    });
  document.querySelectorAll("[data-review-asset]").forEach(
    (n) =>
      (n.onclick = () => {
        const pack = reviewState.packs.find(
          (p) => p.id === n.dataset.reviewPack,
        );
        showAsset(
          pack,
          [...pack.cards, ...pack.pages].find(
            (c) => c.id === n.dataset.reviewAsset,
          ),
        );
      }),
  );
  document
    .querySelectorAll("[data-review-rules]")
    .forEach(
      (n) =>
        (n.onclick = () =>
          showRules(
            reviewState.packs.find((p) => p.id === n.dataset.reviewRules),
          )),
    );
  document.querySelectorAll("[data-decision]").forEach(
    (n) =>
      (n.onclick = async () => {
        const id = n.dataset.decisionId;
        const buttons = [
          ...document.querySelectorAll(`[data-decision-id="${id}"]`),
        ];
        buttons.forEach((b) => (b.disabled = true));
        try {
          const result = await communityRequest("decide", {
            method: "POST",
            id,
            body: {
              status: n.dataset.decision,
              note: document.querySelector(`[data-review-note="${id}"]`).value,
            },
          });
          reviewState.packs = reviewState.packs.map((p) =>
            p.id === id ? result.pack : p,
          );
          await onCatalogChange();
          render();
          toast(t("Рішення збережено."));
        } catch (err) {
          toast(err.message, true);
          buttons.forEach((b) => (b.disabled = false));
        }
      }),
  );
}
