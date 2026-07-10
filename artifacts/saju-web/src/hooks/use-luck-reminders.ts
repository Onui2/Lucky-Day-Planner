import { useCallback, useEffect, useMemo, useState } from "react";

import { type CalendarExportEvent, zonedEventStart } from "@/lib/calendar-export";

interface StoredReminder {
  id: string;
  event: CalendarExportEvent;
  dayNoticeSent: boolean;
  hourNoticeSent: boolean;
}

function readReminders(storageKey: string): StoredReminder[] {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function reminderId(event: CalendarExportEvent) {
  return `${event.year}-${event.month}-${event.day}-${event.startHour}-${event.startMinute ?? 0}-${event.title}`;
}

export function useLuckReminders(userId?: string) {
  const storageKey = `myeonghaewon:luck-reminders:${userId ?? "guest"}`;
  const [reminders, setReminders] = useState<StoredReminder[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setReminders(readReminders(storageKey));
  }, [storageKey]);

  const persist = useCallback((next: StoredReminder[]) => {
    setReminders(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  }, [storageKey]);

  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const notifyDue = () => {
      const now = Date.now();
      let changed = false;
      const next = readReminders(storageKey).map((reminder) => {
        const eventAt = zonedEventStart(reminder.event).getTime();
        const until = eventAt - now;
        const updated = { ...reminder };
        if (!updated.dayNoticeSent && until <= 24 * 60 * 60_000 && until > 60 * 60_000) {
          new Notification(updated.event.title, { body: "추천 길일이 하루 안에 시작됩니다." });
          updated.dayNoticeSent = true;
          changed = true;
        }
        if (!updated.hourNoticeSent && until <= 60 * 60_000 && until > -2 * 60 * 60_000) {
          new Notification(updated.event.title, { body: "추천 시간이 한 시간 안에 시작됩니다." });
          updated.hourNoticeSent = true;
          changed = true;
        }
        return updated;
      });
      if (changed) persist(next);
    };

    notifyDue();
    const timer = window.setInterval(notifyDue, 30_000);
    return () => window.clearInterval(timer);
  }, [persist, storageKey]);

  const toggle = useCallback(async (event: CalendarExportEvent) => {
    setMessage(null);
    const id = reminderId(event);
    const current = readReminders(storageKey);
    if (current.some((item) => item.id === id)) {
      persist(current.filter((item) => item.id !== id));
      setMessage("브라우저 알림을 해제했습니다.");
      return false;
    }

    if (typeof Notification === "undefined") {
      setMessage("이 브라우저는 알림을 지원하지 않습니다.");
      return false;
    }
    const permission = Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;
    if (permission !== "granted") {
      setMessage("브라우저 알림 권한이 필요합니다.");
      return false;
    }
    persist([...current, { id, event, dayNoticeSent: false, hourNoticeSent: false }]);
    setMessage("페이지가 열려 있을 때 하루 전과 한 시간 전에 알립니다.");
    return true;
  }, [persist, storageKey]);

  const isEnabled = useCallback((event: CalendarExportEvent) => (
    reminders.some((item) => item.id === reminderId(event))
  ), [reminders]);

  return useMemo(() => ({ reminders, isEnabled, toggle, message }), [isEnabled, message, reminders, toggle]);
}
