import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  createDeckService,
  validateSubmission,
  LIMITS,
} from "../server/decks-service.js";
import { MemoryStore } from "./helpers/memory-store.mjs";
import { libraryPrintPlan } from "../src/library-print-plan.js";
const image = readFileSync(
  new URL(
    "../dist/assets/library/wizards/wizards-prodigious-novice-arcanist.webp",
    import.meta.url,
  ),
);
const setupToken = "a".repeat(64),
  password = "local-test-password-only";
const metadata = (count = 30) => ({
  title: "Thirty cards",
  author: "A community author",
  description: "Fan deck",
  rulesText:
    "Use the normal turn order.\n\nNew actions are printed on the cards.",
  language: "en",
  rights: true,
  cards: Array.from({ length: count }, (_, i) => ({
    name: "Card " + (i + 1),
    copies: 1,
  })),
  customBack: true,
  rulesPDF: false,
});
function fixture() {
  const store = new MemoryStore();
  const handle = createDeckService(store, {
    secret: "local-test-session-secret",
    setupHash: createHash("sha256").update(setupToken).digest("hex"),
  });
  return {
    store,
    handle,
    request: async (
      route,
      {
        method = "GET",
        body,
        id,
        asset,
        token,
        cookie,
        origin = "https://cards.test",
        ip = "test-user",
      } = {},
    ) => {
      const url = new URL("https://cards.test/.netlify/functions/decks");
      url.searchParams.set("route", route);
      if (id) url.searchParams.set("id", id);
      if (asset) url.searchParams.set("asset", asset);
      const headers = {
        origin,
        ...(cookie ? { cookie } : {}),
        ...(token ? { "x-submission-token": token } : {}),
      };
      return handle(
        new Request(url, {
          method,
          headers,
          ...(body
            ? { body: Buffer.isBuffer(body) ? body : JSON.stringify(body) }
            : {}),
        }),
        { ip },
      );
    },
  };
}
async function owner(f) {
  const response = await f.request("setup", {
    method: "POST",
    body: { token: setupToken, password },
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly; Secure; SameSite=Strict/);
  return cookie.split(";")[0];
}
test("30-card proposal stays private, is approved by the owner, then uses the existing library print plan", async () => {
  const f = fixture(),
    cookie = await owner(f);
  const created = await f.request("create", {
    method: "POST",
    body: metadata(),
  });
  assert.equal(created.status, 201);
  const { id, token } = await created.json();
  assert.deepEqual((await (await f.request("catalog")).json()).packs, []);
  assert.equal(
    (
      await f.request("decide", {
        method: "POST",
        id,
        body: { status: "approved" },
      })
    ).status,
    401,
  );
  assert.equal(
    (await f.request("submit", { method: "POST", id, token })).status,
    400,
  );
  for (let i = 0; i < 30; i++)
    assert.equal(
      (
        await f.request("upload", {
          method: "PUT",
          id,
          token,
          asset: "card-" + i,
          body: image,
        })
      ).status,
      200,
    );
  assert.equal(
    (
      await f.request("upload", {
        method: "PUT",
        id,
        token,
        asset: "back",
        body: image,
      })
    ).status,
    200,
  );
  assert.equal((await f.request("image", { id, asset: "card-0" })).status, 404);
  assert.equal(
    (await f.request("submit", { method: "POST", id, token })).status,
    200,
  );
  assert.equal(
    (await f.request("image", { id, asset: "card-0", cookie })).status,
    200,
  );
  const queue = (await (await f.request("review", { cookie })).json()).packs;
  assert.equal(queue.length, 1);
  assert.equal(queue[0].cards.length, 30);
  assert.equal(queue[0].status, "pending");
  assert.equal(JSON.stringify(queue).includes("tokenHash"), false);
  assert.equal(
    (
      await f.request("decide", {
        method: "POST",
        id,
        cookie,
        body: { status: "approved", note: "Ready to print" },
      })
    ).status,
    200,
  );
  const packs = (await (await f.request("catalog")).json()).packs;
  assert.equal(packs.length, 1);
  assert.equal(packs[0].cards.length, 30);
  assert.equal(packs[0].rulesDocuments[0].format, "article");
  const plan = libraryPrintPlan(packs[0]);
  assert.equal(plan.cards.length, 30);
  assert.match(plan.back, /asset=back/);
  assert.equal((await f.request("image", { id, asset: "card-0" })).status, 200);
  const receipt = await (await f.request("receipt", { id, token })).json();
  assert.equal(receipt.status, "approved");
  assert.equal(receipt.decisionNote, "Ready to print");
  assert.equal(
    (
      await f.request("decide", {
        method: "POST",
        id,
        cookie,
        body: { status: "pending" },
      })
    ).status,
    200,
  );
  assert.equal((await (await f.request("catalog")).json()).packs.length, 0);
  assert.equal((await f.request("image", { id, asset: "card-0" })).status, 404);
  assert.equal(
    (
      await f.request("decide", {
        method: "POST",
        id,
        cookie,
        body: { status: "rejected", note: "Please update the rules" },
      })
    ).status,
    200,
  );
  assert.equal(
    (await (await f.request("receipt", { id, token })).json()).status,
    "rejected",
  );
});
test("setup, sessions, submission ownership, file types and cross-origin requests are enforced on the server", async () => {
  const f = fixture();
  assert.equal(
    (
      await f.request("setup", {
        method: "POST",
        body: { token: "wrong", password },
      })
    ).status,
    403,
  );
  const cookie = await owner(f);
  assert.equal(
    (
      await f.request("setup", {
        method: "POST",
        body: { token: setupToken, password },
      })
    ).status,
    409,
  );
  assert.equal(
    (await f.request("review", { cookie: cookie + "changed" })).status,
    401,
  );
  assert.equal(
    (await f.request("login", { method: "POST", body: { password: "wrong" } }))
      .status,
    401,
  );
  assert.equal(
    (await f.request("login", { method: "POST", body: { password } })).status,
    200,
  );
  assert.equal(
    (
      await f.request("create", {
        method: "POST",
        body: metadata(1),
        origin: "https://bad.test",
      })
    ).status,
    403,
  );
  const { id, token } = await (
    await f.request("create", { method: "POST", body: metadata(1) })
  ).json();
  assert.equal(
    (
      await f.request("upload", {
        method: "PUT",
        id,
        token: "wrong",
        asset: "card-0",
        body: image,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await f.request("upload", {
        method: "PUT",
        id,
        token,
        asset: "card-0",
        body: Buffer.from("<svg><script>bad</script></svg>"),
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request("upload", {
        method: "PUT",
        id,
        token,
        asset: "card-99",
        body: image,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request("upload", {
        method: "PUT",
        id,
        token,
        asset: "card-0",
        body: Buffer.alloc(LIMITS.image + 1),
      })
    ).status,
    400,
  );
  assert.equal(
    (await f.request("receipt", { id, token: "wrong" })).status,
    403,
  );
  assert.equal(
    (
      await f.request("create", {
        method: "POST",
        body: { ...metadata(1), rights: false },
      })
    ).status,
    400,
  );
  assert.throws(() =>
    validateSubmission({
      ...metadata(1),
      cards: [{ name: "test", copies: 0 }],
    }),
  );
});
test("atomic quotas constrain anonymous draft creation and retries do not duplicate uploaded cards", async () => {
  const f = fixture();
  await owner(f);
  for (let i = 0; i < LIMITS.submissionsPerIP; i++)
    assert.equal(
      (await f.request("create", { method: "POST", body: metadata(1) })).status,
      201,
    );
  assert.equal(
    (await f.request("create", { method: "POST", body: metadata(1) })).status,
    429,
  );
  const { id, token } = await (
    await f.request("create", {
      method: "POST",
      body: { ...metadata(1), customBack: false },
      ip: "another-user",
    })
  ).json();
  for (let i = 0; i < 2; i++)
    assert.equal(
      (
        await f.request("upload", {
          method: "PUT",
          id,
          token,
          asset: "card-0",
          body: image,
        })
      ).status,
      200,
    );
  for (let i = 0; i < 2; i++)
    assert.equal(
      (await f.request("submit", { method: "POST", id, token })).status,
      200,
    );
  assert.equal(
    Object.keys((await f.store.get("deck/" + id, { type: "json" })).uploads)
      .length,
    1,
  );
});

test("repeated legitimate submissions no longer hit the old three-draft cap, and limits explain the actual failure", async () => {
  const f = fixture();
  await owner(f);
  for (let i = 0; i < 4; i++) {
    assert.equal(
      (await f.request("create", { method: "POST", body: metadata(1) })).status,
      201,
    );
  }
  for (let i = 4; i < LIMITS.submissionsPerIP; i++) {
    assert.equal(
      (await f.request("create", { method: "POST", body: metadata(1) })).status,
      201,
    );
  }
  const limited = await f.request("create", {
    method: "POST",
    body: metadata(1),
  });
  assert.equal(limited.status, 429);
  assert.match((await limited.json()).error, /daily submission limit/);
  assert.equal(
    (
      await f.request("create", {
        method: "POST",
        body: metadata(1),
        ip: "different-author",
      })
    ).status,
    201,
  );
  const global = [...f.store.entries.keys()].find(
    (key) => key.startsWith("rate/create/") && key.endsWith("/all"),
  );
  await f.store.setJSON(global, { value: LIMITS.submissionsPerDay });
  const capacity = await f.request("create", {
    method: "POST",
    body: metadata(1),
    ip: "third-author",
  });
  assert.equal(capacity.status, 429);
  assert.match((await capacity.json()).error, /submissions are busy/);
});
test("password changes invalidate old sessions and rules PDFs use the same publication gate", async () => {
  const f = fixture(),
    oldCookie = await owner(f);
  const changed = await f.request("password", {
    method: "POST",
    cookie: oldCookie,
    body: { password: "replacement-owner-password" },
  });
  assert.equal(changed.status, 200);
  const cookie = changed.headers.get("set-cookie").split(";")[0];
  assert.equal((await f.request("review", { cookie: oldCookie })).status, 401);
  assert.equal((await f.request("review", { cookie })).status, 200);
  const { id, token } = await (
    await f.request("create", {
      method: "POST",
      body: { ...metadata(1), customBack: false, rulesPDF: true },
    })
  ).json();
  assert.equal(
    (
      await f.request("upload", {
        method: "PUT",
        id,
        token,
        asset: "rules",
        body: Buffer.from("not a PDF"),
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request("upload", {
        method: "PUT",
        id,
        token,
        asset: "rules",
        body: Buffer.from("%PDF-1.4\n%%EOF"),
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await f.request("upload", {
        method: "PUT",
        id,
        token,
        asset: "card-0",
        body: image,
      })
    ).status,
    200,
  );
  assert.equal(
    (await f.request("submit", { method: "POST", id, token })).status,
    200,
  );
  assert.equal((await f.request("image", { id, asset: "rules" })).status, 404);
  await f.request("decide", {
    method: "POST",
    id,
    cookie,
    body: { status: "approved" },
  });
  const pdf = await f.request("image", { id, asset: "rules" });
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get("content-type"), "application/pdf");
  assert.equal(
    (await f.request("delete", { method: "POST", id, cookie })).status,
    409,
  );
  await f.request("decide", {
    method: "POST",
    id,
    cookie,
    body: { status: "rejected" },
  });
  assert.equal(
    (await f.request("delete", { method: "POST", id, cookie })).status,
    200,
  );
  assert.equal(
    (await f.request("image", { id, asset: "rules", cookie })).status,
    404,
  );
});
