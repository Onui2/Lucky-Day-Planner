import { customFetch } from "@workspace/api-client-react";

export interface ShareVisibility {
  name: boolean;
  birthInfo: boolean;
  pillars: boolean;
  elements: boolean;
  summary: boolean;
}

export const DEFAULT_SHARE_VISIBILITY: ShareVisibility = {
  name: false,
  birthInfo: false,
  pillars: false,
  elements: true,
  summary: true,
};

export interface PublicSharePayload {
  version: number;
  visibility: ShareVisibility;
  createdAt: string;
  name?: string;
  birthInfo?: Record<string, unknown>;
  pillars?: Array<{
    label: string;
    value?: {
      heavenlyStem?: string;
      earthlyBranch?: string;
      heavenlyStemElement?: string;
      earthlyBranchElement?: string;
    };
  }>;
  elements?: Record<string, unknown>;
  summary?: Record<string, unknown>;
}

export async function createShareSnapshot(input: {
  name?: string;
  result: Record<string, unknown>;
  visibility: ShareVisibility;
}) {
  return customFetch<{ id: number; token: string; path: string; expiresAt: string }>(
    "/api/share-snapshots",
    { method: "POST", body: JSON.stringify(input) },
  );
}

export async function fetchPublicShare(token: string) {
  return customFetch<{ payload: PublicSharePayload; expiresAt: string }>(
    `/api/public/share/${encodeURIComponent(token)}`,
  );
}

export interface ShareSnapshotSummary {
  id: number;
  expiresAt: string;
  deletedAt: string | null;
  createdAt: string;
}

export async function listShareSnapshots() {
  return customFetch<{ shares: ShareSnapshotSummary[] }>("/api/share-snapshots");
}

export async function deleteShareSnapshot(id: number) {
  return customFetch<void>(`/api/share-snapshots/${id}`, { method: "DELETE" });
}
