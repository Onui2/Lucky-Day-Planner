import { useEffect, useRef } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import {
  saveAccountLuckyDayBookmark,
  useDeleteAccountLuckyDayBookmark,
  useGetAccountLuckyDayBookmarks,
  useSaveAccountLuckyDayBookmark,
  type LuckyDayBookmarkInput,
} from "@workspace/api-client-react";
import {
  clearLuckyDayBookmarks,
  getLocalLuckyDayBookmarks,
} from "@/lib/member-insights";

function normalizeBookmarkGrade(grade: string): LuckyDayBookmarkInput["grade"] {
  return ["대길", "길", "보통", "흉", "대흉"].includes(grade)
    ? (grade as LuckyDayBookmarkInput["grade"])
    : "보통";
}

export function useLuckyDayBookmarks() {
  const { user, isAuthenticated } = useAuth();
  const query = useGetAccountLuckyDayBookmarks(
    Boolean(isAuthenticated && user?.id),
  );
  const saveMutation = useSaveAccountLuckyDayBookmark();
  const deleteMutation = useDeleteAccountLuckyDayBookmark();
  const migrationKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      migrationKeyRef.current = null;
      return;
    }

    if (!query.data) {
      return;
    }

    if (migrationKeyRef.current === user.id) {
      return;
    }

    void (async () => {
      const localBookmarks = getLocalLuckyDayBookmarks(user.id);
      if (localBookmarks.length === 0) {
        return;
      }

      migrationKeyRef.current = user.id;

      try {
        for (const bookmark of localBookmarks) {
          await saveAccountLuckyDayBookmark({
            id: bookmark.id,
            title: bookmark.title,
            note: bookmark.note,
            year: bookmark.year,
            month: bookmark.month,
            day: bookmark.day,
            purpose: bookmark.purpose,
            purposeLabel: bookmark.purposeLabel,
            ganzi: bookmark.ganzi,
            ganziHanja: bookmark.ganziHanja,
            grade: normalizeBookmarkGrade(bookmark.grade),
            score: bookmark.score,
            tags: bookmark.tags,
          });
        }

        clearLuckyDayBookmarks(user.id);
        await query.refetch();
      } catch (error) {
        console.error("lucky day bookmark migration error:", error);
        migrationKeyRef.current = null;
      }
    })();
  }, [query.data, query.refetch, user?.id]);

  return {
    bookmarks: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    saveBookmark: (bookmark: LuckyDayBookmarkInput) =>
      saveMutation.mutateAsync(bookmark),
    removeBookmark: (id: string) => deleteMutation.mutateAsync(id),
    isSaving: saveMutation.isPending,
    isRemoving: deleteMutation.isPending,
  };
}
