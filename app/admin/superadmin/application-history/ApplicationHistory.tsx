"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { WriterApplicationHistory } from "./page";

const PAGE_SIZE = 10;

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ApplicationHistory({
  applications,
}: {
  applications: WriterApplicationHistory[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applications.filter((item) => {
      const statusOk = status === "all" || item.status === status;
      const queryOk =
        !q ||
        item.display_name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.requested_role.toLowerCase().includes(q);
      return statusOk && queryOk;
    });
  }, [applications, query, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  function go(next: number) {
    setPage(Math.min(Math.max(1, next), totalPages));
  }

  return (
    <main style={{ maxWidth: 1450, margin: "0 auto", padding: "28px 18px 70px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <p style={{ margin: 0, opacity: .55, fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase" }}>SUPERADMIN</p>
          <h1 style={{ margin: "6px 0 5px", fontSize: 32 }}>Riwayat Permohonan Penulis</h1>
          <p style={{ margin: 0, opacity: .65 }}>Arsip permohonan Penulis yang tersimpan di sistem.</p>
        </div>

        <Link href="/admin/superadmin" style={{
          boxSizing: "border-box", display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: "auto", minWidth: 0, height: 38, minHeight: 38, maxHeight: 38, padding: "0 13px",
          borderRadius: 10, border: "1px solid rgba(70,91,76,.18)", background: "rgba(255,255,255,.88)",
          color: "#465b4c", textDecoration: "none", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap"
        }}>← Superadmin</Link>
      </div>

      <section style={{
        border: "1px solid rgba(70,91,76,.14)", borderRadius: 22, background: "rgba(255,255,255,.86)",
        padding: 20, boxShadow: "0 14px 40px rgba(60,70,62,.06)"
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(240px,1fr) 180px", gap: 10, marginBottom: 18 }}>
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Cari nama, email, atau pengajuan..."
            style={{ padding: "11px 12px", border: "1px solid #dfe3dc", borderRadius: 10, background: "#fff" }}
          />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            style={{ padding: "11px 12px", border: "1px solid #dfe3dc", borderRadius: 10, background: "#fff" }}
          >
            <option value="all">Semua status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                {["No.", "Nama", "Pengajuan", "Email", "Alasan", "Tanggal", "Status", "Diproses"].map((head) => (
                  <th key={head} style={{ padding: "11px 10px", borderBottom: "1px solid rgba(70,91,76,.14)", fontSize: 12, opacity: .58 }}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((item, index) => (
                <tr key={item.id}>
                  <td style={{ padding: "13px 10px", borderBottom: "1px solid rgba(70,91,76,.08)", opacity: .62 }}>{String(start + index + 1).padStart(2, "0")}</td>
                  <td style={{ padding: "13px 10px", borderBottom: "1px solid rgba(70,91,76,.08)" }}><strong>{item.display_name}</strong></td>
                  <td style={{ padding: "13px 10px", borderBottom: "1px solid rgba(70,91,76,.08)" }}>{item.requested_role}</td>
                  <td style={{ padding: "13px 10px", borderBottom: "1px solid rgba(70,91,76,.08)" }}>{item.email}</td>
                  <td style={{ padding: "13px 10px", borderBottom: "1px solid rgba(70,91,76,.08)", maxWidth: 320 }}>{item.reason || "—"}</td>
                  <td style={{ padding: "13px 10px", borderBottom: "1px solid rgba(70,91,76,.08)", whiteSpace: "nowrap" }}>{formatDate(item.created_at)}</td>
                  <td style={{ padding: "13px 10px", borderBottom: "1px solid rgba(70,91,76,.08)" }}>
                    <span style={{
                      display: "inline-flex", padding: "5px 9px", borderRadius: 999, fontSize: 12, fontWeight: 800,
                      background: item.status === "approved" ? "#e7f3e7" : item.status === "rejected" ? "#fff0ed" : "#f6f0df",
                      color: item.status === "approved" ? "#2e6b3b" : item.status === "rejected" ? "#a24b3c" : "#7a632c"
                    }}>{item.status}</span>
                  </td>
                  <td style={{ padding: "13px 10px", borderBottom: "1px solid rgba(70,91,76,.08)", whiteSpace: "nowrap" }}>{formatDate(item.reviewed_at)}</td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 34, textAlign: "center", opacity: .55 }}>Tidak ada riwayat yang sesuai.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > PAGE_SIZE && (
          <nav aria-label="Navigasi halaman riwayat" style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginTop: 18 }}>
            <button type="button" onClick={() => go(safePage - 1)} disabled={safePage === 1}
              style={{ width: 36, minWidth: 36, height: 36, borderRadius: 9, border: "1px solid #dfe3dc", background: "#fff", opacity: safePage === 1 ? .4 : 1 }}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" onClick={() => go(n)} aria-current={safePage === n ? "page" : undefined}
                style={{
                  width: 36, minWidth: 36, height: 36, borderRadius: 9,
                  border: safePage === n ? "1px solid #17663f" : "1px solid #dfe3dc",
                  background: safePage === n ? "#17663f" : "#fff", color: safePage === n ? "#fff" : "#465b4c", fontWeight: 800
                }}>{n}</button>
            ))}
            <button type="button" onClick={() => go(safePage + 1)} disabled={safePage === totalPages}
              style={{ width: 36, minWidth: 36, height: 36, borderRadius: 9, border: "1px solid #dfe3dc", background: "#fff", opacity: safePage === totalPages ? .4 : 1 }}>›</button>
          </nav>
        )}
      </section>
    </main>
  );
}
