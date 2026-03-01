import { useCallback, useEffect, useState } from "react";
import {
  getUnreadAnnouncementCount,
  markAnnouncementsRead,
} from "../api/announcementApi";

const DEFAULT_POLL_MS = 60000;

export default function useAnnouncementNotifications({
  isAnnouncementPage,
  enabled = true,
  pollMs = DEFAULT_POLL_MS,
}) {
  const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState(0);

  const refreshAnnouncements = useCallback(async () => {
    if (!enabled) return;

    try {
      const res = await getUnreadAnnouncementCount();
      const unreadCount = Number(res.data?.unreadCount || 0);
      setUnreadAnnouncementsCount(Number.isFinite(unreadCount) ? unreadCount : 0);
    } catch {
      setUnreadAnnouncementsCount(0);
    }
  }, [enabled]);

  const markAnnouncementsSeen = useCallback(() => {
    if (!enabled) return Promise.resolve();

    return markAnnouncementsRead()
      .then(() => {
        setUnreadAnnouncementsCount(0);
      })
      .catch(() => {
        setUnreadAnnouncementsCount((prev) => prev);
      });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    refreshAnnouncements();
    const intervalId = window.setInterval(refreshAnnouncements, pollMs);
    return () => window.clearInterval(intervalId);
  }, [enabled, pollMs, refreshAnnouncements]);

  useEffect(() => {
    if (!enabled) return;
    if (!isAnnouncementPage) return;
    markAnnouncementsSeen();
  }, [enabled, isAnnouncementPage, markAnnouncementsSeen]);

  return {
    hasNewAnnouncements: enabled && unreadAnnouncementsCount > 0,
    unreadAnnouncementsCount,
    markAnnouncementsSeen,
  };
}