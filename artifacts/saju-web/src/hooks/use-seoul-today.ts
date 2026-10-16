import { useEffect, useState } from "react";
import { getSeoulTodayString } from "@/lib/seoul-date";

/** Keep today's date current across midnight and suspended browser tabs. */
export function useSeoulToday() {
  const [today, setToday] = useState(getSeoulTodayString);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      const now = new Date();
      const date = getSeoulTodayString(now);
      setToday(date);
      const nextMidnight = Date.parse(`${date}T00:00:00+09:00`) + 86_400_000;
      timer = setTimeout(refresh, Math.max(100, nextMidnight - now.getTime()));
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return today;
}
