"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  changeManagedUserRole,
  type ManagedRole,
} from "./actions";

export type ManagedUser = {
  user_id: string;
  role: string;
  display_name: string | null;
  email: string | null;
};

function roleLabel(role: string) {
  if (role === "superadmin") return "Superadmin";
  if (role === "admin") return "Admin";
  if (role === "writer") return "Penulis";
  if (role === "reader") return "Pembaca";
  return role;
}

export default function RoleManager({
  users,
  currentUserId,
}: {
  users: ManagedUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [draftRoles, setDraftRoles] = useState<Record<string, ManagedRole>>({});

  const visibleUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((u) =>
      [u.display_name, u.email, roleLabel(u.role)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [users, query]);

  function runChange(user: ManagedUser) {
    if (user.role === "superadmin") return;

    const nextRole =
      draftRoles[user.user_id] ||
      (user.role as ManagedRole);

    if (nextRole === user.role) {
      setMessage("Role tujuan masih sama dengan role saat ini.");
      return;
    }

    const name = user.display_name || user.email || "User";
    if (
      !window.confirm(
        `Ubah akses ${name} dari ${roleLabel(user.role)} menjadi ${roleLabel(nextRole)}?`
      )
    ) return;

    setMessage("");
    startTransition(async () => {
      try {
        await changeManagedUserRole(user.user_id, nextRole);
        setMessage(
          `${name} berhasil diubah menjadi ${roleLabel(nextRole)}.`
        );
        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Perubahan role gagal."
        );
      }
    });
  }

  const card = {
    border: "1px solid rgba(70,91,76,.14)",
    borderRadius: "22px",
    background: "rgba(255,255,255,.86)",
    boxShadow: "0 14px 40px rgba(60,70,62,.06)",
  } as const;

  return (
    <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "28px 18px 70px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
        <div>
          <p style={{ margin: 0, opacity: .55, fontSize: "11px", letterSpacing: ".14em", textTransform: "uppercase" }}>
            menjadi nol · secure access
          </p>
          <h1 style={{ margin: "7px 0 5px", fontSize: "30px" }}>Role Manager</h1>
          <p style={{ margin: 0, opacity: .64 }}>
            Kelola akses Admin, Penulis, dan Pembaca tanpa mengubah dashboard Superadmin lama.
          </p>
        </div>
        <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  }}
>
  <Link
    href="/admin"
    style={{
      textDecoration: "none",
      color: "#465b4c",
      padding: "8px 13px",
      borderRadius: "10px",
      border: "1px solid rgba(70,91,76,.16)",
      background: "rgba(255,255,255,.88)",
      fontSize: "12px",
      fontWeight: 650,
      lineHeight: 1,
      whiteSpace: "nowrap",
    }}
  >
    Dashboard Admin
  </Link>

  <Link
    href="/admin/superadmin"
    style={{
      textDecoration: "none",
      color: "#fff",
      padding: "8px 13px",
      borderRadius: "10px",
      border: "1px solid #465b4c",
      background: "#465b4c",
      fontSize: "12px",
      fontWeight: 650,
      lineHeight: 1,
      whiteSpace: "nowrap",
    }}
  >
    Superadmin
  </Link>
</div>
      </div>

      <section style={{ ...card, padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <strong>Kelola Akses User</strong>
            <p style={{ margin: "5px 0 0", fontSize: "12px", opacity: .6 }}>
              Superadmin tidak dapat diubah. Akun Auth user tidak dihapus.
            </p>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama, email, role..."
            style={{ minHeight: "40px", minWidth: "260px", padding: "8px 12px", borderRadius: "12px", border: "1px solid rgba(70,91,76,.18)", background: "#fff" }}
          />
        </div>

        {message && (
          <div role="status" style={{ marginBottom: "14px", padding: "11px 13px", borderRadius: "12px", background: "rgba(241,246,238,.92)", color: "#465b4c", fontSize: "12px" }}>
            {message}
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "760px" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                {["No.", "Nama", "Email", "Role Saat Ini", "Ubah Menjadi", "Aksi"].map((head) => (
                  <th key={head} style={{ padding: "10px", borderBottom: "1px solid rgba(70,91,76,.14)", fontSize: "12px", opacity: .58 }}>
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((user, index) => {
                const protectedUser =
                  user.role === "superadmin" || user.user_id === currentUserId;
                const selected =
                  draftRoles[user.user_id] ||
                  (["reader", "writer", "admin"].includes(user.role)
                    ? (user.role as ManagedRole)
                    : "reader");

                return (
                  <tr key={user.user_id}>
                    <td style={{ padding: "12px 10px", borderBottom: "1px solid rgba(70,91,76,.08)", opacity: .6 }}>
                      {String(index + 1).padStart(2, "0")}
                    </td>
                    <td style={{ padding: "12px 10px", borderBottom: "1px solid rgba(70,91,76,.08)" }}>
                      <strong>{user.display_name || "User"}</strong>
                    </td>
                    <td style={{ padding: "12px 10px", borderBottom: "1px solid rgba(70,91,76,.08)" }}>
                      {user.email || "—"}
                    </td>
                    <td style={{ padding: "12px 10px", borderBottom: "1px solid rgba(70,91,76,.08)" }}>
                      <strong>{roleLabel(user.role)}</strong>
                    </td>
                    <td style={{ padding: "12px 10px", borderBottom: "1px solid rgba(70,91,76,.08)" }}>
                      {protectedUser ? (
                        <span style={{ fontSize: "12px", opacity: .58 }}>Dilindungi</span>
                      ) : (
                        <select
                          value={selected}
                          disabled={isPending}
                          onChange={(e) =>
                            setDraftRoles((current) => ({
                              ...current,
                              [user.user_id]: e.target.value as ManagedRole,
                            }))
                          }
                          style={{ minHeight: "36px", padding: "7px 10px", borderRadius: "10px", border: "1px solid rgba(70,91,76,.18)", background: "#fff" }}
                        >
                          <option value="admin">Admin</option>
                          <option value="writer">Penulis</option>
                          <option value="reader">Pembaca</option>
                        </select>
                      )}
                    </td>
                    <td style={{ padding: "12px 10px", borderBottom: "1px solid rgba(70,91,76,.08)" }}>
                      {protectedUser ? (
                        <span style={{ fontSize: "12px", opacity: .58 }}>Tidak dapat diubah</span>
                      ) : (
                        <button
                          type="button"
                          disabled={isPending || selected === user.role}
                          onClick={() => runChange(user)}
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
                            opacity: isPending || selected === user.role ? .5 : 1,
                          }}
                        >
                          Simpan Role
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {visibleUsers.length === 0 && (
          <p style={{ textAlign: "center", padding: "24px 10px 4px", opacity: .58 }}>
            User tidak ditemukan.
          </p>
        )}
      </section>
    </main>
  );
}
