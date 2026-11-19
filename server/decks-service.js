import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

export const LIMITS = {
  cards: 60,
  image: 2 * 1024 * 1024,
  pdf: 3 * 1024 * 1024,
  deck: 32 * 1024 * 1024,
};
const cookieName = "__Host-underdark-admin";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const equal = (a, b) =>
  typeof a === "string" &&
  typeof b === "string" &&
  a.length === b.length &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));
const fail = (message, status = 400) => {
  const error = Error(message);
  error.status = status;
  throw error;
};
const idPattern = /^[a-f0-9-]{36}$/;
const assetPattern = /^(card-\d{1,2}|back|rules)$/;
const clean = (value, max, required = false) => {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    fail("Please check the required fields and their length.");
  return value.trim();
};
export function validateSubmission(input) {
  if (!input || input.website || input.rights !== true)
    fail("Confirm that you have permission to share these materials.");
  if (
    !Array.isArray(input.cards) ||
    !input.cards.length ||
    input.cards.length > LIMITS.cards
  )
    fail("Choose between 1 and 60 cards.");
  return {
    title: clean(input.title, 100, true),
    author: clean(input.author, 100, true),
    description: clean(input.description || "", 1000),
    rulesText: clean(input.rulesText || "", 20000),
    language: ["en", "uk", "other"].includes(input.language)
      ? input.language
      : "en",
    customBack: input.customBack === true,
    rulesPDF: input.rulesPDF === true,
    cards: input.cards.map((card, index) => {
      if (!Number.isInteger(card.copies) || card.copies < 1 || card.copies > 40)
        fail("Each card needs between 1 and 40 copies.");
      return {
        key: "card-" + index,
        name: clean(card.name, 100, true),
        copies: card.copies,
      };
    }),
  };
}
export function validateUpload(bytes, asset) {
  const max = asset === "rules" ? LIMITS.pdf : LIMITS.image;
  if (!bytes.length || bytes.length > max)
    fail("The uploaded file is too large.");
  if (asset === "rules") {
    if (bytes.subarray(0, 5).toString() !== "%PDF-")
      fail("Rules must be a PDF file.");
    return "application/pdf";
  }
  // The browser re-encodes uploads, stripping original metadata and active formats.
  if (
    bytes.subarray(0, 4).toString() !== "RIFF" ||
    bytes.subarray(8, 12).toString() !== "WEBP" ||
    bytes.readUInt32LE(4) !== bytes.length - 8
  )
    fail("Upload a valid card image.");
  return "image/webp";
}
export function deckPack(deck, { review = false } = {}) {
  const url = (asset) =>
    `/.netlify/functions/decks?route=image&id=${deck.id}&asset=${asset}`;
  const cards = deck.cards.map((card) => ({
    id: deck.id + "-" + card.key,
    name: card.name,
    kind: "market",
    copies: card.copies,
    image: url(card.key),
    extension: "webp",
  }));
  const rulesDocuments = deck.rulesPDF
    ? [
        {
          id: deck.id + "-rules",
          title: deck.title,
          format: "pdf",
          sourceUrl: url("rules"),
          language: deck.language,
        },
      ]
    : deck.rulesText
      ? [
          {
            id: deck.id + "-rules",
            title: deck.title,
            format: "article",
            sourceUrl: "#rules/" + deck.id + "-rules",
            language: deck.language,
            blocks: deck.rulesText
              .split(/\n\s*\n/)
              .filter(Boolean)
              .map((text) => ({ type: "paragraph", text })),
          },
        ]
      : [];
  return {
    id: deck.id,
    title: deck.title,
    subtitle: deck.description || deck.author,
    author: deck.author,
    category: "decks",
    community: true,
    cover: cards[0].image,
    cards,
    pages: deck.customBack
      ? [
          {
            id: deck.id + "-back",
            name: deck.title + " — card back",
            kind: "back",
            image: url("back"),
            extension: "webp",
          },
        ]
      : [],
    rulesDocuments,
    files: [],
    ...(review
      ? {
          status: deck.status,
          createdAt: deck.createdAt,
          submittedAt: deck.submittedAt,
          decisionNote: deck.decisionNote || "",
        }
      : {}),
  };
}

export function createDeckService(
  store,
  { secret, setupHash, now = () => Date.now() } = {},
) {
  const json = (data, status = 200, extra = {}) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        ...extra,
      },
    });
  const get = (key) => store.get(key, { type: "json", consistency: "strong" });
  const set = (key, value, options) => store.setJSON(key, value, options);
  async function reserve(key, amount, maximum) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const item = await store.getWithMetadata(key, {
        type: "json",
        consistency: "strong",
      });
      const value = (item?.data?.value || 0) + amount;
      if (value > maximum)
        fail("Upload limit reached. Please try again later.", 429);
      const result = await set(
        key,
        { value },
        item ? { onlyIfMatch: item.etag } : { onlyIfNew: true },
      );
      if (result.modified) return;
    }
    fail("Please try again in a moment.", 409);
  }
  async function list(prefix) {
    const result = await store.list({ prefix });
    return Promise.all(result.blobs.map((blob) => get(blob.key)));
  }
  const sessionCookie = (credential) => {
    const payload = Buffer.from(
      JSON.stringify({ exp: now() + 8 * 3600000, version: credential.version }),
    ).toString("base64url");
    const sig = createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");
    return `${cookieName}=${payload}.${sig}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`;
  };
  async function isAdmin(request) {
    const cookie = request.headers
      .get("cookie")
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(cookieName + "="))
      ?.slice(cookieName.length + 1);
    if (!cookie || cookie.length > 600) return false;
    const [payload, sig] = cookie.split(".");
    if (
      !sig ||
      !equal(
        sig,
        createHmac("sha256", secret).update(payload).digest("base64url"),
      )
    )
      return false;
    try {
      const data = JSON.parse(Buffer.from(payload, "base64url").toString());
      const credential = await get("admin/credential");
      return data.exp > now() && data.version === credential?.version;
    } catch {
      return false;
    }
  }
  async function owned(request, id) {
    const deck = await get("deck/" + id);
    if (!deck) fail("Submission not found.", 404);
    const token = request.headers.get("x-submission-token") || "";
    if (!equal(hash(token), deck.tokenHash))
      fail("Submission access denied.", 403);
    return deck;
  }
  async function updateDeck(deck, changes) {
    const current = await store.getWithMetadata("deck/" + deck.id, {
      type: "json",
      consistency: "strong",
    });
    if (!current || current.data.status !== deck.status)
      fail("This submission has changed. Reload it and try again.", 409);
    const updated = { ...current.data, ...changes };
    if (
      !(await set("deck/" + deck.id, updated, { onlyIfMatch: current.etag }))
        .modified
    )
      fail("This submission has changed. Reload it and try again.", 409);
    return updated;
  }
  return async function handle(request, { ip = "unknown" } = {}) {
    try {
      if (!secret)
        fail("Community submissions are temporarily unavailable.", 503);
      const u = new URL(request.url),
        route = u.searchParams.get("route") || "catalog";
      const id = u.searchParams.get("id"),
        asset = u.searchParams.get("asset");
      if (id && !idPattern.test(id)) fail("Invalid submission.", 404);
      if (request.method !== "GET") {
        if (!["POST", "PUT"].includes(request.method))
          fail("Method not allowed.", 405);
        if (request.headers.get("origin") !== u.origin)
          fail("This request is not allowed.", 403);
      }
      const day = new Date(now()).toISOString().slice(0, 10),
        ipHash = createHmac("sha256", secret)
          .update(ip)
          .digest("hex")
          .slice(0, 32);
      if (route === "auth" && request.method === "GET")
        return json({
          authenticated: await isAdmin(request),
          setupRequired: !(await get("admin/credential")),
        });
      if (route === "setup" && request.method === "POST") {
        await reserve("rate/setup/" + day + "/" + ipHash, 1, 10);
        const input = await request.json();
        if (!setupHash || !equal(hash(String(input.token || "")), setupHash))
          fail("This setup link is not valid.", 403);
        if (
          typeof input.password !== "string" ||
          input.password.length < 12 ||
          input.password.length > 200
        )
          fail("Use a password with at least 12 characters.");
        const salt = randomBytes(24).toString("hex");
        const credential = {
          salt,
          hash: scryptSync(input.password, salt, 64).toString("hex"),
          version: randomUUID(),
        };
        if (
          !(await set("admin/credential", credential, { onlyIfNew: true }))
            .modified
        )
          fail("The administrator account is already configured.", 409);
        return json({ authenticated: true }, 200, {
          "Set-Cookie": sessionCookie(credential),
        });
      }
      if (route === "login" && request.method === "POST") {
        await reserve(
          "rate/login/" + Math.floor(now() / 900000) + "/" + ipHash,
          1,
          10,
        );
        const input = await request.json(),
          credential = await get("admin/credential");
        if (
          typeof input.password !== "string" ||
          input.password.length > 200 ||
          !credential ||
          !equal(
            scryptSync(input.password, credential.salt, 64).toString("hex"),
            credential.hash,
          )
        )
          fail("Incorrect password.", 401);
        return json({ authenticated: true }, 200, {
          "Set-Cookie": sessionCookie(credential),
        });
      }
      if (route === "logout" && request.method === "POST")
        return json({ authenticated: false }, 200, {
          "Set-Cookie": `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
        });
      if (route === "password" && request.method === "POST") {
        if (!(await isAdmin(request)))
          fail("Sign in to review submissions.", 401);
        const input = await request.json();
        if (
          typeof input.password !== "string" ||
          input.password.length < 12 ||
          input.password.length > 200
        )
          fail("Use a password with at least 12 characters.");
        const salt = randomBytes(24).toString("hex");
        const credential = {
          salt,
          hash: scryptSync(input.password, salt, 64).toString("hex"),
          version: randomUUID(),
        };
        await set("admin/credential", credential);
        return json({ authenticated: true }, 200, {
          "Set-Cookie": sessionCookie(credential),
        });
      }
      if (route === "catalog" && request.method === "GET") {
        const index = await list("published/");
        const decks = await Promise.all(
          index.filter(Boolean).map((d) => get("deck/" + d.id)),
        );
        return json({
          packs: decks
            .filter((d) => d?.status === "approved")
            .map((d) => deckPack(d)),
        });
      }
      if (route === "create" && request.method === "POST") {
        if (!(await get("admin/credential")))
          fail(
            "The owner is setting up submissions. Please try again later.",
            503,
          );
        if (Number(request.headers.get("content-length")) > 100000)
          fail("Submission details are too large.", 413);
        const data = validateSubmission(await request.json());
        await reserve("rate/create/" + day + "/" + ipHash, 1, 3);
        await reserve("rate/create/" + day + "/all", 1, 10);
        const token = randomBytes(32).toString("hex"),
          id = randomUUID();
        const deck = {
          ...data,
          id,
          status: "draft",
          createdAt: now(),
          tokenHash: hash(token),
          uploads: {},
        };
        await set("deck/" + id, deck, { onlyIfNew: true });
        return json({ id, token }, 201);
      }
      if (route === "upload" && request.method === "PUT") {
        if (!id || !assetPattern.test(asset || "")) fail("Invalid upload.");
        const deck = await owned(request, id);
        if (deck.status !== "draft" || now() - deck.createdAt > 7 * 86400000)
          fail("This submission cannot be edited.", 409);
        if (
          !deck.cards.some((c) => c.key === asset) &&
          !(asset === "back" && deck.customBack) &&
          !(asset === "rules" && deck.rulesPDF)
        )
          fail("Unexpected file.");
        if (deck.uploads[asset]) return json({ uploaded: true });
        const cap = asset === "rules" ? LIMITS.pdf : LIMITS.image;
        if (Number(request.headers.get("content-length")) > cap)
          fail("The uploaded file is too large.", 413);
        const bytes = Buffer.from(await request.arrayBuffer()),
          type = validateUpload(bytes, asset);
        const size =
          Object.values(deck.uploads).reduce((n, a) => n + a.size, 0) +
          bytes.length;
        if (size > LIMITS.deck)
          fail("The deck exceeds the 32 MB upload limit.", 413);
        await reserve("bytes/" + day, bytes.length, 100 * 1024 * 1024);
        await reserve("bytes/total", bytes.length, 1024 * 1024 * 1024);
        await store.set("image/" + id + "/" + asset, bytes, {
          metadata: { type },
          onlyIfNew: true,
        });
        await updateDeck(deck, {
          uploads: { ...deck.uploads, [asset]: { size: bytes.length, type } },
        });
        return json({ uploaded: true });
      }
      if (route === "submit" && request.method === "POST") {
        const deck = await owned(request, id);
        if (deck.status === "pending") return json({ id, status: "pending" });
        if (deck.status !== "draft")
          fail("This submission has already been reviewed.", 409);
        const expected = [
          ...deck.cards.map((c) => c.key),
          ...(deck.customBack ? ["back"] : []),
          ...(deck.rulesPDF ? ["rules"] : []),
        ];
        if (expected.some((key) => !deck.uploads[key]))
          fail("Wait for all files to finish uploading.");
        await updateDeck(deck, { status: "pending", submittedAt: now() });
        return json({ id, status: "pending" });
      }
      if (route === "receipt" && request.method === "GET") {
        const d = await owned(request, id);
        return json({
          id: d.id,
          title: d.title,
          status: d.status,
          decisionNote: d.decisionNote || "",
        });
      }
      if (route === "image" && request.method === "GET") {
        if (!id || !assetPattern.test(asset || ""))
          fail("File not found.", 404);
        const deck = await get("deck/" + id);
        if (!deck || (deck.status !== "approved" && !(await isAdmin(request))))
          fail("File not found.", 404);
        if (!deck.uploads[asset]) fail("File not found.", 404);
        const data = await store.get("image/" + id + "/" + asset, {
          type: "arrayBuffer",
          consistency: "strong",
        });
        if (!data) fail("File not found.", 404);
        return new Response(data, {
          headers: {
            "Content-Type": deck.uploads[asset].type,
            "X-Content-Type-Options": "nosniff",
            "Cache-Control":
              deck.status === "approved"
                ? "public,max-age=300"
                : "private,no-store",
            "Content-Disposition": `inline; filename="${asset}.${asset === "rules" ? "pdf" : "webp"}"`,
            "Content-Security-Policy": "default-src 'none'; sandbox",
          },
        });
      }
      if (route === "review" && request.method === "GET") {
        if (!(await isAdmin(request)))
          fail("Sign in to review submissions.", 401);
        const decks = await list("deck/");
        return json({
          packs: decks
            .filter((d) => d && d.status !== "draft")
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((d) => deckPack(d, { review: true })),
        });
      }
      if (route === "decide" && request.method === "POST") {
        if (!(await isAdmin(request)))
          fail("Sign in to review submissions.", 401);
        const input = await request.json();
        if (!["approved", "rejected", "pending"].includes(input.status))
          fail("Invalid decision.");
        const deck = await get("deck/" + id);
        if (!deck || deck.status === "draft")
          fail("Submission not found.", 404);
        const updated = await updateDeck(deck, {
          status: input.status,
          decisionNote: clean(input.note || "", 1000),
          reviewedAt: now(),
        });
        if (updated.status === "approved") await set("published/" + id, { id });
        else await store.delete("published/" + id);
        return json({ pack: deckPack(updated, { review: true }) });
      }
      if (route === "delete" && request.method === "POST") {
        if (!(await isAdmin(request)))
          fail("Sign in to review submissions.", 401);
        const deck = await get("deck/" + id);
        if (!deck || deck.status !== "rejected")
          fail("Only declined submissions can be deleted.", 409);
        await store.delete("published/" + id);
        for (const asset of Object.keys(deck.uploads))
          await store.delete("image/" + id + "/" + asset);
        await store.delete("deck/" + id);
        return json({ deleted: true });
      }
      fail("Not found.", 404);
    } catch (error) {
      if (!error.status) console.error("Community API failed:", error.name);
      return json(
        {
          error: error.status
            ? error.message
            : "Could not complete the request. Please try again.",
        },
        error.status || 500,
      );
    }
  };
}
