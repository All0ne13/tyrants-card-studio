import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('C:/Users/Vladislav/node_modules/playwright');
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.CARD_STUDIO_URL || 'http://127.0.0.1:4188/');
  const schoolField = page.locator('[data-key="secondaryAspectText"]');
  await schoolField.evaluate(node => node.closest('details').open = true);
  for (const school of ['abjuration', 'necromancy', 'illusion', 'enchantment', 'evocation', 'divination', 'conjuration', 'transmutation', 'any']) {
    await page.locator(`[data-arcane-school="${school}"]`).click();
    await page.waitForFunction(() => document.querySelector('[data-key="secondaryAspectText"]')?.value);
    assert.ok(await schoolField.inputValue());
  }
  await page.locator('[data-key="name"]').fill('Prodigious Novice Arcanist');
  await page.locator('[data-key="type"]').fill('Wizard');
  await page.locator('[data-key="aspectText"]').fill('Obedience');
  await page.locator('[data-key="cost"]').fill('2');
  await page.locator('[data-key="deckVP"]').fill('*');
  await page.locator('[data-key="innerVP"]').fill('2*');
  await page.locator('[data-deck-mark="wizards"]').click();
  await page.waitForTimeout(800);
  await page.reload();
  assert.equal(await schoolField.inputValue(), 'Any Arcana');
  assert.equal(await page.locator('[data-key="deckVP"]').inputValue(), '*');
  const download = page.waitForEvent('download');
  await page.locator('[data-export="png"]').click();
  const file = await download;
  await file.saveAs('.preview/wizards-school-export.png');
  await schoolField.evaluate(node => node.closest('details').open = true);
  await page.screenshot({ path: '.preview/wizards-original-schools.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('Nine school presets, persistence and PNG export with starred points passed.');
} finally { await browser.close(); }
