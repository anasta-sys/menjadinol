"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deactivateUser, deleteUserPermanently } from "./actions";

export type ManagedUser = {
  user_id: string;
  role: string;
  display_name: string | null;
  email: string | null;
  status: "active" | "inactive";
};

function roleLabel(role: string) {
  if (role === "superadmin") return "Superadmin";
  if (role === "admin") return "Admin";
  if (role === "writer") return "Penulis";
  return "Pembaca";
}

export default function UserManager({
  users,
  currentUserId,
}: {
  users: ManagedUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [message, setMessage] = useState("");

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return users.filter((user) => {
      if (filterRole !== "all" && user.role !== filterRole) return false;
      if (!q) return true;

      return [
        user.display_name,
        user.email,
        roleLabel(user.role),
        user.status === "active" ? "aktif" : "nonaktif",
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [users, search, filterRole]);

  function runDeactivate(user: ManagedUser) {
    const name = user.display_name || user.email || "User";

    if (
      !window.confirm(
        `Nonaktifkan akun ${name}?\n\nUser tidak dapat login. Akun belum dihapus dan tombol Hapus Permanen baru muncul setelah status Nonaktif.`
      )
    ) {
      return;
    }

    setMessage("");

    startTransition(async () => {
      try {
        await deactivateUser(user.user_id);
        setMessage(`Akun ${name} berhasil dinonaktifkan.`);
        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Gagal menonaktifkan akun."
        );
      }
    });
  }

  function runDelete(user: ManagedUser) {
    const name = user.display_name || user.email || "User";

    if (
      !window.confirm(
        `HAPUS PERMANEN akun ${name}?\n\nTindakan ini tidak dapat dibatalkan. Lanjutkan?`
      )
    ) {
      return;
    }

    setMessage("");

    startTransition(async () => {
      try {
        await deleteUserPermanently(user.user_id);
        setMessage(`Akun ${name} berhasil dihapus permanen.`);
        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Gagal menghapus akun."
        );
      }
    });
  }

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
            User Manager
          </h1>

          <p style={{ margin: 0, opacity: 0.65 }}>
            Kelola akun Pembaca, Penulis, Admin, dan Superadmin.
          </p>
        </div>

        <Link
          href="/admin/superadmin"
          style={{
            textDecoration: "none",
            color: "#ffffff",
            padding: "10px 16px",
            borderRadius: "999px",
            border: "1px solid #17663f",
            background: "#17663f",
            fontWeight: 800,
            boxShadow: "0 8px 20px rgba(23,102,63,.16)",
          }}
        >
          ← Super Admin
        </Link>
      </div>

      <section style={{ ...card, padding: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "14px",
            alignItems: "flex-end",
            flexWrap: "wrap",
            marginBottom: "18px",
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
              KELOLA USER
            </p>
            <h2 style={{ margin: "6px 0 0", fontSize: "20px" }}>
              Daftar Semua User
            </h2>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama / email..."
              style={{
                minHeight: "38px",
                minWidth: "220px",
                border: "1px solid rgba(70,91,76,.18)",
                borderRadius: "10px",
                background: "#fff",
                padding: "0 11px",
              }}
            />

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              style={{
                minHeight: "38px",
                border: "1px solid rgba(70,91,76,.18)",
                borderRadius: "10px",
                background: "#fff",
                padding: "0 10px",
              }}
            >
              <option value="all">Semua Role</option>
              <option value="reader">Pembaca</option>
              <option value="writer">Penulis</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </div>
        </div>

        {message ? (
          <div
            style={{
              marginBottom: "14px",
              padding: "11px 13px",
              borderRadius: "12px",
              background: "rgba(120,147,107,.10)",
              border: "1px solid rgba(120,147,107,.18)",
              fontSize: "12px",
            }}
          >
            {message}
          </div>
        ) : null}

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              minWidth: "850px",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid rgba(70,91,76,.14)",
                  textAlign: "left",
                }}
              >
                <th style={{ padding: "11px 10px", width: "60px" }}>No</th>
                <th style={{ padding: "11px 10px" }}>Nama User</th>
                <th style={{ padding: "11px 10px" }}>Email</th>
                <th style={{ padding: "11px 10px" }}>Role</th>
                <th style={{ padding: "11px 10px" }}>Status</th>
                <th style={{ padding: "11px 10px", textAlign: "right" }}>
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((user, index) => {
                const protectedAccount =
                  user.user_id === currentUserId ||
                  user.role === "superadmin";

                return (
                  <tr
                    key={user.user_id}
                    style={{
                      borderBottom: "1px solid rgba(70,91,76,.09)",
                    }}
                  >
                    <td style={{ padding: "13px 10px", opacity: 0.6 }}>
                      {index + 1}
                    </td>

                    <td style={{ padding: "13px 10px", fontWeight: 800 }}>
                      {user.display_name || "—"}
                    </td>

                    <td style={{ padding: "13px 10px" }}>
                      {user.email || "—"}
                    </td>

                    <td style={{ padding: "13px 10px" }}>
                      {roleLabel(user.role)}
                    </td>

                    <td style={{ padding: "13px 10px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          padding: "6px 10px",
                          borderRadius: "999px",
                          fontSize: "11px",
                          fontWeight: 800,
                          background:
                            user.status === "active"
                              ? "rgba(60,125,78,.10)"
                              : "rgba(157,74,61,.10)",
                          color:
                            user.status === "active"
                              ? "#3f7a52"
                              : "#9a5143",
                        }}
                      >
                        {user.status === "active" ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>

                    <td style={{ padding: "13px 10px", textAlign: "right" }}>
                      {protectedAccount ? (
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 800,
                            opacity: 0.62,
                          }}
                        >
                          🔒 Dilindungi
                        </span>
                      ) : user.status === "active" ? (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => runDeactivate(user)}
                          style={{
                            minHeight: "34px",
                            padding: "7px 13px",
                            borderRadius: "999px",
                            border: "1px solid rgba(177,126,34,.28)",
                            background: "#fffaf0",
                            color: "#8a651d",
                            fontWeight: 800,
                            cursor: isPending ? "wait" : "pointer",
                            opacity: isPending ? 0.58 : 1,
                          }}
                        >
                          Nonaktifkan
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => runDelete(user)}
                          style={{
                            minHeight: "34px",
                            padding: "7px 13px",
                            borderRadius: "999px",
                            border: "1px solid rgba(145,45,45,.28)",
                            background: "#fff7f5",
                            color: "#a13f37",
                            fontWeight: 800,
                            cursor: isPending ? "wait" : "pointer",
                            opacity: isPending ? 0.58 : 1,
                          }}
                        >
                          🗑 Hapus Permanen
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: "28px 10px",
                      textAlign: "center",
                      opacity: 0.58,
                    }}
                  >
                    User tidak ditemukan.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
