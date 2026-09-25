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

function roleClass(role: string) {
  if (role === "superadmin") return "rm-role rm-role-super";
  if (role === "admin") return "rm-role rm-role-admin";
  if (role === "writer") return "rm-role rm-role-writer";
  return "rm-role rm-role-reader";
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
  const [rolePages, setRolePages] = useState<Record<string, number>>({
    superadmin: 1,
    admin: 1,
    writer: 1,
    reader: 1,
  });
  const [draftRoles, setDraftRoles] = useState<Record<string, ManagedRole>>({});

  const PAGE_SIZE = 10;

  const visibleUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();

    if (!needle) return users;

    return users.filter((user) =>
      [user.display_name, user.email, roleLabel(user.role)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [users, query]);

  const roleOrder = [
    "superadmin",
    "admin",
    "writer",
    "reader",
  ] as const;

  const groupedUsers = useMemo(() => {
    return {
      superadmin: visibleUsers.filter(
        (user) => user.role === "superadmin"
      ),
      admin: visibleUsers.filter(
        (user) => user.role === "admin"
      ),
      writer: visibleUsers.filter(
        (user) => user.role === "writer"
      ),
      reader: visibleUsers.filter(
        (user) => user.role === "reader"
      ),
    };
  }, [visibleUsers]);

  function rolePageData(role: (typeof roleOrder)[number]) {
    const roleUsers = groupedUsers[role];
    const totalPages = Math.max(
      1,
      Math.ceil(roleUsers.length / PAGE_SIZE)
    );

    const currentPage = Math.min(
      rolePages[role] || 1,
      totalPages
    );

    const start = (currentPage - 1) * PAGE_SIZE;

    return {
      users: roleUsers.slice(start, start + PAGE_SIZE),
      totalUsers: roleUsers.length,
      totalPages,
      currentPage,
      start,
    };
  }

  function changeRolePage(role: string, nextPage: number) {
    setRolePages((current) => ({
      ...current,
      [role]: nextPage,
    }));
  }
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
    ) {
      return;
    }

    setMessage("");

    startTransition(async () => {
      try {
        await changeManagedUserRole(user.user_id, nextRole);

        setMessage(
          `${name} berhasil diubah menjadi ${roleLabel(nextRole)}.`
        );

        setDraftRoles((current) => {
          const next = { ...current };
          delete next[user.user_id];
          return next;
        });

        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Perubahan role gagal."
        );
      }
    });
  }

  return (
    <main className="rm-page">
      <div className="rm-heading">
        <div>
          <p className="rm-eyebrow">MENJADI NOL - SECURE ACCESS</p>
          <h1>Role Manager</h1>
          <p className="rm-subtitle">
            Kelola akses Admin, Penulis, dan Pembaca tanpa mengubah dashboard Superadmin lama.
          </p>
        </div>

        <div className="rm-top-actions">
          <Link href="/admin" className="rm-top-button rm-dashboard">
            Dashboard Admin
          </Link>

          <Link
            href="/admin/superadmin"
            className="rm-top-button rm-superadmin"
          >
            Back to Superadmin
          </Link>
        </div>
      </div>

      <section className="rm-panel">
        <div className="rm-panel-head">
          <div>
            <p className="rm-section-label">KELOLA ROLE</p>
            <h2>Kelola Akses User</h2>
            <p className="rm-panel-note">
              Superadmin tidak dapat diubah. Akun Auth user tidak dihapus.
            </p>
          </div>

          <div className="rm-search-wrap">
            <span className="rm-search-icon" aria-hidden="true">
              O
            </span>

            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setRolePages({
                  superadmin: 1,
                  admin: 1,
                  writer: 1,
                  reader: 1,
                });
              }}
              placeholder="Cari nama, email, role..."
            />
          </div>
        </div>

        {message ? (
          <div role="status" className="rm-message">
            {message}
          </div>
        ) : null}

        {visibleUsers.length === 0 ? (
          <p className="rm-empty">User tidak ditemukan.</p>
        ) : (
          <div className="rm-role-grid">
            {roleOrder.map((role) => {
              const data = rolePageData(role);

              return (
                <section
                  key={role}
                  className={`rm-role-column rm-column-${role}`}
                >
                  <div className="rm-role-column-head">
                    <div>
                      <span className={roleClass(role)}>
                        {roleLabel(role)}
                      </span>

                      <strong>
                        {data.totalUsers} akun
                      </strong>
                    </div>
                  </div>

                  <div className="rm-role-user-list">
                    {data.users.length === 0 ? (
                      <div className="rm-role-empty">
                        Belum ada {roleLabel(role)}
                      </div>
                    ) : (
                      data.users.map((user, index) => {
                        const protectedUser =
                          user.role === "superadmin" ||
                          user.user_id === currentUserId;

                        const selected =
                          draftRoles[user.user_id] ||
                          (["reader", "writer", "admin"].includes(user.role)
                            ? (user.role as ManagedRole)
                            : "reader");

                        const changed =
                          !protectedUser &&
                          selected !== user.role;

                        return (
                          <article
                            key={user.user_id}
                            className="rm-role-user-card"
                          >
                            <div className="rm-card-number">
                              {String(
                                data.start + index + 1
                              ).padStart(2, "0")}
                            </div>

                            <div className="rm-card-user">
                              <span className="rm-avatar">
                                {(user.display_name ||
                                  user.email ||
                                  "U")
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>

                              <div className="rm-card-identity">
                                <strong>
                                  {user.display_name || "User"}
                                </strong>

                                <span>
                                  {user.email || "-"}
                                </span>
                              </div>
                            </div>

                            {protectedUser ? (
                              <div className="rm-card-protected">
                                <span className="rm-protected">
                                  Dilindungi
                                </span>

                                <small>
                                  Tidak dapat diubah
                                </small>
                              </div>
                            ) : (
                              <div className="rm-card-actions">
                                <select
                                  className="rm-select"
                                  value={selected}
                                  disabled={isPending}
                                  onChange={(event) =>
                                    setDraftRoles((current) => ({
                                      ...current,
                                      [user.user_id]:
                                        event.target.value as ManagedRole,
                                    }))
                                  }
                                >
                                  <option value="admin">
                                    Admin
                                  </option>
                                  <option value="writer">
                                    Penulis
                                  </option>
                                  <option value="reader">
                                    Pembaca
                                  </option>
                                </select>

                                <button
                                  type="button"
                                  disabled={
                                    isPending || !changed
                                  }
                                  onClick={() =>
                                    runChange(user)
                                  }
                                  className={
                                    changed
                                      ? "rm-save rm-save-ready"
                                      : "rm-save"
                                  }
                                >
                                  {isPending && changed
                                    ? "Menyimpan..."
                                    : "Simpan Role"}
                                </button>
                              </div>
                            )}
                          </article>
                        );
                      })
                    )}
                  </div>

                  <div className="rm-role-pagination">
                    {Array.from(
                      { length: data.totalPages },
                      (_, index) => index + 1
                    ).map((pageNumber) => (
                      <button
                        type="button"
                        key={pageNumber}
                        className={
                          pageNumber === data.currentPage
                            ? "rm-role-page rm-role-page-active"
                            : "rm-role-page"
                        }
                        onClick={() =>
                          changeRolePage(role, pageNumber)
                        }
                      >
                        {pageNumber}
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </section>

      <style>{`
        .rm-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 26px 18px 70px;
          color: #173f2d;
        }

        .rm-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 18px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .rm-eyebrow {
          margin: 0;
          color: #789083;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .15em;
        }

        .rm-heading h1 {
          margin: 6px 0 4px;
          font-size: 30px;
          line-height: 1.1;
        }

        .rm-subtitle {
          margin: 0;
          color: #72877b;
          font-size: 14px;
        }

        .rm-top-actions {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .rm-top-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 34px;
          padding: 0 13px;
          border-radius: 999px;
          text-decoration: none;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .rm-dashboard {
          border: 1px solid rgba(177, 139, 62, .30);
          background: #fff9e8;
          color: #75591f;
        }

        .rm-superadmin {
          border: 1px solid rgba(85, 119, 87, .24);
          background: #e7efe1;
          color: #426047;
        }

        .rm-panel {
          overflow: hidden;
          border: 1px solid rgba(70, 91, 76, .12);
          border-radius: 20px;
          background: rgba(255, 253, 247, .91);
          box-shadow: 0 16px 40px rgba(52, 71, 56, .07);
          backdrop-filter: blur(8px);
        }

        .rm-panel-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          padding: 16px 18px 13px;
          background:
            linear-gradient(
              90deg,
              rgba(255, 250, 235, .68),
              rgba(234, 243, 228, .68)
            );
          border-bottom: 1px solid rgba(70, 91, 76, .09);
        }

        .rm-section-label {
          margin: 0 0 3px;
          color: #7b9382;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .14em;
        }

        .rm-panel-head h2 {
          margin: 0;
          font-family: Georgia, serif;
          font-size: 19px;
          font-weight: 500;
        }

        .rm-panel-note {
          margin: 3px 0 0;
          color: #84938a;
          font-size: 9px;
        }

        .rm-search-wrap {
          position: relative;
          width: min(270px, 100%);
        }

        .rm-search-icon {
          position: absolute;
          top: 50%;
          left: 13px;
          transform: translateY(-50%);
          color: #91a096;
          font-size: 8px;
          font-weight: 800;
        }

        .rm-search-wrap input {
          width: 100%;
          height: 35px;
          box-sizing: border-box;
          padding: 0 13px 0 31px;
          border: 1px solid rgba(70, 91, 76, .16);
          border-radius: 999px;
          outline: none;
          background: rgba(255, 255, 255, .90);
          color: #355440;
          font: inherit;
          font-size: 10px;
        }

        .rm-search-wrap input:focus {
          border-color: rgba(106, 139, 101, .55);
          box-shadow: 0 0 0 3px rgba(115, 148, 109, .08);
        }

        .rm-message {
          margin: 10px 14px 0;
          padding: 9px 12px;
          border: 1px solid rgba(96, 129, 95, .12);
          border-radius: 11px;
          background: #edf4e8;
          color: #426047;
          font-size: 10px;
        }

        .rm-table-wrap {
          overflow-x: auto;
          padding: 5px 12px 10px;
        }

        .rm-table {
          width: 100%;
          min-width: 850px;
          table-layout: fixed;
          border-collapse: separate;
          border-spacing: 0 5px;
        }

        .rm-table th {
          padding: 5px 10px;
          color: #72877a;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .05em;
          text-align: left;
          text-transform: uppercase;
        }

        .rm-table td {
          height: 44px;
          box-sizing: border-box;
          padding: 6px 10px;
          border-top: 1px solid rgba(71, 93, 76, .07);
          border-bottom: 1px solid rgba(71, 93, 76, .07);
          background: rgba(255, 254, 249, .94);
          color: #42604c;
          font-size: 10px;
        }

        .rm-table tbody tr:nth-child(even) td {
          background: rgba(237, 244, 232, .86);
        }

        .rm-table td:first-child {
          border-left: 1px solid rgba(71, 93, 76, .07);
          border-radius: 12px 0 0 12px;
        }

        .rm-table td:last-child {
          border-right: 1px solid rgba(71, 93, 76, .07);
          border-radius: 0 12px 12px 0;
        }

        .rm-table th:nth-child(1),
        .rm-table td:nth-child(1) {
          width: 55px;
          text-align: center;
        }

        .rm-table th:nth-child(2),
        .rm-table td:nth-child(2) {
          width: 210px;
        }

        .rm-table th:nth-child(3),
        .rm-table td:nth-child(3) {
          width: auto;
        }

        .rm-table th:nth-child(4),
        .rm-table td:nth-child(4) {
          width: 135px;
          text-align: center;
        }

        .rm-table th:nth-child(5),
        .rm-table td:nth-child(5) {
          width: 150px;
          text-align: center;
        }

        .rm-table th:nth-child(6),
        .rm-table td:nth-child(6) {
          width: 150px;
          text-align: center;
        }

        .rm-number {
          color: #84948a;
        }

        .rm-user {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .rm-avatar {
          display: inline-flex;
          flex: 0 0 27px;
          width: 27px;
          height: 27px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(90, 126, 91, .16);
          border-radius: 50%;
          background: #e7f0e2;
          color: #416149;
          font-family: Georgia, serif;
          font-size: 11px;
        }

        .rm-user strong {
          overflow: hidden;
          color: #173f2d;
          font-size: 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .rm-email {
          overflow: hidden;
          color: #6e8276;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .rm-role,
        .rm-protected {
          display: inline-flex;
          min-height: 23px;
          align-items: center;
          justify-content: center;
          padding: 0 8px;
          border-radius: 999px;
          font-size: 8px;
          font-weight: 800;
        }

        .rm-role-super {
          border: 1px solid #ddcdbf;
          background: #efe4da;
          color: #735a47;
        }

        .rm-role-admin {
          border: 1px solid #c7dbe0;
          background: #e2eff1;
          color: #49686e;
        }

        .rm-role-writer {
          border: 1px solid #ead59e;
          background: #f7eccd;
          color: #7a6027;
        }

        .rm-role-reader {
          border: 1px solid #cedfc8;
          background: #e7f0e2;
          color: #4e6a50;
        }

        .rm-protected {
          border: 1px solid #d6e1d1;
          background: #edf3e9;
          color: #708170;
        }

        .rm-locked-text {
          color: #89958d;
          font-size: 8px;
          font-weight: 700;
        }

        .rm-select {
          width: 118px;
          height: 30px;
          padding: 0 29px 0 11px;
          border: 1px solid rgba(85, 117, 87, .20);
          border-radius: 999px;
          outline: none;
          background: #f8fbf5;
          color: #3f5d47;
          font-family: inherit;
          font-size: 9px;
          font-weight: 700;
          cursor: pointer;
        }

        .rm-select:focus {
          border-color: #8fa988;
          box-shadow: 0 0 0 3px rgba(120, 147, 107, .08);
        }

        .rm-save {
          min-height: 28px;
          padding: 0 11px;
          border: 1px solid #d7dfd3;
          border-radius: 999px;
          background: #edf1ea;
          color: #8b968d;
          font-family: inherit;
          font-size: 8px;
          font-weight: 800;
          cursor: default;
        }

        .rm-save-ready {
          border-color: #e4c776;
          background: #f8e9b9;
          color: #765918;
          box-shadow: 0 4px 10px rgba(141, 108, 39, .08);
          cursor: pointer;
        }

        .rm-save-ready:hover {
          background: #f3dda0;
        }

        .rm-empty {
          margin: 0;
          padding: 24px 10px;
          color: #87958c;
          font-size: 11px;
          text-align: center;
        }

        .rm-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 2px 17px 14px;
        }

        .rm-page-info {
          color: #89968e;
          font-size: 8px;
        }

        .rm-page-buttons {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .rm-page-buttons button {
          display: inline-flex;
          min-width: 26px;
          height: 26px;
          align-items: center;
          justify-content: center;
          padding: 0 7px;
          border: 1px solid rgba(76, 105, 80, .15);
          border-radius: 8px;
          background: #fffdf7;
          color: #526b56;
          font-family: inherit;
          font-size: 8px;
          font-weight: 800;
          cursor: pointer;
        }

        .rm-page-buttons button:first-child,
        .rm-page-buttons button:last-child {
          min-width: 42px;
          border-radius: 999px;
        }

        .rm-page-buttons button:hover:not(:disabled) {
          background: #e8f0e2;
        }

        .rm-page-buttons button:disabled {
          opacity: .32;
          cursor: default;
        }

        .rm-page-buttons .rm-page-active {
          border-color: #78936f;
          background: #78936f;
          color: #fff;
        }

        .rm-page-buttons span {
          padding: 0 2px;
          color: #8d998f;
          font-size: 8px;
        }

        @media (max-width: 720px) {
          .rm-page {
            padding-left: 12px;
            padding-right: 12px;
          }

          .rm-heading {
            align-items: flex-start;
          }

          .rm-top-actions {
            width: 100%;
          }

          .rm-search-wrap {
            width: 100%;
          }

          .rm-pagination {
            align-items: flex-start;
            flex-direction: column;
          }

          .rm-page-buttons {
            max-width: 100%;
            overflow-x: auto;
          }
        }

        /* ROLE GROUP COLUMNS */

        .rm-role-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          padding: 12px;
        }

        .rm-role-column {
          min-width: 0;
          overflow: hidden;
          border: 1px solid rgba(70, 91, 76, .11);
          border-radius: 16px;
          background: rgba(255, 254, 249, .86);
        }

        .rm-role-column-head {
          padding: 11px;
          border-bottom: 1px solid rgba(70, 91, 76, .08);
          background: rgba(241, 246, 235, .72);
        }

        .rm-role-column-head > div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 7px;
        }

        .rm-role-column-head strong {
          color: #819086;
          font-size: 8px;
          font-weight: 800;
        }

        .rm-role-user-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 8px;
        }

        .rm-role-user-card {
          position: relative;
          padding: 9px;
          border: 1px solid rgba(69, 94, 73, .08);
          border-radius: 12px;
          background: #fffef9;
        }

        .rm-card-number {
          margin-bottom: 5px;
          color: #9aa59d;
          font-size: 7px;
          font-weight: 800;
        }

        .rm-card-user {
          display: flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
        }

        .rm-card-identity {
          min-width: 0;
        }

        .rm-card-identity strong {
          display: block;
          overflow: hidden;
          color: #173f2d;
          font-size: 9px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .rm-card-identity span {
          display: block;
          overflow: hidden;
          margin-top: 2px;
          color: #788a7e;
          font-size: 7px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .rm-card-actions {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 8px;
        }

        .rm-card-actions .rm-select {
          min-width: 0;
          width: 55%;
          height: 27px;
          padding-left: 8px;
          font-size: 7px;
        }

        .rm-card-actions .rm-save {
          flex: 1;
          min-height: 27px;
          padding: 0 6px;
          font-size: 7px;
        }

        .rm-card-protected {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 5px;
          margin-top: 8px;
        }

        .rm-card-protected small {
          color: #8b978f;
          font-size: 7px;
        }

        .rm-role-empty {
          padding: 25px 6px;
          color: #8d9a91;
          font-size: 8px;
          text-align: center;
        }

        .rm-role-pagination {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 4px;
          min-height: 38px;
          padding: 6px 8px 10px;
          border-top: 1px solid rgba(70, 91, 76, .07);
        }

        .rm-role-page {
          display: inline-flex;
          width: 25px;
          height: 25px;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 1px solid rgba(76, 105, 80, .15);
          border-radius: 7px;
          background: #fffdf7;
          color: #526b56;
          font-family: inherit;
          font-size: 8px;
          font-weight: 800;
          cursor: pointer;
        }

        .rm-role-page:hover {
          background: #e8f0e2;
        }

        .rm-role-page-active {
          border-color: #78936f;
          background: #78936f;
          color: #fff;
        }

        .rm-column-superadmin .rm-role-column-head {
          background: #f2e9e0;
        }

        .rm-column-admin .rm-role-column-head {
          background: #e8f2f3;
        }

        .rm-column-writer .rm-role-column-head {
          background: #faf0d6;
        }

        .rm-column-reader .rm-role-column-head {
          background: #ebf3e6;
        }

        @media (max-width: 1050px) {
          .rm-role-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 620px) {
          .rm-role-grid {
            grid-template-columns: 1fr;
          }
        }
        /* ROLE MANAGER WHOLE UI ZOOM START */

        @media (min-width: 901px) {
          .rm-page {
            zoom: 1.3;
            width: min(
              1216px,
              calc((100vw - 36px) / 1.3)
            );
          }
        }

        /* ROLE MANAGER WHOLE UI ZOOM END */
      `}</style>
    </main>
  );
}