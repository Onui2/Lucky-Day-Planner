import { useEffect, useState } from "react";
import { PdfPage, loadPdfModule, type PdfDocument } from "@/pages/report-viewer";

export default function NewYearSample({ path }: { path: string }) {
  const [pdf, setPdf] = useState<PdfDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    let task: ReturnType<Awaited<ReturnType<typeof loadPdfModule>>["getDocument"]> | null = null;
    setPdf(null); setError(null);
    void (async () => {
      try {
        if (!/^\/report-samples\/[a-z0-9-]+\.pdf$/.test(path)) throw new Error("샘플 주소를 확인하지 못했습니다.");
        const base = import.meta.env.BASE_URL.replace(/\/$/, "");
        const [module, response] = await Promise.all([loadPdfModule(), fetch(base + path)]);
        if (!response.ok) throw new Error("실제 샘플을 불러오지 못했습니다.");
        if (cancelled) return;
        task = module.getDocument({ data: new Uint8Array(await response.arrayBuffer()) });
        const document = await task.promise;
        if (cancelled) { await task.destroy(); return; }
        if (document.numPages !== 3) throw new Error("검수된 3쪽 샘플이 아닙니다.");
        setPdf(document);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "샘플 표시 실패");
      }
    })();
    return () => { cancelled = true; void task?.destroy(); };
  }, [path]);
  return error ? <p role="alert" className="mt-3">{error}</p> : !pdf
    ? <p role="status" className="mt-3">실제 PDF 샘플 불러오는 중</p>
    : <div className="mt-3 space-y-3">{[1, 2, 3].map((pageNumber) => <PdfPage key={pageNumber} document={pdf} pageNumber={pageNumber} scale={1} />)}</div>;
}
