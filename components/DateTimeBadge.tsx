"use client";

import { useEffect, useMemo, useState } from "react";

const TZ = "Asia/Jakarta";

function getJakartaParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day)
  };
}

function getDisplay(date: Date) {
  return {
    shortDate: new Intl.DateTimeFormat("id-ID", {
      timeZone: TZ,
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(date),

    longDate: new Intl.DateTimeFormat("id-ID", {
      timeZone: TZ,
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(date),

    monthTitle: new Intl.DateTimeFormat("id-ID", {
      timeZone: TZ,
      month: "long",
      year: "numeric"
    }).format(date),

    time: new Intl.DateTimeFormat("id-ID", {
      timeZone: TZ,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(date)
  };
}

function buildCalendar(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  // Monday = 0, Sunday = 6.
  const firstDay = (first.getUTCDay() + 6) % 7;

  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

export function DateTimeBadge() {
  const [now, setNow] = useState<Date | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();

    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const display = now ? getDisplay(now) : null;
  const jakarta = now ? getJakartaParts(now) : null;

  const calendar = useMemo(
    () => jakarta ? buildCalendar(jakarta.year, jakarta.month) : [],
    [jakarta?.year, jakarta?.month]
  );

  return (
    <div className="jp-datetime-wrap">
      <button
        type="button"
        className="jp-datetime"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Buka kalender dan jam WIB"
      >
        <span className="jp-date-row">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="3"/>
            <path d="M7 3v4M17 3v4M3 10h18"/>
          </svg>
          <span>{display?.shortDate ?? "memuat tanggal…"}</span>
        </span>

        <span className="jp-divider" aria-hidden="true"/>

        <span className="jp-time-row">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 7v5l3 2"/>
          </svg>
          <strong>{display ? `${display.time} WIB` : "memuat jam…"}</strong>
        </span>

        <span className="jp-chevron" aria-hidden="true">⌄</span>
      </button>

      {open && display && jakarta && (
        <div className="jp-calendar-popover" role="dialog" aria-label="Kalender dan waktu WIB">
          <div className="jp-calendar-head">
            <div>
              <span className="jp-calendar-kicker">waktu saat ini</span>
              <strong>{display.longDate}</strong>
            </div>
            <button
              type="button"
              className="jp-close"
              aria-label="Tutup kalender"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="jp-big-clock">{display.time}</div>
          <div className="jp-zone">WIB · Asia/Jakarta</div>

          <div className="jp-month-title">{display.monthTitle}</div>

          <div className="jp-calendar-grid jp-weekdays" aria-hidden="true">
            {["Sen","Sel","Rab","Kam","Jum","Sab","Min"].map(day => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="jp-calendar-grid">
            {calendar.map((day, index) => (
              <span
                key={`${day ?? "x"}-${index}`}
                className={
                  day === jakarta.day
                    ? "jp-calendar-day today"
                    : "jp-calendar-day"
                }
              >
                {day ?? ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
