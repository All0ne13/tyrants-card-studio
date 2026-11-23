import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { ARCANE_SCHOOLS } from '../src/arcane-schools.js';
import { blankCard, validateCard } from '../src/model.js';

test('all nine author-supplied Arcane Schools have bundled images', () => {
  assert.equal(Object.keys(ARCANE_SCHOOLS).length, 9);
  for (const school of Object.values(ARCANE_SCHOOLS)) {
    assert.ok(existsSync(new URL(`../dist/${school.image}`, import.meta.url)));
  }
});

test('school selection, translated name and ASCII star points survive project import', () => {
  const card = validateCard({ ...blankCard(), secondaryAspectSchool: 'necromancy',
    secondaryAspectText: 'Некромантія', deckVP: '*', innerVP: '2*' });
  assert.equal(card.secondaryAspectSchool, 'necromancy');
  assert.equal(card.secondaryAspectText, 'Некромантія');
  assert.equal(card.deckVP, '*');
  assert.equal(card.innerVP, '2*');
  assert.equal(validateCard({ ...card, secondaryAspectSchool: '../external' }).secondaryAspectSchool, '');
});
