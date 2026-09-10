"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SESSION_KEY = "kembali_ke_nol_analytics_session";

function getSessionId() {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);

    if (existing) {
      return existing;
    }

    const id = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function getDeviceType() {
  const ua = navigator.userAgent.toLowerCase();

  if (/ipad|tablet/.test(ua)) {
    return "tablet";
  }

  if (/iphone|android|mobile/.test(ua)) {
    return "mobile";
  }

  return "desktop";
}

export default function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    /*
     * Dashboard/admin dan halaman autentikasi tidak
     * dihitung sebagai kunjungan pembaca.
     */
    if (
      pathname === "/admin" ||
      pathname.startsWith("/admin/") ||
      pathname === "/login" ||
      pathname.startsWith("/login/") ||
      pathname === "/reader-login" ||
      pathname.startsWith("/reader-login/") ||
      pathname === "/reader-register" ||
      pathname.startsWith("/reader-register/") ||
      pathname.startsWith("/reader-forgot-password") ||
      pathname.startsWith("/reader-reset-password") ||
      pathname.startsWith("/auth/")
    ) {
      return;
    }

    const sessionId = getSessionId();

    void fetch("/api/analytics/page-view", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      keepalive: true,
      body: JSON.stringify({
        sessionId,
        path: pathname,
        referrer: document.referrer || null,
        deviceType: getDeviceType(),
      }),
    }).catch(() => {
      /*
       * Analytics tidak boleh mengganggu pembaca
       * jika pencatatan gagal.
       */
    });
  }, [pathname]);

  return null;
}
