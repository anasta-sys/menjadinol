"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  publishEntry,
  unpublishEntry,
  deleteEntry,
  approveWriterApplication,
  rejectWriterApplication,
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

  const [status, setStatus] = useState("all");
  const [author, setAuthor] = useState("all");
  const [query, setQuery] = useState("");
  const [previewEntry, setPreviewEntry] =
    useState<SuperAdminEntry | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");

  const folderMap = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder])),
    [folders]
  );

  const adminMap = useMemo(
    () => new Map(admins.map((admin) => [admin.user_id, admin])),
    [admins]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return entries.filter((entry) => {
      if (status !== "all" && entry.status !== status) return false;
      if (author !== "all" && entry.author_id !== author) return false;

      if (needle) {
        const owner = entry.author_id
          ? adminMap.get(entry.author_id)
          : undefined;

        const haystack = [
          entry.title,
          entry.slug,
          owner?.display_name,
          owner?.email,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(needle)) return false;
      }

      return true;
    });
  }, [entries, status, author, query, adminMap]);

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

  function runPublish(entry: SuperAdminEntry) {
    const label =
      entry.status === "published"
        ? "Tarik tulisan ini menjadi Draft?"
        : "Publish tulisan ini sekarang?";

    if (!window.confirm(label)) return;

    setActionMessage("");

    startTransition(async () => {
      try {
        if (entry.status === "published") {
          await unpublishEntry(entry.id);
          setActionMessage(`“${entry.title}” ditarik menjadi Draft.`);
        } else {
          await publishEntry(entry.id);
          setActionMessage(`“${entry.title}” berhasil dipublish.`);
        }

        router.refresh();
      } catch (error) {
        setActionMessage(
          error instanceof Error
            ? error.message
            : "Tindakan publikasi gagal."
        );
      }
    });
  }

  function runDelete(entry: SuperAdminEntry) {
    const owner = entry.author_id
      ? adminMap.get(entry.author_id)
      : undefined;

    const authorName =
      owner?.display_name ||
      owner?.email ||
      (entry.author_id ? "Admin" : "Konten lama");

    if (
      !window.confirm(
        `Hapus permanen tulisan “${entry.title}” milik ${authorName}?\\n\\nTulisan dan lampiran terkait akan dihapus. Tindakan ini tidak dapat dibatalkan.`
      )
    ) {
      return;
    }

    setActionMessage("");

    startTransition(async () => {
      try {
        await deleteEntry(entry.id);
        setPreviewEntry((current) =>
          current?.id === entry.id ? null : current
        );
        setActionMessage(`“${entry.title}” berhasil dihapus.`);
        router.refresh();
      } catch (error) {
        setActionMessage(
          error instanceof Error
            ? error.message
            : "Gagal menghapus tulisan."
        );
      }
    });
  }

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

  setActionMessage("");

  startTransition(async () => {
    try {
      await createAdminAccount({
        displayName,
        email,
      });

      setActionMessage(
        `${displayName} berhasil ditambahkan sebagai Admin.`
      );

      setNewAdminName("");
      setNewAdminEmail("");
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

  function runChangeRole(
  user: SuperAdminUser,
  newRole: "writer" | "admin"
) {
  const currentLabel =
    user.role === "admin"
      ? "Admin"
      : user.role === "writer"
        ? "Penulis"
        : user.role;

  const newLabel =
    newRole === "admin"
      ? "Admin"
      : "Penulis";

  if (
    !window.confirm(
      `Ubah ${user.display_name || user.email || "user"} dari ${currentLabel} menjadi ${newLabel}?`
    )
  ) {
    return;
  }

  setActionMessage("");

  startTransition(async () => {
    try {
      await changeStaffRole(
        user.user_id,
        newRole
      );

      setActionMessage(
        `${user.display_name || user.email || "User"} sekarang menjadi ${newLabel}.`
      );

      router.refresh();
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : "Gagal mengubah role."
      );
    }
  });
}

function runDeactivateStaff(
  user: SuperAdminUser
) {
  if (
    !window.confirm(
      `Nonaktifkan akses ${user.display_name || user.email || "user"}?\n\nAkun login tidak akan dihapus, tetapi akses sebagai Penulis/Admin akan dicabut.`
    )
  ) {
    return;
  }

  setActionMessage("");

  startTransition(async () => {
    try {
      await deactivateStaff(
        user.user_id
      );

      setActionMessage(
        `Akses ${user.display_name || user.email || "User"} berhasil dinonaktifkan.`
      );

      router.refresh();
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : "Gagal menonaktifkan akses."
      );
    }
  });
}

  const pendingApplications = applications.filter(
    (application) => application.status === "pending"
  );

  const processedApplications = applications.filter(
  (application) => application.status !== "pending"
  );

  const approvedApplications = applications.filter(
    (application) => application.status === "approved"
  ).length;

  const rejectedApplications = applications.filter(
    (application) => application.status === "rejected"
  ).length;

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
            Pantau tulisan, status publikasi, dan penulis dari satu tempat.
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
        <a href="#konten" style={{ textDecoration: "none", color: "#465b4c", fontSize: "12px" }}>03 Konten</a>
        <span style={{ opacity: .35 }}>·</span>
        <a href="#permohonan" style={{ textDecoration: "none", color: "#465b4c", fontSize: "12px" }}>04 Riwayat Permohonan</a>
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
                opacity: 0.52,
              }}
            >
              PENDAFTAR BARU
            </p>

            <h2 style={{ margin: "6px 0 0", fontSize: "20px" }}>
              Menunggu Persetujuan
            </h2>

            <p style={{ margin: "6px 0 0", opacity: 0.58, fontSize: "13px" }}>
              Permohonan Penulis atau Admin yang belum diproses.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "9px", flexWrap: "wrap" }}>
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
              title="Jumlah permohonan pending"
            >
              {pendingApplications.length}
            </div>
          </div>
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
            }}
          >
            {actionMessage}
          </div>
        )}

        {pendingApplications.length === 0 ? (
          <p style={{ margin: 0, padding: "12px 0 2px", opacity: 0.58, fontSize: "13px" }}>
            Tidak ada pendaftar baru yang menunggu persetujuan.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
              <thead>
                <tr style={{ textAlign: "left" }}>
                  {["No.", "Nama", "Email", "Pengajuan", "Alasan", "Tanggal", "Aksi"].map((head) => (
                    <th
                      key={head}
                      style={{
                        padding: "10px",
                        borderBottom: "1px solid rgba(70,91,76,.14)",
                        fontSize: "12px",
                        opacity: 0.58,
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
                    <td style={{ padding: "12px 10px", borderBottom: "1px solid rgba(70,91,76,.08)", opacity: 0.6 }}>
                      {String(index + 1).padStart(2, "0")}
                    </td>
                    <td style={{ padding: "12px 10px", borderBottom: "1px solid rgba(70,91,76,.08)" }}>
                      <strong>{application.display_name}</strong>
                      <small style={{ display: "block", marginTop: "3px", opacity: 0.55 }}>
                        {application.full_name}
                      </small>
                    </td>
                    <td style={{ padding: "12px 10px", borderBottom: "1px solid rgba(70,91,76,.08)" }}>
                      {application.email}
                    </td>
                    <td style={{ padding: "12px 10px", borderBottom: "1px solid rgba(70,91,76,.08)" }}>
                      <strong>{application.requested_access === "admin" ? "Admin" : "Penulis"}</strong>
                    </td>
                    <td style={{ maxWidth: "320px", padding: "12px 10px", borderBottom: "1px solid rgba(70,91,76,.08)", lineHeight: 1.5 }}>
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
                            opacity: isPending ? 0.58 : 1,
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
                            opacity: isPending ? 0.58 : 1,
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

      <section id="konten" style={{ ...card, padding: "20px" }}>
        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "18px",
          }}
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari judul atau penulis..."
            style={{
              flex: "1 1 260px",
              minHeight: "42px",
              padding: "9px 12px",
              borderRadius: "12px",
              border: "1px solid rgba(70,91,76,.18)",
              background: "white",
            }}
          />

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            style={{
              minHeight: "42px",
              padding: "9px 12px",
              borderRadius: "12px",
              border: "1px solid rgba(70,91,76,.18)",
              background: "white",
            }}
          >
            <option value="all">Semua status</option>
            <option value="published">Published</option>
            <option value="review">Review</option>
            <option value="draft">Draft</option>
          </select>

          <select
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            style={{
              minHeight: "42px",
              padding: "9px 12px",
              borderRadius: "12px",
              border: "1px solid rgba(70,91,76,.18)",
              background: "white",
            }}
          >
            <option value="all">Semua penulis</option>

            {admins.map((item) => (
              <option key={item.user_id} value={item.user_id}>
                {item.display_name ||
                  item.email ||
                  (item.user_id === currentUserId ? "Saya" : "Admin")}
              </option>
            ))}
          </select>
        </div>

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

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "1120px",
            }}
          >
            <thead>
              <tr style={{ textAlign: "left" }}>
                {[
                  "No.",
                  "Tulisan",
                  "Penulis",
                  "Bagian",
                  "Folder",
                  "Status",
                  "Dipublish",
                  "Aksi",
                ].map((head) => (
                  <th
                    key={head}
                    style={{
                      padding: "11px 10px",
                      borderBottom: "1px solid rgba(70,91,76,.14)",
                      fontSize: "12px",
                      opacity: 0.58,
                    }}
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.map((entry, index) => {
                const folder = entry.folder_id
                  ? folderMap.get(entry.folder_id)
                  : undefined;

                const owner = entry.author_id
                  ? adminMap.get(entry.author_id)
                  : undefined;

                return (
                  <tr key={entry.id}>
                    <td
                      style={{
                        width: "54px",
                        padding: "13px 10px",
                        borderBottom: "1px solid rgba(70,91,76,.08)",
                        fontVariantNumeric: "tabular-nums",
                        opacity: .62,
                      }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </td>

                    <td
                      style={{
                        padding: "13px 10px",
                        borderBottom: "1px solid rgba(70,91,76,.08)",
                      }}
                    >
                      <strong>{entry.title}</strong>

                      <small
                        style={{
                          display: "block",
                          opacity: 0.52,
                          marginTop: "3px",
                        }}
                      >
                        /{entry.slug}
                      </small>
                    </td>

                    <td
                      style={{
                        padding: "13px 10px",
                        borderBottom: "1px solid rgba(70,91,76,.08)",
                      }}
                    >
                      {owner?.display_name ||
                        owner?.email ||
                        (entry.author_id
                          ? "Admin"
                          : "Konten lama")}
                    </td>

                    <td
                      style={{
                        padding: "13px 10px",
                        borderBottom: "1px solid rgba(70,91,76,.08)",
                      }}
                    >
                      {sectionLabel(folder?.section)}
                    </td>

                    <td
                      style={{
                        padding: "13px 10px",
                        borderBottom: "1px solid rgba(70,91,76,.08)",
                      }}
                    >
                      {folder?.title ?? "—"}
                    </td>

                    <td
                      style={{
                        padding: "13px 10px",
                        borderBottom: "1px solid rgba(70,91,76,.08)",
                      }}
                    >
                      <strong>{statusLabel(entry.status)}</strong>
                    </td>

                    <td
                      style={{
                        padding: "13px 10px",
                        borderBottom: "1px solid rgba(70,91,76,.08)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(
                        entry.published_at ?? entry.created_at
                      )}
                    </td>

                    <td
                      style={{
                        padding: "13px 10px",
                        borderBottom: "1px solid rgba(70,91,76,.08)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "7px",
                          minWidth: "245px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setPreviewEntry(entry)}
                          disabled={isPending}
                          style={{
                            minHeight: "34px",
                            padding: "7px 12px",
                            borderRadius: "999px",
                            border: "1px solid rgba(70,91,76,.18)",
                            background: "#fff",
                            color: "#36503d",
                            cursor: isPending ? "wait" : "pointer",
                            fontWeight: 650,
                            fontSize: "12px",
                            opacity: isPending ? 0.58 : 1,
                          }}
                        >
                          Preview
                        </button>

                        <button
                          type="button"
                          onClick={() => runPublish(entry)}
                          disabled={isPending}
                          style={{
                            minHeight: "34px",
                            padding: "7px 12px",
                            borderRadius: "999px",
                            border: 0,
                            background:
                              entry.status === "published"
                                ? "#efe8d8"
                                : "#78936b",
                            color:
                              entry.status === "published"
                                ? "#654f32"
                                : "#fff",
                            cursor: isPending ? "wait" : "pointer",
                            fontWeight: 700,
                            fontSize: "12px",
                            opacity: isPending ? 0.58 : 1,
                          }}
                        >
                          {entry.status === "published"
                            ? "Tarik"
                            : "Publish"}
                        </button>

                        <button
                          type="button"
                          onClick={() => runDelete(entry)}
                          disabled={isPending}
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
                            opacity: isPending ? 0.58 : 1,
                          }}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <p
            style={{
              textAlign: "center",
              padding: "28px 10px 10px",
              opacity: 0.58,
            }}
          >
            Tidak ada tulisan sesuai filter.
          </p>
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
            ["Approval akun", "Accept / Decline Penulis dan Admin baru"],
            ["Kontrol role", "Menentukan writer atau admin saat approval"],
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
              Permohonan Penulis & Admin
            </h2>

            <p
              style={{
                margin: 0,
                opacity: .62,
                fontSize: "13px",
              }}
            >
              Hanya Superadmin yang dapat menyetujui akses baru.
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

        {processedApplications.length === 0 ? (
          <p
            style={{
              margin: 0,
              padding: "18px 0 4px",
              opacity: .56,
              fontSize: "13px",
            }}
          >
            Belum ada data permohonan Penulis/Admin yang tersimpan.
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
                {processedApplications.map((application, index) => (
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
                            style={{ minHeight: "34px", padding: "7px 12px", border: 0, borderRadius: "999px", background: "#78936b", color: "#fff", cursor: isPending ? "wait" : "pointer", fontWeight: 700, fontSize: "12px", opacity: isPending ? .58 : 1 }}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => runRejectApplication(application)}
                            style={{ minHeight: "34px", padding: "7px 12px", border: "1px solid rgba(150,70,70,.18)", borderRadius: "999px", background: "#fff7f5", color: "#98574f", cursor: isPending ? "wait" : "pointer", fontWeight: 700, fontSize: "12px", opacity: isPending ? .58 : 1 }}
                          >
                            Decline
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: "12px", opacity: .5 }}>
                          Sudah diproses
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

      {previewEntry && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${previewEntry.title}`}
          onClick={() => setPreviewEntry(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            padding: "22px",
            background: "rgba(30,39,33,.38)",
            backdropFilter: "blur(7px)",
          }}
        >
          <article
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(820px,100%)",
              maxHeight: "86vh",
              overflowY: "auto",
              borderRadius: "24px",
              border: "1px solid rgba(70,91,76,.14)",
              background: "#fffdf9",
              boxShadow: "0 30px 90px rgba(31,41,34,.22)",
              padding: "30px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "18px",
                alignItems: "flex-start",
                marginBottom: "24px",
              }}
            >
              <div>
                <p
                  style={{
                    margin: "0 0 8px",
                    fontSize: "11px",
                    letterSpacing: ".14em",
                    textTransform: "uppercase",
                    opacity: 0.55,
                  }}
                >
                  Preview · {statusLabel(previewEntry.status)}
                </p>

                <h2
                  style={{
                    margin: 0,
                    color: "#29412f",
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: "clamp(28px,4vw,42px)",
                    lineHeight: 1.1,
                  }}
                >
                  {previewEntry.title}
                </h2>

                {previewEntry.excerpt ? (
                  <p
                    style={{
                      margin: "13px 0 0",
                      color: "#737a72",
                      lineHeight: 1.7,
                    }}
                  >
                    {previewEntry.excerpt}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setPreviewEntry(null)}
                aria-label="Tutup preview"
                style={{
                  width: "38px",
                  height: "38px",
                  flex: "0 0 38px",
                  borderRadius: "50%",
                  border: "1px solid rgba(70,91,76,.16)",
                  background: "#fff",
                  cursor: "pointer",
                  color: "#465b4c",
                  fontSize: "20px",
                }}
              >
                ×
              </button>

              <div
                style={{
                  display: "flex",
                  gap: "7px",
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => runPublish(previewEntry)}
                  style={{
                    minHeight: "36px",
                    padding: "7px 13px",
                    border: 0,
                    borderRadius: "999px",
                    background:
                      previewEntry.status === "published"
                        ? "#efe8d8"
                        : "#78936b",
                    color:
                      previewEntry.status === "published"
                        ? "#654f32"
                        : "#fff",
                    cursor: isPending ? "wait" : "pointer",
                    fontWeight: 700,
                  }}
                >
                  {previewEntry.status === "published"
                    ? "Tarik ke Draft"
                    : "Publish"}
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => runDelete(previewEntry)}
                  style={{
                    minHeight: "36px",
                    padding: "7px 13px",
                    border: "1px solid rgba(150,70,70,.18)",
                    borderRadius: "999px",
                    background: "#fff7f5",
                    color: "#98574f",
                    cursor: isPending ? "wait" : "pointer",
                    fontWeight: 700,
                  }}
                >
                  Hapus
                </button>
              </div>
            </div>

            <div
              style={{
                borderTop: "1px solid rgba(70,91,76,.10)",
                paddingTop: "22px",
                color: "#36443a",
                fontSize: "15px",
                lineHeight: 1.85,
              }}
              dangerouslySetInnerHTML={{
                __html: safePreviewHtml(previewEntry.body),
              }}
            />

            {!previewEntry.body?.trim() && (
              <p style={{ opacity: 0.58 }}>
                Tulisan ini belum memiliki isi teks untuk dipreview.
              </p>
            )}
          </article>
        </div>
      )}
    </main>
  );
}