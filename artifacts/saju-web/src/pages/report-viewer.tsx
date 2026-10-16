import { useEffect, useRef, useState } from "react";
import { Link, useRoute } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { customFetch, downloadReportFile, useGetMyReports } from "@workspace/api-client-react";
import { ArrowLeft, Download, Loader2, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

type PdfModule = typeof import("pdfjs-dist");
type PdfLoadingTask = ReturnType<PdfModule["getDocument"]>;
export type PdfDocument = Awaited<PdfLoadingTask["promise"]>;

const MIN_SCALE = 0.6;
const MAX_SCALE = 2.4;
const SCALE_STEP = 0.2;

let pdfModulePromise: Promise<PdfModule> | null = null;

export async function loadPdfModule() {
  if (!pdfModulePromise) {
    pdfModulePromise = Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]).then(([module, worker]) => {
      module.GlobalWorkerOptions.workerSrc = worker.default;
      return module;
    });
  }
  return pdfModulePromise;
}

export function PdfPage({ document, pageNumber, scale }: { document: PdfDocument; pageNumber: number; scale: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void } | null = null;

    void (async () => {
      try {
        const page = await document.getPage(pageNumber);
        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;

        const container = canvas.parentElement;
        const baseViewport = page.getViewport({ scale: 1 });
        const fitWidth = Math.max(280, (container?.clientWidth ?? baseViewport.width) - 2);
        const cssScale = (fitWidth / baseViewport.width) * scale;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
        const viewport = page.getViewport({ scale: cssScale * pixelRatio });
        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / pixelRatio)}px`;
        canvas.style.height = `${Math.floor(viewport.height / pixelRatio)}px`;

        const task = page.render({ canvas, canvasContext: context, viewport });
        renderTask = task;
        await task.promise;
      } catch (error) {
        if (!cancelled && !(error instanceof Error && error.name === "RenderingCancelledException")) {
          setFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [document, pageNumber, scale]);

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-foreground/10 bg-white shadow-sm">
      {failed ? (
        <div className="p-6 text-center text-sm text-muted-foreground">{pageNumber}페이지를 표시하지 못했습니다.</div>
      ) : (
        <canvas ref={canvasRef} aria-label={`리포트 ${pageNumber}페이지`} className="mx-auto block" />
      )}
    </div>
  );
}

export default function ReportViewerPage() {
  const [, params] = useRoute("/reports/:id/view");
  const reportId = Number(params?.id);
  const validId = Number.isSafeInteger(reportId) && reportId > 0;
  const { isAuthenticated } = useAuth();
  const { data: reportsData } = useGetMyReports(isAuthenticated);
  const report = reportsData?.reports.find((item) => item.id === reportId) ?? null;

  const [pdf, setPdf] = useState<PdfDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (!validId) {
      setError("유효하지 않은 리포트 주소입니다.");
      return;
    }

    let cancelled = false;
    let loadingTask: PdfLoadingTask | null = null;
    setPdf(null);
    setError(null);

    void (async () => {
      try {
        const [module, blob] = await Promise.all([
          loadPdfModule(),
          customFetch<Blob>(`/api/reports/${reportId}/download?inline=1`, { responseType: "blob" }),
        ]);
        const data = new Uint8Array(await blob.arrayBuffer());
        const task = module.getDocument({ data });
        loadingTask = task;
        const document = await task.promise;
        if (cancelled) {
          await task.destroy();
          return;
        }
        setPdf(document);
      } catch (caught) {
        if (cancelled) return;
        const status =
          typeof caught === "object" && caught !== null && "status" in caught
            ? Number((caught as { status?: unknown }).status)
            : null;
        setError(
          status === 404
            ? "리포트를 찾을 수 없습니다."
            : status === 403
              ? "이 리포트를 볼 권한이 없습니다."
              : status === 409
                ? "아직 생성 중인 리포트입니다. 마이페이지에서 상태를 확인해 주세요."
                : caught instanceof Error && caught.message
                  ? caught.message
                  : "리포트를 불러오지 못했습니다.",
        );
      }
    })();

    return () => {
      cancelled = true;
      void loadingTask?.destroy();
    };
  }, [reportId, validId]);

  async function handleDownload() {
    if (!validId || downloading) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      await downloadReportFile(reportId, report?.fileName ?? report?.title);
    } catch (caught) {
      setDownloadError(caught instanceof Error ? caught.message : "PDF 다운로드에 실패했습니다.");
    } finally {
      setDownloading(false);
    }
  }

  const pageNumbers = pdf ? Array.from({ length: pdf.numPages }, (_, index) => index + 1) : [];

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href="/account" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          마이페이지
        </Link>
        <div className="ml-auto flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="축소"
            disabled={!pdf || scale <= MIN_SCALE}
            onClick={() => setScale((value) => Math.max(MIN_SCALE, Number((value - SCALE_STEP).toFixed(2))))}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="min-w-12 text-center text-xs tabular-nums text-muted-foreground">{Math.round(scale * 100)}%</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="확대"
            disabled={!pdf || scale >= MAX_SCALE}
            onClick={() => setScale((value) => Math.min(MAX_SCALE, Number((value + SCALE_STEP).toFixed(2))))}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" className="gap-1.5" disabled={!validId || downloading} onClick={() => void handleDownload()}>
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            PDF 저장
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <h1 className="font-serif text-2xl font-bold text-foreground">{report?.title ?? "리포트 보기"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {pdf
            ? `총 ${pdf.numPages}페이지 · 화면에서 바로 읽고 필요하면 PDF로 저장하세요.`
            : "브라우저에서 바로 읽을 수 있도록 리포트를 준비합니다."}
        </p>
      </div>

      {downloadError && <p role="alert" className="mb-3 text-sm text-rose-600">{downloadError}</p>}

      {error ? (
        <div role="alert" className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-5 py-4 text-sm text-rose-700">
          {error}
        </div>
      ) : !pdf ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          리포트 불러오는 중
        </div>
      ) : (
        <div className="space-y-4">
          {pageNumbers.map((pageNumber) => (
            <PdfPage key={pageNumber} document={pdf} pageNumber={pageNumber} scale={scale} />
          ))}
        </div>
      )}
    </div>
  );
}
