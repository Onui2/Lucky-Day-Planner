import { customFetch } from "@workspace/api-client-react";

type Visit = { visitId: string; source: string; creative: string; expiresAt: number };
const STORAGE_KEY = "lucky-day:new-year-2027:visit";
const SOURCES = ["instagram", "youtube", "direct"];
const CREATIVES = ["input-demo", "monthly-table", "free-vs-paid", "direct"];
let memoryVisit: Visit | null = null;
let queue = Promise.resolve();

export function getCampaignVisit(): Visit | null {
  try {
    const saved = memoryVisit ?? JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (saved && /^[0-9a-f-]{36}$/i.test(saved.visitId) && SOURCES.includes(saved.source)
      && CREATIVES.includes(saved.creative) && Number.isFinite(saved.expiresAt) && saved.expiresAt > Date.now()) {
      memoryVisit = saved;
      return saved;
    }
  } catch { /* Storage can be disabled in in-app browsers. */ }
  return null;
}

export function trackCampaignEvent(event: "visit" | "input_complete" | "free_result", search: string) {
  let visit = getCampaignVisit();
  if (!visit) {
    const params = new URLSearchParams(search);
    if (params.get("campaign") !== "new-year-2027" || !globalThis.crypto?.randomUUID) return;
    visit = { visitId: crypto.randomUUID(),
      source: SOURCES.includes(params.get("source") ?? "") ? params.get("source")! : "direct",
      creative: CREATIVES.includes(params.get("creative") ?? "") ? params.get("creative")! : "direct",
      expiresAt: Date.now() + 7 * 86_400_000 };
    memoryVisit = visit;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(visit)); } catch { /* Memory fallback. */ }
  }
  // Whitelist only. No birth data, question, URL, or referrer is serialized.
  const payload = { event, visitId: visit.visitId, source: visit.source, creative: visit.creative };
  queue = queue.then(async () => {
    await customFetch<void>("/api/campaign/events", { method: "POST", body: JSON.stringify(payload) });
  }).catch(() => undefined);
}
