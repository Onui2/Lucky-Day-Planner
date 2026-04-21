export * from "./generated/api";
export * from "./generated/api.schemas";

// ─── 저장된 사주 API 훅 (수동 추가) ─────────────────────────
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
export { customFetch } from "./custom-fetch";
import { customFetch } from "./custom-fetch";

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

export function useGetSavedSaju(enabled = true) {
  return useQuery<SavedSajuItem[]>({
    queryKey: SAVED_SAJU_KEY,
    queryFn: () => customFetch<SavedSajuItem[]>("/api/saju/saved"),
    staleTime: 30_000,
    enabled,
  });
}

export function useSaveSaju() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { label: string; birthInfo: SavedSajuBirthInfo }) =>
      customFetch<SavedSajuItem>("/api/saju/saved", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: SAVED_SAJU_KEY }),
  });
}

export function useRenameSavedSaju() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, label }: { id: number; label: string }) =>
      customFetch<SavedSajuItem>(`/api/saju/saved/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ label }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: SAVED_SAJU_KEY }),
  });
}

export function useDeleteSavedSaju() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ ok: boolean }>(`/api/saju/saved/${id}`, { method: "DELETE" }),
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
      birthHour?: number; targetYear?: number;
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
      birthHour?: number; gender: string; status: string; targetYear?: number;
      partnerYear?: number; partnerMonth?: number; partnerDay?: number;
      partnerHour?: number; partnerGender?: string;
    }) => customFetch<LoveFortuneResult>("/api/love-fortune", { method: "POST", body: JSON.stringify(body) }),
  });
}
