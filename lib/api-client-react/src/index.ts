export * from "./generated/api";
export * from "./generated/api.schemas";

// ─── 저장된 사주 API 훅 (수동 추가) ─────────────────────────
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
export { customFetch } from "./custom-fetch";
import { ApiError, customFetch } from "./custom-fetch";

export interface SavedSajuBirthInfo {
  year: number; month: number; day: number; hour: number;
  gender: string; calendarType: string;
}

export interface SavedSajuItem {
  id: number;
  userId: string;
  label: string;
  birthInfo: SavedSajuBirthInfo;
  createdAt: string;
}

const SAVED_SAJU_KEY = ["saju", "saved"] as const;

const env =
  typeof import.meta !== "undefined"
    ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}
    : {};

const SUPABASE_URL = env.VITE_SUPABASE_URL?.trim() ?? "";
const SUPABASE_PUBLISHABLE_KEY =
  env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ??
  env.VITE_SUPABASE_ANON_KEY?.trim() ??
  "";
const SUPABASE_ACCESS_TOKEN_STORAGE_KEY = "lucky_day_supabase_access_token";
const SUPABASE_SAVED_METADATA_KEY = "saved_saju_items";

interface SupabaseAuthUser {
  id: string;
  user_metadata?: Record<string, unknown> | null;
}

function canUseBrowserStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isSupabaseMetadataStorageEnabled(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY && canUseBrowserStorage());
}

function getSupabaseAccessToken(): string | null {
  if (!canUseBrowserStorage()) {
    return null;
  }

  return window.localStorage.getItem(SUPABASE_ACCESS_TOKEN_STORAGE_KEY);
}

function shouldUseSupabaseSavedFallback(error: unknown): boolean {
  if (!isSupabaseMetadataStorageEnabled()) {
    return false;
  }

  if (!(error instanceof ApiError)) {
    return false;
  }

  if (error.status !== 503) {
    return false;
  }

  if (!error.data || typeof error.data !== "object") {
    return false;
  }

  const code = (error.data as Record<string, unknown>).error;
  const message = (error.data as Record<string, unknown>).message;
  return code === "DB_NOT_CONFIGURED" || message === "서버 데이터베이스 설정이 누락되었습니다.";
}

function normalizeSavedSajuItems(raw: unknown, userId: string): SavedSajuItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const row = item as Record<string, unknown>;
      const birthInfo = row.birthInfo;

      if (!birthInfo || typeof birthInfo !== "object") {
        return null;
      }

      const data = birthInfo as Record<string, unknown>;
      return {
        id: typeof row.id === "number" ? row.id : index + 1,
        userId:
          typeof row.userId === "string" && row.userId.trim()
            ? row.userId
            : userId,
        label:
          typeof row.label === "string" && row.label.trim()
            ? row.label.trim()
            : "내 사주",
        birthInfo: {
          year: Number(data.year ?? 0),
          month: Number(data.month ?? 0),
          day: Number(data.day ?? 0),
          hour: Number(data.hour ?? -1),
          gender: String(data.gender ?? "male"),
          calendarType: String(data.calendarType ?? "solar"),
        },
        createdAt:
          typeof row.createdAt === "string" && row.createdAt
            ? row.createdAt
            : new Date().toISOString(),
      } satisfies SavedSajuItem;
    })
    .filter((item): item is SavedSajuItem => Boolean(item));
}

async function fetchSupabaseUser(): Promise<SupabaseAuthUser> {
  const accessToken = getSupabaseAccessToken();
  if (!accessToken) {
    throw new Error("Supabase access token is missing.");
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to load Supabase user metadata.");
  }

  return (await response.json()) as SupabaseAuthUser;
}

async function saveSupabaseUserMetadata(
  metadata: Record<string, unknown>,
): Promise<void> {
  const accessToken = getSupabaseAccessToken();
  if (!accessToken) {
    throw new Error("Supabase access token is missing.");
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ data: metadata }),
  });

  if (!response.ok) {
    throw new Error("Failed to update Supabase user metadata.");
  }
}

async function getSupabaseSavedSaju(): Promise<SavedSajuItem[]> {
  const user = await fetchSupabaseUser();
  return normalizeSavedSajuItems(
    user.user_metadata?.[SUPABASE_SAVED_METADATA_KEY],
    user.id,
  );
}

async function setSupabaseSavedSaju(
  updater: (items: SavedSajuItem[], user: SupabaseAuthUser) => SavedSajuItem[],
): Promise<SavedSajuItem[] | { ok: boolean }> {
  const user = await fetchSupabaseUser();
  const existingMetadata = user.user_metadata ?? {};
  const existingItems = normalizeSavedSajuItems(
    existingMetadata[SUPABASE_SAVED_METADATA_KEY],
    user.id,
  );
  const nextItems = updater(existingItems, user);

  await saveSupabaseUserMetadata({
    ...existingMetadata,
    [SUPABASE_SAVED_METADATA_KEY]: nextItems,
  });

  return nextItems;
}

async function fetchSavedSajuList(): Promise<SavedSajuItem[]> {
  try {
    return await customFetch<SavedSajuItem[]>("/api/saju/saved");
  } catch (error) {
    if (!shouldUseSupabaseSavedFallback(error)) {
      throw error;
    }

    return getSupabaseSavedSaju();
  }
}

export function useGetSavedSaju(enabled = true) {
  return useQuery<SavedSajuItem[]>({
    queryKey: SAVED_SAJU_KEY,
    queryFn: fetchSavedSajuList,
    staleTime: 30_000,
    enabled,
  });
}

export function useSaveSaju() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { label: string; birthInfo: SavedSajuBirthInfo }) => {
      try {
        return await customFetch<SavedSajuItem>("/api/saju/saved", {
          method: "POST",
          body: JSON.stringify(body),
        });
      } catch (error) {
        if (!shouldUseSupabaseSavedFallback(error)) {
          throw error;
        }

        const result = await setSupabaseSavedSaju((items, user) => {
          if (items.length >= 20) {
            throw new Error("최대 20개까지 저장할 수 있습니다.");
          }

          const nextId = items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
          return [
            ...items,
            {
              id: nextId,
              userId: user.id,
              label: body.label.trim().slice(0, 50) || "내 사주",
              birthInfo: body.birthInfo,
              createdAt: new Date().toISOString(),
            },
          ];
        });

        return (result as SavedSajuItem[]).at(-1)!;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SAVED_SAJU_KEY }),
  });
}

export function useRenameSavedSaju() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, label }: { id: number; label: string }) => {
      try {
        return await customFetch<SavedSajuItem>(`/api/saju/saved/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ label }),
        });
      } catch (error) {
        if (!shouldUseSupabaseSavedFallback(error)) {
          throw error;
        }

        const normalizedLabel = label.trim().slice(0, 50);
        const result = await setSupabaseSavedSaju((items) =>
          items.map((item) =>
            item.id === id ? { ...item, label: normalizedLabel || "내 사주" } : item,
          ),
        );

        const updated = (result as SavedSajuItem[]).find((item) => item.id === id);
        if (!updated) {
          throw new Error("항목을 찾을 수 없습니다.");
        }

        return updated;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SAVED_SAJU_KEY }),
  });
}

export function useDeleteSavedSaju() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      try {
        return await customFetch<{ ok: boolean }>(`/api/saju/saved/${id}`, { method: "DELETE" });
      } catch (error) {
        if (!shouldUseSupabaseSavedFallback(error)) {
          throw error;
        }

        await setSupabaseSavedSaju((items) => items.filter((item) => item.id !== id));
        return { ok: true };
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SAVED_SAJU_KEY }),
  });
}

// ─── 문의 API 훅 ─────────────────────────────────────────────

export interface InquirySajuSnapshot {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour?: number;
  gender: string;
  calendarType: string;
  dayPillarStem?: string;
  sajuSummary?: string;
}

export interface Inquiry {
  id: number;
  userId: string;
  userLabel?: string | null;
  sajuSnapshot?: InquirySajuSnapshot | null;
  message: string;
  status: string;
  adminReply?: string | null;
  repliedAt?: string | null;
  inquiryType?: string | null;
  readByAdmin: boolean;
  readByUser: boolean;
  createdAt: string;
  updatedAt: string;
  userEmail?: string | null;
  userFirstName?: string | null;
  userLastName?: string | null;
}

export interface InquiryListResponse {
  inquiries: Inquiry[];
  total: number;
  page: number;
  limit: number;
}

const MY_INQUIRIES_KEY = ["inquiries", "my"] as const;
const ADMIN_INQUIRIES_KEY = ["inquiries", "admin"] as const;
const MY_UNREAD_KEY = ["inquiries", "my-unread"] as const;
const ADMIN_UNREAD_KEY = ["inquiries", "admin-unread"] as const;

export function useSubmitInquiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { message: string; sajuSnapshot?: InquirySajuSnapshot | null; userLabel?: string; inquiryType?: string }) =>
      customFetch<{ inquiry: Inquiry }>("/api/inquiries", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MY_INQUIRIES_KEY });
      qc.invalidateQueries({ queryKey: ADMIN_UNREAD_KEY });
    },
  });
}

export function useGetMyInquiries(page = 1, enabled = true) {
  return useQuery<InquiryListResponse>({
    queryKey: [...MY_INQUIRIES_KEY, page],
    queryFn: () => customFetch<InquiryListResponse>(`/api/inquiries/my?page=${page}`),
    staleTime: 15_000,
    enabled,
  });
}

export function useMyUnreadCount(enabled = true) {
  return useQuery<{ count: number }>({
    queryKey: MY_UNREAD_KEY,
    queryFn: () =>
      customFetch<{ count: number }>("/api/inquiries/my/unread-count").catch(() => ({ count: 0 })),
    refetchInterval: 30_000,
    staleTime: 20_000,
    retry: false,
    enabled,
  });
}

export function useMarkInquiryReadByUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ ok: boolean }>(`/api/inquiries/${id}/read`, { method: "PATCH" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MY_INQUIRIES_KEY });
      qc.invalidateQueries({ queryKey: MY_UNREAD_KEY });
    },
  });
}

export function useGetAdminInquiries(page = 1, status?: string) {
  const params = new URLSearchParams({ page: String(page) });
  if (status) params.set("status", status);
  return useQuery<InquiryListResponse>({
    queryKey: [...ADMIN_INQUIRIES_KEY, page, status],
    queryFn: () => customFetch<InquiryListResponse>(`/api/admin/inquiries?${params}`),
    staleTime: 15_000,
  });
}

export function useAdminUnreadCount(enabled = true) {
  return useQuery<{ count: number }>({
    queryKey: ADMIN_UNREAD_KEY,
    queryFn: () =>
      customFetch<{ count: number }>("/api/admin/inquiries/unread-count").catch(() => ({ count: 0 })),
    refetchInterval: 30_000,
    staleTime: 20_000,
    retry: false,
    enabled,
  });
}

export function useAdminReplyInquiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reply }: { id: number; reply: string }) =>
      customFetch<{ inquiry: Inquiry }>(`/api/admin/inquiries/${id}/reply`, {
        method: "PATCH",
        body: JSON.stringify({ reply }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_INQUIRIES_KEY }),
  });
}

export function useAdminMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ ok: boolean }>(`/api/admin/inquiries/${id}/read`, { method: "PATCH" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_INQUIRIES_KEY });
      qc.invalidateQueries({ queryKey: ADMIN_UNREAD_KEY });
    },
  });
}

export function useAdminDeleteInquiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ ok: boolean }>(`/api/admin/inquiries/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_INQUIRIES_KEY });
      qc.invalidateQueries({ queryKey: ADMIN_UNREAD_KEY });
    },
  });
}

// ─── 회원 관리 ─────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  createdAt: string;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

const ADMIN_USERS_KEY = ["admin", "users"] as const;
const ADMIN_STATS_KEY = ["admin", "stats"] as const;

export interface AdminStatsCountSummary {
  totalUsers: number;
  newUsersToday: number;
  adminUsers: number;
  totalSavedSaju: number;
  totalInquiries: number;
  unreadInquiries: number;
  pendingInquiries: number;
  inquiriesToday: number;
  answeredToday: number;
}

export interface AdminStatsRecentUser {
  id: string;
  email: string | null;
  firstName: string | null;
  role: string;
  createdAt: string;
}

export interface AdminStatsRecentInquiry {
  id: number;
  inquiryType: string | null;
  status: string;
  userLabel: string | null;
  userEmail: string | null;
  createdAt: string;
}

export interface AdminStatsResponse {
  counts: AdminStatsCountSummary;
  inquiryTypes: {
    general: number;
    saju: number;
    gungap: number;
  };
  recentUsers: AdminStatsRecentUser[];
  recentInquiries: AdminStatsRecentInquiry[];
}

export function useGetAdminUsers(page = 1, search = "") {
  return useQuery<AdminUsersResponse>({
    queryKey: [...ADMIN_USERS_KEY, page, search],
    queryFn: () =>
      customFetch<AdminUsersResponse>(
        `/api/admin/users?page=${page}&search=${encodeURIComponent(search)}`
      ),
    staleTime: 10_000,
  });
}

export function useGetAdminStats() {
  return useQuery<AdminStatsResponse>({
    queryKey: ADMIN_STATS_KEY,
    queryFn: () => customFetch<AdminStatsResponse>("/api/admin/stats"),
    staleTime: 15_000,
  });
}

export function useAdminSetUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: "admin" | "user" }) =>
      customFetch<{ user: AdminUser }>(`/api/admin/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
    },
  });
}

// ─── 연간 운세 ─────────────────────────────────────────────────

export interface YearFortuneData {
  targetYear: number;
  yearGanzi: string;
  yearStem: string;
  yearBranch: string;
  yearZodiac: string;
  yearStemMeaning: { name: string; energy: string; keyword: string };
  dayMasterElement: string;
  relation: string;
  overallScore: number;
  overallText: string;
  moneyScore: number; moneyText: string;
  loveScore: number; loveText: string;
  careerScore: number; careerText: string;
  healthScore: number; healthText: string;
  quarters: { name: string; score: number; theme: string; advice: string }[];
  monthlyScores: { month: number; score: number; monthStem?: string; monthBranch?: string }[];
  keyAdvice: string[];
}

export function useYearFortune() {
  return useMutation({
    mutationFn: (body: {
      birthYear: number; birthMonth: number; birthDay: number;
      birthHour?: number; birthMinute?: number; targetYear?: number;
    }) => customFetch<YearFortuneData>("/api/year-fortune", { method: "POST", body: JSON.stringify(body) }),
  });
}

// ─── 이름 풀이 ─────────────────────────────────────────────────

export interface NameAnalysisData {
  name: string;
  syllables: number;
  strokes: { char: string; strokes: number }[];
  wonGyeok: number; wonGyeokSuri: { name: string; fortune: string; score: number };
  hyeongGyeok: number; hyeongGyeokSuri: { name: string; fortune: string; score: number };
  iGyeok: number; iGyeokSuri: { name: string; fortune: string; score: number };
  jeongGyeok: number; jeongGyeokSuri: { name: string; fortune: string; score: number };
  overallScore: number;
  overallGrade: string;
  elements: string[];
  dominantElement: string;
  elementTrait: { positive: string; negative: string; career: string };
  yinYangBalance: string;
  personality: string;
  luckAreas: string[];
  careerSuggestions: string;
  caution: string;
  elementFlow: string;
}

export function useNameAnalysis() {
  return useMutation({
    mutationFn: (name: string) =>
      customFetch<NameAnalysisData>("/api/name-analysis", { method: "POST", body: JSON.stringify({ name }) }),
  });
}

// ─── 띠별 운세 ─────────────────────────────────────────────────

export interface ZodiacDayFortune {
  zodiac: string;
  emoji: string;
  branch: string;
  element: string;
  relation: "harmony" | "conflict" | "neutral";
  score: number;
  fortune: string;
  moneyFortune: string;
  loveFortune: string;
  advice: string;
  birthYears: number[];
}

export interface ZodiacFortuneData {
  date: string;
  dayGanzi: string;
  dayBranch: string;
  zodiacs: ZodiacDayFortune[];
}

const ZODIAC_FORTUNE_KEY = ["fortune", "zodiac"] as const;

export function useZodiacFortune(date?: string) {
  const params = date ? `?date=${date}` : "";
  return useQuery<ZodiacFortuneData>({
    queryKey: [...ZODIAC_FORTUNE_KEY, date ?? "today"],
    queryFn: () => customFetch<ZodiacFortuneData>(`/api/fortune/zodiac${params}`),
    staleTime: 5 * 60 * 1000,
  });
}

// ─── 계정 관리 ─────────────────────────────────────────────────

export interface AccountInfo {
  id: string;
  email: string | null;
  firstName: string | null;
  role: string;
  createdAt: string;
  hasPassword: boolean;
}

const ACCOUNT_KEY = ["account"] as const;

export function useGetAccount() {
  return useQuery<AccountInfo>({
    queryKey: ACCOUNT_KEY,
    queryFn: () => customFetch<AccountInfo>("/api/account"),
    staleTime: 60_000,
    retry: false,
  });
}

export function useUpdateAccountName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      customFetch<{ user: { id: string; firstName: string; email: string } }>("/api/account/name", {
        method: "PATCH",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ACCOUNT_KEY }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword?: string; newPassword: string }) =>
      customFetch<{ ok: boolean }>("/api/account/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: (password?: string) =>
      customFetch<{ ok: boolean }>("/api/account", {
        method: "DELETE",
        body: JSON.stringify({ password }),
      }),
  });
}

// ─── 연애운 ──────────────────────────────────────────────────

export interface LoveFortuneResult {
  status: 'solo' | 'dating';
  myElement: string;
  myStem: string;
  loveScore: number;
  loveGrade: string;
  loveText: string;
  // 솔로
  loveElement?: string;
  loveElementRole?: string;
  luckyMonths?: Array<{ month: number; score: number; reason: string }>;
  allMonthScores?: Array<{ month: number; score: number }>;
  partnerTraits?: string[];
  meetWhere?: string;
  soloAdvice?: string;
  tips: string[];
  // 연애중
  partnerElement?: string;
  partnerStem?: string;
  compatScore?: number;
  compatGrade?: string;
  compatSummary?: string;
  datingStrengths?: string[];
  datingChallenges?: string[];
  datingAdvice?: string;
}

export function useLoveFortune() {
  return useMutation({
    mutationFn: (body: {
      birthYear: number; birthMonth: number; birthDay: number;
      birthHour?: number; birthMinute?: number; gender: string; status: string; targetYear?: number;
      partnerYear?: number; partnerMonth?: number; partnerDay?: number;
      partnerHour?: number; partnerMinute?: number; partnerGender?: string;
    }) => customFetch<LoveFortuneResult>("/api/love-fortune", { method: "POST", body: JSON.stringify(body) }),
  });
}
