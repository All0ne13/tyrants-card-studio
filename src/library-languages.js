// Every translation owns its assets. Never fall back to an original language's
// cards, rules or print files while labelling them as a translation.
export function expandLanguageVersions(packs) {
  return packs.flatMap((pack) => {
    const versions = [
      { id: pack.id, language: pack.language || "en", label: pack.languageLabel || "English" },
      ...(pack.translations || []).map((v) => ({ id: `${pack.id}--${v.language}`, language: v.language, label: v.label })),
    ];
    return [{ ...pack, languageVersions: versions }, ...(pack.translations || []).map((v) => ({
      ...pack,
      ...v,
      id: `${pack.id}--${v.language}`,
      translationOf: pack.id,
      languageVersions: versions,
      cards: v.cards || [], pages: v.pages || [], files: v.files || [],
      rulesDocuments: v.rulesDocuments || [], rules: v.rules || "",
      note: v.note || "", cover: v.cover || "",
      translations: [],
    }))];
  });
}

export function withTranslationDemo(packs, enabled) {
  if (!enabled) return packs;
  return packs.map((pack) => pack.id !== "mercenaries" ? pack : ({
    ...pack,
    translations: [...(pack.translations || []), {
      language: "pt", label: "Português — DEMO", demo: true,
      note: "DEMO: language switching only. Portuguese card, rules and print files have not been supplied yet.",
      cards: [], pages: [], files: [], rulesDocuments: [],
    }],
  }));
}
