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
  getLuckyDayBookmarks,
} from "@/lib/member-insights";

export function useLuckyDayBookmarks() {
  const { user, isAuthenticated } = useAuth();
  const query = useGetAccountLuckyDayBookmarks(Boolean(isAuthenticated && user?.id));
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

    const localBookmarks = getLuckyDayBookmarks(user.id);
    if (localBookmarks.length === 0) {
      return;
    }

    if (migrationKeyRef.current === user.id) {
      return;
    }

    migrationKeyRef.current = user.id;

    void (async () => {
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
            grade: bookmark.grade,
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
    saveBookmark: (bookmark: LuckyDayBookmarkInput) => saveMutation.mutateAsync(bookmark),
    removeBookmark: (id: string) => deleteMutation.mutateAsync(id),
    isSaving: saveMutation.isPending,
    isRemoving: deleteMutation.isPending,
  };
}
