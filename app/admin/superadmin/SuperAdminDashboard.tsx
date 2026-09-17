"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  approveWriterApplication,
  rejectWriterApplication,
  revokeWriterApplication,
  changeStaffRole,
  deactivateStaff,
  createAdminAccount,
} from "./actions";
import type {
  SuperAdminEntry,
  SuperAdminFolder,
  SuperAdminUser,
  WriterApplication,
} from "./page";

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function sectionLabel(section?: string) {
  if (section === "ruang-belajar") return "Ruang Belajar";
  if (section === "layanan") return "Perjalanan";
  if (section === "artikel") return "Artikel";
  if (section === "tentang") return "Tentang";
  if (section === "sinopsis") return "Sinopsis";
  if (section === "kontak") return "Kontak";
  return section || "—";
}

function safePreviewHtml(raw?: string | null) {
  if (!raw) return "";
  if (typeof window === "undefined") return "";

  const doc = new DOMParser().parseFromString(raw, "text/html");

  doc
    .querySelectorAll("script,iframe,object,embed,style,form")
    .forEach((node) => node.remove());

  doc.body.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach((attr) => {
      if (/^on/i.test(attr.name)) {
        element.removeAttribute(attr.name);
        return;
      }

      if (
        (attr.name === "href" || attr.name === "src") &&
        /^\s*(javascript:|data:text\/html)/i.test(attr.value)
      ) {
        element.removeAttribute(attr.name);
      }
    });
  });

  return doc.body.innerHTML;
}

function statusLabel(status?: string) {
  if (status === "published") return "Published";
  if (status === "review") return "Review";
  return "Draft";
}

export default function SuperAdminDashboard({
  entries,
  folders,
  admins,
  applications,
  currentUserId,
}: {
  entries: SuperAdminEntry[];
  folders: SuperAdminFolder[];
  admins: SuperAdminUser[];
  applications: WriterApplication[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [actionMessage, setActionMessage] = useState("");
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminPasswordConfirm, setNewAdminPasswordConfirm] = useState("");

  const adminMap = useMemo(
    () => new Map(admins.map((admin) => [admin.user_id, admin])),
    [admins]
  );


  const published = entries.filter(
    (entry) => entry.status === "published"
  ).length;

  const drafts = entries.filter(
    (entry) => entry.status === "draft"
  ).length;

  const reviews = entries.filter(
    (entry) => entry.status === "review"
  ).length;

  const tracked = entries.filter((entry) => entry.author_id).length;

  const trackedAuthorIds = new Set(
    entries
      .map((entry) => entry.author_id)
      .filter((value): value is string => Boolean(value))
  );

  const writerCount = trackedAuthorIds.size;


  function runApproveApplication(
    application: WriterApplication
  ) {
    if (
      !window.confirm(
        `Setujui ${application.display_name} sebagai ${
          application.requested_access === "admin"
            ? "Admin"
            : "Penulis"
        }?`
      )
    ) {
      return;
    }

    setActionMessage("");

    startTransition(async () => {
      try {
        await approveWriterApplication(application.id);

        setActionMessage(
          `Permohonan ${application.display_name} disetujui.`
        );

        router.refresh();
      } catch (error) {
        setActionMessage(
          error instanceof Error
            ? error.message
            : "Persetujuan permohonan gagal."
        );
      }
    });
  }

  function runRejectApplication(
    application: WriterApplication
  ) {
    if (
      !window.confirm(
        `Tolak permohonan ${application.display_name}?`
      )
    ) {
      return;
    }

    setActionMessage("");

    startTransition(async () => {
      try {
        await rejectWriterApplication(application.id);

        setActionMessage(
          `Permohonan ${application.display_name} ditolak.`
        );

        router.refresh();
      } catch (error) {
        setActionMessage(
          error instanceof Error
            ? error.message
            : "Penolakan permohonan gagal."
        );
      }
    });
  }

  function runCreateAdmin() {
    const displayName = newAdminName.trim();
    const email = newAdminEmail.trim();

    if (!displayName) {
      setActionMessage("Nama Admin wajib diisi.");
      return;
    }

    if (!email) {
      setActionMessage("Email Admin wajib diisi.");
      return;
    }

    if (newAdminPassword.length < 8) {
      setActionMessage("Password Admin minimal 8 karakter.");
      return;
    }

    if (newAdminPassword !== newAdminPasswordConfirm) {
      setActionMessage("Konfirmasi password Admin tidak sama.");
      return;
    }

    setActionMessage("");

    startTransition(async () => {
      try {
        await createAdminAccount({
          displayName,
          email,
          password: newAdminPassword,
        });

        setActionMessage(
          `${displayName} berhasil dibuat sebagai Admin. Admin sudah bisa login di /admin-login menggunakan email dan password yang dibuat di sini.`
        );

        setNewAdminName("");
        setNewAdminEmail("");
        setNewAdminPassword("");
        setNewAdminPasswordConfirm("");
        setShowAddAdmin(false);

        router.refresh();
      } catch (error) {
        setActionMessage(
          error instanceof Error
            ? error.message
            : "Gagal menambahkan Admin."
        );
      }
    });
  }

  function runDeactivateAdmin(user: SuperAdminUser) {
    const adminName =
      user.display_name?.trim() ||
      user.email?.trim() ||
      "Admin";

    if (
      !window.confirm(
        `Nonaktifkan akses Admin ${adminName}?\n\nAkun Auth/Reader tidak dihapus. Hanya akses Admin yang dicabut.`
      )
    ) {
      return;
    }

    setActionMessage("");

    startTransition(async () => {
      try {
        await deactivateStaff(user.user_id);
        setActionMessage(`Akses Admin ${adminName} berhasil dinonaktifkan.`);
        router.refresh();
      } catch (error) {
        setActionMessage(
          error instanceof Error
            ? error.message
            : "Gagal menonaktifkan Admin."
        );
      }
    });
  }

  function runRevokeApplication(
    application: WriterApplication
  ) {
    if (
      !window.confirm(
        `Nonaktifkan akses ${application.display_name}?\\n\\nUser akan langsung kehilangan akses dashboard. Akun Auth/Reader tidak dihapus dan bisa di-Accept lagi nanti.`
      )
    ) {
      return;
    }

    setActionMessage("");

    startTransition(async () => {
      try {
        await revokeWriterApplication(
          application.id
        );

        setActionMessage(
          `Akses ${application.display_name} berhasil dinonaktifkan.`
        );

        router.refresh();
      } catch (error) {
        setActionMessage(
          error instanceof Error
            ? error.message
            : "Gagal menonaktifkan akses user."
        );
      }
    });
  }

  const writerApplications = applications.filter(
    (application) => application.requested_access === "writer"
  );

  const pendingApplications = writerApplications.filter(
    (application) => application.status === "pending"
  );

  const approvedApplications = writerApplications.filter(
    (application) => application.status === "approved"
  ).length;

  const rejectedApplications = writerApplications.filter(
    (application) => application.status === "rejected"
  ).length;

  const adminAccounts = admins.filter(
    (user) => user.role === "admin"
  );

  const card = {
    border: "1px solid rgba(70,91,76,.14)",
    borderRadius: "22px",
    background: "rgba(255,255,255,.82)",
    boxShadow: "0 14px 40px rgba(60,70,62,.06)",
  } as const;

  return (
    <main
      style={{
        maxWidth: "1500px",
        margin: "0 auto",
        padding: "28px 18px 70px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "18px",
          alignItems: "flex-start",
          flexWrap: "wrap",
          marginBottom: "24px",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              opacity: 0.55,
              fontSize: "12px",
              letterSpacing: ".14em",
              textTransform: "uppercase",
            }}
          >
            menjadi nol
          </p>

          <h1 style={{ margin: "7px 0 5px", fontSize: "32px" }}>
            Super Admin
          </h1>

          <p style={{ margin: 0, opacity: 0.65 }}>
            Kelola akses, pendaftar, pengguna, peran, dan konten dari satu pusat.
          </p>
        </div>

        <Link
          href="/admin"
          style={{
            textDecoration: "none",
            color: "inherit",
            padding: "10px 14px",
            borderRadius: "999px",
            border: "1px solid rgba(70,91,76,.18)",
            background: "rgba(255,255,255,.7)",
          }}
        >
          ← Dashboard Admin
        </Link>
      </div>

      <nav
        aria-label="Index Superadmin"
        style={{
          ...card,
          padding: "12px 14px",
          marginBottom: "16px",
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <strong style={{ fontSize: "12px", marginRight: "4px" }}>
          INDEX SUPERADMIN
        </strong>
        <a href="#ringkasan" style={{ textDecoration: "none", color: "#465b4c", fontSize: "12px" }}>01 Ringkasan</a>
        <span style={{ opacity: .35 }}>·</span>
        <a href="#pendaftar" style={{ textDecoration: "none", color: "#465b4c", fontSize: "12px" }}>02 Pendaftar</a>
        <span style={{ opacity: .35 }}>·</span>
        <a href="#kelola-admin" style={{ textDecoration: "none", color: "#465b4c", fontSize: "12px" }}>
  03 Kelola Admin
</a>

<span style={{ opacity: .35 }}>·</span>

<Link
  href="/admin/superadmin/role-manager"
  style={{ textDecoration: "none", color: "#465b4c", fontSize: "12px" }}
>
  04 Role Manager
</Link>

<Link
  href="/admin/superadmin/user-manager"
  style={{ textDecoration: "none", color: "#465b4c", fontSize: "12px" }}
>
  05 User Manager
</Link>

<span style={{ opacity: .35 }}>·</span>

<Link
  href="/admin/superadmin/content-manager"
  style={{ textDecoration: "none", color: "#465b4c", fontSize: "12px" }}
>
  06 Content Manager
</Link>

<span style={{ opacity: .35 }}>·</span>

<a href="#permohonan" style={{ textDecoration: "none", color: "#465b4c", fontSize: "12px" }}>
  07 Riwayat Permohonan
</a>
      </nav>

      <div
        id="ringkasan"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        {[
          ["Total Tulisan", entries.length],
          ["Published", published],
          ["Draft", drafts],
          ["Review", reviews],
          ["Penulis", writerCount],
          ["Permohonan Pending", pendingApplications.length],
          ["Approved User", approvedApplications],
          ["Declined User", rejectedApplications],
          ["Sudah Terlacak", tracked],
        ].map(([label, value]) => (
          <div key={String(label)} style={{ ...card, padding: "18px" }}>
            <span style={{ fontSize: "12px", opacity: 0.58 }}>
              {label}
            </span>

            <strong
              style={{
                display: "block",
                marginTop: "7px",
                fontSize: "27px",
              }}
            >
              {value}
            </strong>
          </div>
        ))}
      </div>


      <section
        id="pendaftar"
        style={{
          ...card,
          padding: "20px",
          marginBottom: "20px",
          border: "1px solid rgba(120,147,107,.22)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "14px",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                letterSpacing: ".12em",
                textTransform: "uppercase",
                opacity: .52,
              }}
            >
              PENDAFTAR BARU
            </p>
            <h2 style={{ margin: "6px 0 0", fontSize: "20px" }}>
              Menunggu Persetujuan
            </h2>
          </div>

          <div
            style={{
              minWidth: "42px",
              height: "42px",
              borderRadius: "14px",
              display: "grid",
              placeItems: "center",
              background: "rgba(120,147,107,.12)",
              fontWeight: 800,
              fontSize: "18px",
            }}
            title="Jumlah permohonan Penulis pending"
          >
            {pendingApplications.length}
          </div>
        </div>

        {pendingApplications.length === 0 ? (
          <p
            style={{
              margin: 0,
              padding: "12px 0 2px",
              opacity: .58,
              fontSize: "13px",
            }}
          >
            Belum ada pendaftar Penulis yang menunggu persetujuan.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "900px",
              }}
            >
              <thead>
                <tr style={{ textAlign: "left" }}>
                  {[
                    "No.",
                    "Nama",
                    "Email",
                    "Daftar sebagai",
                    "Alasan",
                    "Tanggal",
                    "Aksi",
                  ].map((head) => (
                    <th
                      key={head}
                      style={{
                        padding: "10px",
                        borderBottom: "1px solid rgba(70,91,76,.14)",
                        fontSize: "12px",
                        opacity: .58,
                      }}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {pendingApplications.map((application, index) => (
                  <tr key={application.id}>
                    <td style={{ padding: "12px 10px", borderBottom: "1px solid rgba(70,91,76,.08)", opacity: .6 }}>
                      {String(index + 1).padStart(2, "0")}
                    </td>
                    <td style={{ padding: "12px 10px", borderBottom: "1px solid rgba(70,91,76,.08)" }}>
                      <strong>{application.display_name}</strong>
                      <small style={{ display: "block", opacity: .55, marginTop: "3px" }}>
                        {application.full_name}
                      </small>
                    </td>
                    <td style={{ padding: "12px 10px", borderBottom: "1px solid rgba(70,91,76,.08)" }}>
                      {application.email}
                    </td>
                    <td style={{ padding: "12px 10px", borderBottom: "1px solid rgba(70,91,76,.08)" }}>
                      {application.requested_access === "admin" ? "Admin" : "Penulis"}
                    </td>
                    <td style={{ padding: "12px 10px", borderBottom: "1px solid rgba(70,91,76,.08)", maxWidth: "300px" }}>
                      {application.reason}
                    </td>
                    <td style={{ padding: "12px 10px", borderBottom: "1px solid rgba(70,91,76,.08)", whiteSpace: "nowrap" }}>
                      {formatDate(application.created_at)}
                    </td>
                    <td style={{ padding: "12px 10px", borderBottom: "1px solid rgba(70,91,76,.08)" }}>
                      <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => runApproveApplication(application)}
                          style={{
                            minHeight: "34px",
                            padding: "7px 12px",
                            border: 0,
                            borderRadius: "999px",
                            background: "#78936b",
                            color: "#fff",
                            cursor: isPending ? "wait" : "pointer",
                            fontWeight: 700,
                            fontSize: "12px",
                            opacity: isPending ? .58 : 1,
                          }}
                        >
                          Accept
                        </button>

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => runRejectApplication(application)}
                          style={{
                            minHeight: "34px",
                            padding: "7px 12px",
                            border: "1px solid rgba(150,70,70,.18)",
                            borderRadius: "999px",
                            background: "#fff7f5",
                            color: "#98574f",
                            cursor: isPending ? "wait" : "pointer",
                            fontWeight: 700,
                            fontSize: "12px",
                            opacity: isPending ? .58 : 1,
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section
        id="kelola-admin"
        style={{
          ...card,
          padding: "20px",
          marginBottom: "20px",
          border: "1px solid rgba(120,147,107,.22)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "14px",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                letterSpacing: ".12em",
                textTransform: "uppercase",
                opacity: .52,
              }}
            >
              AKSES ADMIN
            </p>
            <h2 style={{ margin: "6px 0 0", fontSize: "20px" }}>
              Kelola Admin
            </h2>
            <p
              style={{
                margin: "6px 0 0",
                opacity: .6,
                fontSize: "12px",
                lineHeight: 1.55,
              }}
            >
              Admin dibuat langsung oleh Superadmin dan tidak melalui persetujuan pendaftar.
            </p>
          </div>

          <button
            type="button"
            disabled={isPending}
            onClick={() => setShowAddAdmin((current) => !current)}
            style={{
              minHeight: "40px",
              padding: "9px 14px",
              border: 0,
              borderRadius: "999px",
              background: "#78936b",
              color: "#fff",
              cursor: isPending ? "wait" : "pointer",
              fontWeight: 700,
              fontSize: "12px",
              opacity: isPending ? 0.58 : 1,
            }}
          >
            {showAddAdmin ? "Batal" : "+ Tambah Admin"}
          </button>
        </div>

        {showAddAdmin && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
              gap: "10px",
              padding: "14px",
              marginBottom: "14px",
              borderRadius: "16px",
              border: "1px solid rgba(120,147,107,.18)",
              background: "#fbfcf8",
            }}
          >
            <input
              type="text"
              value={newAdminName}
              onChange={(event) => setNewAdminName(event.target.value)}
              placeholder="Nama Admin"
              autoComplete="off"
              disabled={isPending}
              style={{
                minHeight: "42px",
                padding: "9px 12px",
                borderRadius: "12px",
                border: "1px solid rgba(70,91,76,.18)",
                background: "#fff",
              }}
            />

            <input
              type="email"
              value={newAdminEmail}
              onChange={(event) => setNewAdminEmail(event.target.value)}
              placeholder="Email Admin"
              autoComplete="off"
              disabled={isPending}
              style={{
                minHeight: "42px",
                padding: "9px 12px",
                borderRadius: "12px",
                border: "1px solid rgba(70,91,76,.18)",
                background: "#fff",
              }}
            />

            <input
              type="password"
              value={newAdminPassword}
              onChange={(event) => setNewAdminPassword(event.target.value)}
              placeholder="Password sementara (min. 8 karakter)"
              autoComplete="new-password"
              disabled={isPending}
              style={{
                minHeight: "42px",
                padding: "9px 12px",
                borderRadius: "12px",
                border: "1px solid rgba(70,91,76,.18)",
                background: "#fff",
              }}
            />

            <input
              type="password"
              value={newAdminPasswordConfirm}
              onChange={(event) => setNewAdminPasswordConfirm(event.target.value)}
              placeholder="Konfirmasi password"
              autoComplete="new-password"
              disabled={isPending}
              style={{
                minHeight: "42px",
                padding: "9px 12px",
                borderRadius: "12px",
                border: "1px solid rgba(70,91,76,.18)",
                background: "#fff",
              }}
            />

            <button
              type="button"
              disabled={isPending}
              onClick={runCreateAdmin}
              style={{
                minHeight: "42px",
                padding: "9px 14px",
                border: 0,
                borderRadius: "12px",
                background: "#78936b",
                color: "#fff",
                cursor: isPending ? "wait" : "pointer",
                fontWeight: 700,
              }}
            >
              {isPending ? "Menyimpan..." : "Buat Admin"}
            </button>
          </div>
        )}

        {actionMessage && (
          <div
            role="status"
            style={{
              marginBottom: "14px",
              padding: "11px 13px",
              borderRadius: "12px",
              border: "1px solid rgba(70,91,76,.12)",
              background: "rgba(241,246,238,.92)",
              color: "#465b4c",
              fontSize: "12px",
              lineHeight: 1.55,
            }}
          >
            {actionMessage}
          </div>
        )}

        {adminAccounts.length === 0 ? (
          <p
            style={{
              margin: 0,
              padding: "12px 0 2px",
              opacity: .58,
              fontSize: "13px",
            }}
          >
            Belum ada akun Admin aktif.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "720px",
              }}
            >
              <thead>
                <tr style={{ textAlign: "left" }}>
                  {["No.", "Nama Admin", "Email", "Status", "Aksi"].map((head) => (
                    <th
                      key={head}
                      style={{
                        padding: "10px",
                        borderBottom: "1px solid rgba(70,91,76,.14)",
                        fontSize: "12px",
                        opacity: .58,
                      }}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {adminAccounts.map((user, index) => (
                  <tr key={user.user_id}>
                    <td
                      style={{
                        padding: "12px 10px",
                        borderBottom: "1px solid rgba(70,91,76,.08)",
                        opacity: .6,
                      }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </td>
                    <td
                      style={{
                        padding: "12px 10px",
                        borderBottom: "1px solid rgba(70,91,76,.08)",
                      }}
                    >
                      <strong>{user.display_name || "Admin"}</strong>
                    </td>
                    <td
                      style={{
                        padding: "12px 10px",
                        borderBottom: "1px solid rgba(70,91,76,.08)",
                      }}
                    >
                      {user.email || "—"}
                    </td>
                    <td
                      style={{
                        padding: "12px 10px",
                        borderBottom: "1px solid rgba(70,91,76,.08)",
                      }}
                    >
                      <strong>Aktif</strong>
                    </td>
                    <td
                      style={{
                        padding: "12px 10px",
                        borderBottom: "1px solid rgba(70,91,76,.08)",
                      }}
                    >
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => runDeactivateAdmin(user)}
                        style={{
                          minHeight: "34px",
                          padding: "7px 12px",
                          borderRadius: "999px",
                          border: "1px solid rgba(150,70,70,.18)",
                          background: "#fff7f5",
                          color: "#98574f",
                          cursor: isPending ? "wait" : "pointer",
                          fontWeight: 700,
                          fontSize: "12px",
                          opacity: isPending ? .58 : 1,
                        }}
                      >
                        Nonaktifkan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section
        style={{
          ...card,
          padding: "20px",
          marginTop: "20px",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "11px",
            letterSpacing: ".14em",
            textTransform: "uppercase",
            opacity: .55,
          }}
        >
          kontrol akses
        </p>

        <h2
          style={{
            margin: "7px 0 14px",
            fontSize: "22px",
          }}
        >
          Hak Akses Superadmin
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(210px,1fr))",
            gap: "10px",
          }}
        >
          {[
            ["Approval Penulis", "Accept / Decline pendaftaran Penulis baru"],
            ["Kelola Admin", "Membuat dan menonaktifkan akun Admin secara langsung"],
            ["Publikasi", "Publish atau tarik tulisan"],
            ["Hapus permanen", "Menghapus tulisan dan lampiran"],
            ["Pengawasan", "Melihat penulis, status, preview, dan aktivitas"],
          ].map(([title, description]) => (
            <div
              key={title}
              style={{
                padding: "13px",
                borderRadius: "14px",
                border:
                  "1px solid rgba(70,91,76,.10)",
                background: "#fbfcf8",
              }}
            >
              <strong
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "#3f5746",
                }}
              >
                {title}
              </strong>
              <span
                style={{
                  display: "block",
                  marginTop: "5px",
                  fontSize: "12px",
                  opacity: .64,
                  lineHeight: 1.5,
                }}
              >
                {description}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section
        id="permohonan"
        style={{
          ...card,
          padding: "20px",
          marginTop: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "14px",
            alignItems: "flex-start",
            flexWrap: "wrap",
            marginBottom: "16px",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                letterSpacing: ".14em",
                textTransform: "uppercase",
                opacity: .55,
              }}
            >
              akses pengelolaan
            </p>

            <h2
              style={{
                margin: "7px 0 4px",
                fontSize: "22px",
              }}
            >
              Riwayat Permohonan Penulis
            </h2>

            <p
              style={{
                margin: 0,
                opacity: .62,
                fontSize: "13px",
              }}
            >
              Riwayat pendaftaran Penulis yang diproses oleh Superadmin.
            </p>
          </div>

          <Link
            href="/writer-register"
            style={{
              textDecoration: "none",
              color: "#465b4c",
              padding: "9px 13px",
              borderRadius: "999px",
              border: "1px solid rgba(70,91,76,.18)",
              background: "#fff",
              fontSize: "12px",
              fontWeight: 650,
            }}
          >
            Buka form pendaftaran
          </Link>
        </div>

        {writerApplications.length === 0 ? (
          <p
            style={{
              margin: 0,
              padding: "18px 0 4px",
              opacity: .56,
              fontSize: "13px",
            }}
          >
            Belum ada data permohonan Penulis yang tersimpan.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "1080px",
              }}
            >
              <thead>
                <tr style={{ textAlign: "left" }}>
                  {[
                    "No.",
                    "Nama",
                    "Pengajuan",
                    "Email",
                    "Alasan",
                    "Tanggal",
                    "Status",
                    "Aksi",
                  ].map((head) => (
                    <th
                      key={head}
                      style={{
                        padding: "11px 10px",
                        borderBottom: "1px solid rgba(70,91,76,.14)",
                        fontSize: "12px",
                        opacity: .58,
                      }}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {writerApplications.map((application, index) => (
                  <tr key={application.id}>
                    <td style={{ padding: "13px 10px", borderBottom: "1px solid rgba(70,91,76,.08)", opacity: .62 }}>
                      {String(index + 1).padStart(2, "0")}
                    </td>
                    <td style={{ padding: "13px 10px", borderBottom: "1px solid rgba(70,91,76,.08)" }}>
                      <strong>{application.display_name}</strong>
                      <small style={{ display: "block", marginTop: "3px", opacity: .55 }}>
                        {application.full_name}
                      </small>
                    </td>
                    <td style={{ padding: "13px 10px", borderBottom: "1px solid rgba(70,91,76,.08)" }}>
                      {application.requested_access === "admin" ? "Admin" : "Penulis"}
                    </td>
                    <td style={{ padding: "13px 10px", borderBottom: "1px solid rgba(70,91,76,.08)" }}>
                      {application.email}
                    </td>
                    <td style={{ maxWidth: "330px", padding: "13px 10px", borderBottom: "1px solid rgba(70,91,76,.08)", lineHeight: 1.55 }}>
                      {application.reason}
                    </td>
                    <td style={{ padding: "13px 10px", borderBottom: "1px solid rgba(70,91,76,.08)", whiteSpace: "nowrap" }}>
                      {formatDate(application.created_at)}
                    </td>
                    <td style={{ padding: "13px 10px", borderBottom: "1px solid rgba(70,91,76,.08)" }}>
                      <strong>{application.status === "pending" ? "Pending" : application.status === "approved" ? "Approved" : "Declined"}</strong>
                    </td>
                    <td style={{ padding: "13px 10px", borderBottom: "1px solid rgba(70,91,76,.08)" }}>
                      {application.status === "pending" ? (
                        <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => runApproveApplication(application)}
                            style={{
                              border: 0,
                              borderRadius: "999px",
                              padding: "7px 11px",
                              background: "#78936b",
                              color: "#fff",
                              cursor: isPending ? "wait" : "pointer",
                              fontWeight: 700,
                              fontSize: "12px",
                            }}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => runRejectApplication(application)}
                            style={{
                              border: "1px solid rgba(150,70,70,.18)",
                              borderRadius: "999px",
                              padding: "7px 11px",
                              background: "#fff7f5",
                              color: "#98574f",
                              cursor: isPending ? "wait" : "pointer",
                              fontWeight: 700,
                              fontSize: "12px",
                            }}
                          >
                            Decline
                          </button>
                        </div>
                      ) : application.status === "approved" ? (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => runRevokeApplication(application)}
                          style={{
                            border: "1px solid rgba(150,70,70,.18)",
                            borderRadius: "999px",
                            padding: "7px 11px",
                            background: "#fff7f5",
                            color: "#98574f",
                            cursor: isPending ? "wait" : "pointer",
                            fontWeight: 700,
                            fontSize: "12px",
                          }}
                        >
                          Nonaktifkan
                        </button>
                      ) : (
                        <span style={{ fontSize: "12px", opacity: .55 }}>
                          Declined
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {tracked < entries.length && (
        <p
          style={{
            margin: "12px 4px 0",
            fontSize: "11px",
            opacity: 0.62,
            lineHeight: 1.6,
          }}
        >
          Catatan: tulisan lama yang dibuat sebelum pencatatan author_id aktif
          akan tampil sebagai “Konten lama” sampai data penulisnya diisi.
        </p>
      )}

    </main>
  );
}

