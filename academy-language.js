const untranslatedMalay = new Set();
const pendingMalay = new Map();
let malayTranslationRunning = false, malayTranslationFailed = false;
const malayCacheKey = 'robov-malay-translations-v1';
let malayCache = {};
try {
  const saved = JSON.parse(localStorage.getItem(malayCacheKey) || '{}');
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
    malayCache = Object.fromEntries(Object.entries(saved).filter(([key, value]) => key.length < 5000 && typeof value === 'string' && value.trim() && value.length <= 2500).slice(-1000));
  }
} catch { /* Invalid cache does not affect learning history. */ }

function registerMalayText(value) {
  if (!value || typeof value.zh !== 'string' || typeof value.en !== 'string') return;
  const key = JSON.stringify([value.zh, value.en]);
  const existing = value.ms || malayCache[key] || (interfaceEnglish[value.zh] === value.en ? malay[value.zh] : null);
  if (existing) { value.ms = existing; malay[value.zh] = existing; untranslatedMalay.delete(value.zh); return; }
  if (!pendingMalay.has(key)) pendingMalay.set(key, { text: value.en, source: value.zh, refs: new Set() });
  pendingMalay.get(key).refs.add(value);
  untranslatedMalay.add(value.zh);
  if (language === 'ms' && !malayTranslationFailed) queueMicrotask(ensureMalayTranslation);
}

function updateMalayStatus() {
  const status = document.querySelector('#academy-language-status');
  if (!status) return;
  status.hidden = language !== 'ms' || (!malayTranslationRunning && !malayTranslationFailed);
  document.querySelector('#academy-language-message').textContent = malayTranslationFailed ? 'Terjemahan belum dapat diselesaikan. Sila cuba lagi.' : 'Sedang menterjemahkan rekod ilmu ke Bahasa Melayu…';
  document.querySelector('#retry-malay').hidden = !malayTranslationFailed;
  document.querySelector('#retry-malay').disabled = malayTranslationRunning;
}

async function ensureMalayTranslation() {
  if (language !== 'ms' || malayTranslationRunning || malayTranslationFailed) { updateMalayStatus(); return; }
  if (!pendingMalay.size) { updateMalayStatus(); return; }
  malayTranslationRunning = true; updateMalayStatus();
  try {
    while (pendingMalay.size && language === 'ms') {
      const batch = []; let length = 0;
      for (const [key, item] of pendingMalay) {
        if (batch.length >= 20 || length + item.text.length > 10000) break;
        batch.push({ key, item, id: `t-${batch.length}` }); length += item.text.length;
      }
      if (!batch.length) throw new Error('TRANSLATION_TOO_LARGE');
      const response = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entries: batch.map(({ id, item }) => ({ id, text: item.text })) }), signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error('TRANSLATION_FAILED');
      const result = await response.json();
      if (!Array.isArray(result.entries) || result.entries.length !== batch.length || new Set(result.entries.map(entry => entry.id)).size !== batch.length) throw new Error('INCOMPLETE_TRANSLATION');
      const translated = new Map(result.entries.map(entry => [entry.id, entry.ms]));
      if (!batch.every(({ id }) => typeof translated.get(id) === 'string' && translated.get(id).trim() && translated.get(id).length <= 2500)) throw new Error('INCOMPLETE_TRANSLATION');
      for (const { id, key, item } of batch) {
        const ms = translated.get(id).trim();
        for (const value of item.refs) value.ms = ms;
        malay[item.source] = ms; malayCache[key] = ms;
        pendingMalay.delete(key); untranslatedMalay.delete(item.source);
      }
      try { localStorage.setItem(malayCacheKey, JSON.stringify(Object.fromEntries(Object.entries(malayCache).slice(-1000)))); } catch { /* Keep the translated text available for this session. */ }
      if (typeof saveProgress === 'function' && personalizedGraph) saveProgress();
      applyLanguage(); refreshLanguageLayout();
    }
  } catch { malayTranslationFailed = true; }
  finally { malayTranslationRunning = false; updateMalayStatus(); applyLanguage(); }
}

document.querySelector('#retry-malay').addEventListener('click', () => { malayTranslationFailed = false; ensureMalayTranslation(); });
window.addEventListener('robov:language', () => { updateMalayStatus(); ensureMalayTranslation(); });
