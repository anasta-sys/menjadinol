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
  const [page, setPage] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return users
      .filter((user) => {
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
      })
      .sort((a, b) => {
        if (a.status === b.status) return 0;
        return a.status === "active" ? -1 : 1;
      });
  }, [users, search, filterRole]);

  const PAGE_SIZE = 10;

  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / PAGE_SIZE)
  );

  const safePage = Math.min(page, totalPages);

  const paginatedUsers = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, safePage]);

  const visiblePages = useMemo(() => {
    const pages: number[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i += 1) {
        pages.push(i);
      }
      return pages;
    }

    let start = Math.max(1, safePage - 2);
    let end = Math.min(totalPages, start + 4);

    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }

    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }

    return pages;
  }, [safePage, totalPages]);
  const stats = useMemo(() => {
    return {
      total: users.length,
      readers: users.filter((u) => u.role === "reader").length,
      writers: users.filter((u) => u.role === "writer").length,
      staff: users.filter(
        (u) => u.role === "admin" || u.role === "superadmin"
      ).length,
    };
  }, [users]);

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

  function printAllUsers() {
    setExportOpen(false);
    window.print();
  }
  return (
    <main className="um-page">
      <header className="um-heading">
        <div>
          <p className="um-eyebrow">MENJADI NOL</p>
          <h1>User Manager</h1>
          <p className="um-subtitle">
            Kelola akun Pembaca, Penulis, Admin, dan Superadmin.
          </p>
        </div>

        <div className="um-top-actions">
          <Link href="/admin/superadmin" className="um-back">
            <span aria-hidden="true">&larr;</span>
            <span>Back to Superadmin</span>
          </Link>

          <div className="um-export-wrap">
            <button
              type="button"
              className="um-export"
              onClick={() => setExportOpen((value) => !value)}
            >
              Ekspor Semua
            </button>

            {exportOpen ? (
              <div className="um-export-menu">
                <button type="button" onClick={printAllUsers}>
                  PDF / Cetak
                </button>

                <button type="button" disabled>
                  Word
                </button>

                <button type="button" disabled>
                  Excel
                </button>

                <button type="button" disabled>
                  TXT
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <section className="um-stats" aria-label="Ringkasan user">
        <div className="um-stat um-stat-total">
          <span className="um-stat-label">TOTAL USER</span>
          <strong>{stats.total}</strong>
          <span>Semua akun terdaftar</span>
        </div>

        <div className="um-stat um-stat-reader">
          <span className="um-stat-label">PEMBACA</span>
          <strong>{stats.readers}</strong>
          <span>Akun pembaca</span>
        </div>

        <div className="um-stat um-stat-writer">
          <span className="um-stat-label">PENULIS</span>
          <strong>{stats.writers}</strong>
          <span>Akun penulis</span>
        </div>

        <div className="um-stat um-stat-staff">
          <span className="um-stat-label">ADMIN</span>
          <strong>{stats.staff}</strong>
          <span>Admin dan Superadmin</span>
        </div>
      </section>

      <section className="um-panel">
        <div className="um-panel-head">
          <div>
            <p className="um-eyebrow">KELOLA USER</p>
            <h2>Daftar Semua User</h2>
            <p>
              {filteredUsers.length} dari {users.length} akun ditampilkan
            </p>
          </div>

          <div className="um-tools">
            <div className="um-search-wrap">
              <span className="um-search-mark" aria-hidden="true">
                O
              </span>
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari nama atau email..."
                aria-label="Cari user"
              />
            </div>

            <select
              value={filterRole}
              onChange={(e) => {
                setFilterRole(e.target.value);
                setPage(1);
              }}
              aria-label="Filter role"
            >
              <option value="all">Semua Role</option>
              <option value="reader">Pembaca</option>
              <option value="writer">Penulis</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </div>
        </div>

        {message ? <div className="um-message">{message}</div> : null}

        <div className="um-table-wrap">
          <table className="um-table">
            <thead>
              <tr>
                <th className="um-number">No</th>
                <th>Nama User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th className="um-action-head">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {paginatedUsers.map((user, index) => {
                const protectedAccount =
                  user.user_id === currentUserId ||
                  user.role === "superadmin";

                return (
                  <tr key={user.user_id}>
                    <td className="um-number">
                      <span className="um-row-number">{(safePage - 1) * PAGE_SIZE + index + 1}</span>
                    </td>

                    <td>
                      <div className="um-user">
                        <span className="um-avatar">
                          {(user.display_name || user.email || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </span>

                        <div>
                          <strong>{user.display_name || "-"}</strong>
                          {user.user_id === currentUserId ? (
                            <small>Akun Anda</small>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    <td className="um-email">{user.email || "-"}</td>

                    <td>
                      <span className={`um-role um-role-${user.role}`}>
                        {roleLabel(user.role)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={
                          user.status === "active"
                            ? "um-status um-status-active"
                            : "um-status um-status-inactive"
                        }
                      >
                        <span className="um-dot" />
                        {user.status === "active" ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>

                    <td className="um-actions">
                      {protectedAccount ? (
                        <span className="um-protected">Dilindungi</span>
                      ) : user.status === "active" ? (
                        <button
                          type="button"
                          className="um-action um-deactivate"
                          disabled={isPending}
                          onClick={() => runDeactivate(user)}
                        >
                          Nonaktifkan
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="um-action um-delete"
                          disabled={isPending}
                          onClick={() => runDelete(user)}
                        >
                          Hapus Permanen
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="um-empty">
                    User tidak ditemukan.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {filteredUsers.length > PAGE_SIZE ? (
          <div className="um-pagination">
            <span className="um-page-info">
              {(safePage - 1) * PAGE_SIZE + 1}-
              {Math.min(safePage * PAGE_SIZE, filteredUsers.length)}
              {" dari "}
              {filteredUsers.length}
            </span>

            <div className="um-page-buttons">
              <button
                type="button"
                className="um-page-nav"
                disabled={safePage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Prev
              </button>

              {visiblePages[0] > 1 ? (
                <>
                  <button
                    type="button"
                    className="um-page-button"
                    onClick={() => setPage(1)}
                  >
                    1
                  </button>

                  {visiblePages[0] > 2 ? (
                    <span className="um-page-dots">...</span>
                  ) : null}
                </>
              ) : null}

              {visiblePages.map((pageNumber) => (
                <button
                  type="button"
                  key={pageNumber}
                  className={
                    pageNumber === safePage
                      ? "um-page-button um-page-active"
                      : "um-page-button"
                  }
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}

              {visiblePages[visiblePages.length - 1] < totalPages ? (
                <>
                  {visiblePages[visiblePages.length - 1] < totalPages - 1 ? (
                    <span className="um-page-dots">...</span>
                  ) : null}

                  <button
                    type="button"
                    className="um-page-button"
                    onClick={() => setPage(totalPages)}
                  >
                    {totalPages}
                  </button>
                </>
              ) : null}

              <button
                type="button"
                className="um-page-nav"
                disabled={safePage === totalPages}
                onClick={() =>
                  setPage((value) => Math.min(totalPages, value + 1))
                }
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <style>{`
        .um-page {
          width: min(1460px, calc(100% - 36px));
          margin: 0 auto;
          padding: 30px 0 76px;
          color: #173e2c;
        }

        .um-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 22px;
        }

        .um-eyebrow {
          margin: 0 0 7px;
          color: #78917e;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .16em;
        }

        .um-heading h1 {
          margin: 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(30px, 3vw, 42px);
          line-height: 1.05;
          font-weight: 500;
          letter-spacing: -.025em;
          color: #143d2a;
        }

        .um-subtitle {
          margin: 9px 0 0;
          color: #698071;
          font-size: 14px;
        }

        .um-back {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 42px;
          padding: 0 17px;
          margin-top: 5px;
          border: 1px solid rgba(157, 124, 57, .28);
          border-radius: 999px;
          background: rgba(255, 248, 226, .92);
          box-shadow: 0 8px 22px rgba(86, 68, 38, .07);
          color: #735b2d;
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
          transition: .18s ease;
        }

        .um-back:hover {
          transform: translateY(-1px);
          background: #fff5d9;
          border-color: rgba(157, 124, 57, .48);
        }

        .um-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 14px;
        }

        .um-stat {
          position: relative;
          min-height: 118px;
          padding: 17px 19px;
          overflow: hidden;
          border: 1px solid rgba(69, 91, 73, .10);
          border-radius: 20px;
          box-shadow: 0 12px 32px rgba(50, 73, 54, .06);
        }

        .um-stat::after {
          content: "";
          position: absolute;
          width: 90px;
          height: 90px;
          right: -32px;
          bottom: -42px;
          border: 1px solid rgba(54, 82, 59, .08);
          border-radius: 50%;
        }

        .um-stat-total {
          background: rgba(224, 236, 215, .94);
        }

        .um-stat-reader {
          background: rgba(226, 238, 239, .94);
        }

        .um-stat-writer {
          background: rgba(248, 236, 202, .94);
        }

        .um-stat-staff {
          background: rgba(242, 225, 218, .94);
        }

        .um-stat-label {
          display: block;
          margin-bottom: 7px;
          color: #667c6a;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .12em;
        }

        .um-stat strong {
          display: block;
          margin-bottom: 3px;
          color: #173f2c;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 30px;
          line-height: 1;
          font-weight: 500;
        }

        .um-stat > span:last-child {
          color: #728176;
          font-size: 11px;
        }

        .um-panel {
          overflow: hidden;
          border: 1px solid rgba(68, 91, 72, .12);
          border-radius: 24px;
          background: rgba(255, 253, 247, .94);
          box-shadow: 0 18px 48px rgba(48, 72, 52, .09);
          backdrop-filter: blur(12px);
        }

        .um-panel-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          padding: 21px 22px 18px;
          border-bottom: 1px solid rgba(70, 91, 76, .09);
          background: linear-gradient(
            110deg,
            rgba(249, 246, 233, .94),
            rgba(238, 244, 231, .86)
          );
        }

        .um-panel-head h2 {
          margin: 0;
          color: #153d2a;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 22px;
          font-weight: 500;
        }

        .um-panel-head > div:first-child > p:last-child {
          margin: 5px 0 0;
          color: #849086;
          font-size: 11px;
        }

        .um-tools {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .um-search-wrap {
          position: relative;
        }

        .um-search-mark {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #809083;
          font-family: Georgia, serif;
          font-size: 11px;
          pointer-events: none;
        }

        .um-search-wrap input,
        .um-tools select {
          height: 42px;
          border: 1px solid rgba(71, 101, 77, .17);
          border-radius: 999px;
          background: rgba(255, 255, 251, .96);
          color: #284c37;
          outline: none;
          font: inherit;
          font-size: 12px;
          transition: .18s ease;
        }

        .um-search-wrap input {
          width: 255px;
          padding: 0 15px 0 34px;
        }

        .um-tools select {
          min-width: 145px;
          padding: 0 35px 0 15px;
          font-weight: 700;
          cursor: pointer;
        }

        .um-search-wrap input:focus,
        .um-tools select:focus {
          border-color: #9bb28e;
          box-shadow: 0 0 0 3px rgba(120, 151, 107, .10);
        }

        .um-message {
          margin: 14px 20px 0;
          padding: 11px 14px;
          border: 1px solid rgba(104, 139, 94, .18);
          border-radius: 13px;
          background: rgba(224, 237, 216, .66);
          color: #49664d;
          font-size: 12px;
        }

        .um-table-wrap {
          overflow-x: auto;
          padding: 8px 14px 16px;
        }

        .um-table {
          width: 100%;
          min-width: 920px;
          border-collapse: separate;
          border-spacing: 0 7px;
        }

        .um-table th {
          padding: 8px 12px;
          color: #708177;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .08em;
          text-align: left;
          text-transform: uppercase;
        }

        .um-table tbody tr {
          background: rgba(255, 254, 249, .88);
          box-shadow: 0 2px 0 rgba(64, 87, 68, .035);
          transition: .15s ease;
        }

        .um-table tbody tr:nth-child(even) {
          background: rgba(238, 245, 232, .72);
        }

        .um-table tbody tr:hover {
          background: rgba(229, 240, 221, .88);
          transform: translateY(-1px);
        }

        .um-table td {
          padding: 11px 12px;
          border-top: 1px solid rgba(65, 91, 70, .07);
          border-bottom: 1px solid rgba(65, 91, 70, .07);
          color: #284b37;
          font-size: 12px;
          vertical-align: middle;
        }

        .um-table td:first-child {
          border-left: 1px solid rgba(65, 91, 70, .07);
          border-radius: 14px 0 0 14px;
        }

        .um-table td:last-child {
          border-right: 1px solid rgba(65, 91, 70, .07);
          border-radius: 0 14px 14px 0;
        }

        .um-number {
          width: 62px;
          text-align: center !important;
        }

        .um-row-number {
          color: #849488;
          font-size: 11px;
        }

        .um-user {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .um-avatar {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 34px;
          width: 34px;
          height: 34px;
          border: 1px solid rgba(74, 107, 79, .12);
          border-radius: 50%;
          background: #e5efdf;
          color: #416548;
          font-family: Georgia, serif;
          font-size: 14px;
          font-weight: 700;
        }

        .um-user strong {
          display: block;
          color: #173e2c;
          font-size: 12px;
          font-weight: 800;
        }

        .um-user small {
          display: block;
          margin-top: 2px;
          color: #8a968d;
          font-size: 9px;
        }

        .um-email {
          color: #667b6c !important;
        }

        .um-role,
        .um-status,
        .um-protected {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 28px;
          padding: 0 10px;
          border: 1px solid transparent;
          border-radius: 999px;
          white-space: nowrap;
          font-size: 10px;
          font-weight: 800;
        }

        .um-role-reader {
          background: #e7efe1;
          border-color: #d7e4d1;
          color: #527153;
        }

        .um-role-writer {
          background: #f7edd2;
          border-color: #eadcaf;
          color: #80662d;
        }

        .um-role-admin {
          background: #e1edf0;
          border-color: #d0e1e5;
          color: #496c75;
        }

        .um-role-superadmin {
          background: #eee4da;
          border-color: #e1d1c2;
          color: #745d49;
        }

        .um-status {
          gap: 6px;
        }

        .um-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        .um-status-active {
          background: #e4eee0;
          color: #4b754f;
        }

        .um-status-inactive {
          background: #f7e8e3;
          color: #9b5147;
        }

        .um-actions,
        .um-action-head {
          text-align: right !important;
        }

        .um-protected {
          background: rgba(235, 240, 229, .78);
          border-color: rgba(102, 126, 101, .12);
          color: #718174;
        }

        .um-action {
          min-height: 32px;
          padding: 0 12px;
          border-radius: 999px;
          font-family: inherit;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          transition: .15s ease;
        }

        .um-action:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .um-action:disabled {
          cursor: wait;
          opacity: .55;
        }

        .um-deactivate {
          border: 1px solid #e3c77d;
          background: #f8eac4;
          color: #795b20;
        }

        .um-deactivate:hover:not(:disabled) {
          background: #f3dfaa;
        }

        .um-delete {
          border: 1px solid #e8bbb2;
          background: #fae8e4;
          color: #9b493f;
        }

        .um-delete:hover:not(:disabled) {
          background: #f6ddd7;
        }

        .um-empty {
          padding: 35px !important;
          border: 0 !important;
          background: transparent !important;
          color: #829087 !important;
          text-align: center;
        }

        @media (max-width: 900px) {
          .um-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .um-panel-head {
            align-items: stretch;
            flex-direction: column;
          }

          .um-tools {
            width: 100%;
          }

          .um-search-wrap {
            flex: 1;
          }

          .um-search-wrap input {
            width: 100%;
          }
        }

        @media (max-width: 620px) {
          .um-page {
            width: min(100% - 24px, 1460px);
            padding-top: 20px;
          }

          .um-heading {
            flex-direction: column;
          }

          .um-back {
            margin-top: 0;
          }

          .um-stats {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          .um-stat {
            min-height: 105px;
            padding: 14px;
            border-radius: 17px;
          }

          .um-tools {
            flex-direction: column;
          }

          .um-search-wrap,
          .um-tools select {
            width: 100%;
          }

          .um-panel {
            border-radius: 20px;
          }
        }

        /* Final compact layout */

        .um-page {
          padding-top: 18px;
          padding-bottom: 44px;
        }

        .um-heading {
          margin-bottom: 12px;
        }

        .um-heading h1 {
          font-size: clamp(27px, 2.3vw, 34px);
        }

        .um-subtitle {
          margin-top: 5px;
          font-size: 12px;
        }

        .um-top-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 2px;
        }

        .um-back,
        .um-export {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          height: 32px;
          min-height: 32px;
          padding: 0 12px;
          border-radius: 999px;
          font-family: inherit;
          font-size: 9px;
          font-weight: 800;
          white-space: nowrap;
        }

        .um-back {
          margin-top: 0;
        }

        .um-export-wrap {
          position: relative;
        }

        .um-export {
          border: 1px solid rgba(83, 115, 84, .24);
          background: #e7efe1;
          color: #426047;
          cursor: pointer;
        }

        .um-export:hover {
          background: #dce8d5;
        }

        .um-export-menu {
          position: absolute;
          z-index: 50;
          top: calc(100% + 5px);
          right: 0;
          width: 140px;
          padding: 5px;
          border: 1px solid rgba(65, 91, 69, .13);
          border-radius: 12px;
          background: #fffdf7;
          box-shadow: 0 14px 32px rgba(47, 67, 50, .14);
        }

        .um-export-menu button {
          display: block;
          width: 100%;
          padding: 7px 8px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: #34533d;
          font-family: inherit;
          font-size: 9px;
          font-weight: 700;
          text-align: left;
          cursor: pointer;
        }

        .um-export-menu button:hover:not(:disabled) {
          background: #edf3e8;
        }

        .um-export-menu button:disabled {
          opacity: .36;
          cursor: default;
        }

        .um-stats {
          gap: 7px;
          margin-bottom: 9px;
        }

        .um-stat {
          min-height: 76px;
          padding: 10px 14px;
          border-radius: 15px;
        }

        .um-stat-label {
          margin-bottom: 3px;
          font-size: 7px;
        }

        .um-stat strong {
          margin-bottom: 1px;
          font-size: 22px;
        }

        .um-stat > span:last-child {
          font-size: 8px;
        }

        .um-panel {
          border-radius: 18px;
        }

        .um-panel-head {
          padding: 12px 16px 10px;
        }

        .um-panel-head h2 {
          font-size: 17px;
        }

        .um-panel-head > div:first-child > p:last-child {
          margin-top: 2px;
          font-size: 8px;
        }

        .um-search-wrap input,
        .um-tools select {
          height: 32px;
          font-size: 9px;
        }

        .um-search-wrap input {
          width: 210px;
        }

        .um-tools select {
          min-width: 120px;
        }

        .um-table-wrap {
          padding: 3px 10px 5px;
        }

        .um-table {
          border-spacing: 0 4px;
        }

        .um-table th {
          padding: 4px 9px;
          font-size: 7px;
        }

        .um-table td {
          padding: 6px 9px;
          font-size: 9px;
        }

        .um-avatar {
          flex-basis: 25px;
          width: 25px;
          height: 25px;
          font-size: 10px;
        }

        .um-user {
          gap: 7px;
        }

        .um-user strong {
          font-size: 9px;
        }

        .um-user small {
          font-size: 7px;
        }

        .um-role,
        .um-status,
        .um-protected {
          min-height: 21px;
          padding: 0 7px;
          font-size: 7px;
        }

        .um-action {
          min-height: 25px;
          padding: 0 9px;
          font-size: 7px;
        }

        /* Pagination */

        .um-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 6px 14px 12px;
        }

        .um-page-info {
          color: #839087;
          font-size: 8px;
        }

        .um-page-buttons {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .um-page-button,
        .um-page-nav {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 26px;
          min-width: 26px;
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

        .um-page-nav {
          min-width: 42px;
          border-radius: 999px;
        }

        .um-page-button:hover,
        .um-page-nav:hover:not(:disabled) {
          background: #e9f0e3;
        }

        .um-page-active {
          border-color: #75946f;
          background: #78936f;
          color: #ffffff;
        }

        .um-page-nav:disabled {
          opacity: .32;
          cursor: default;
        }

        .um-page-dots {
          padding: 0 2px;
          color: #8c988e;
          font-size: 8px;
        }

        @media (max-width: 720px) {
          .um-heading {
            gap: 10px;
          }

          .um-top-actions {
            flex-wrap: wrap;
          }

          .um-pagination {
            align-items: flex-start;
            flex-direction: column;
          }

          .um-page-buttons {
            max-width: 100%;
            overflow-x: auto;
          }
        }

        @media print {
          header,
          nav,
          footer,
          .um-top-actions,
          .um-tools,
          .um-pagination {
            display: none !important;
          }

          .um-page {
            width: 100%;
            padding: 0;
          }

          .um-panel,
          .um-stat {
            box-shadow: none;
          }

          .um-actions,
          .um-action-head {
            display: none !important;
          }
        }

        /* Proper table column proportions */
        .um-table {
          table-layout: fixed;
        }

        .um-table th:nth-child(1),
        .um-table td:nth-child(1) {
          width: 5%;
        }

        .um-table th:nth-child(2),
        .um-table td:nth-child(2) {
          width: 23%;
        }

        .um-table th:nth-child(3),
        .um-table td:nth-child(3) {
          width: 28%;
        }

        .um-table th:nth-child(4),
        .um-table td:nth-child(4) {
          width: 13%;
        }

        .um-table th:nth-child(5),
        .um-table td:nth-child(5) {
          width: 13%;
        }

        .um-table th:nth-child(6),
        .um-table td:nth-child(6) {
          width: 18%;
        }

        .um-table th:nth-child(4),
        .um-table td:nth-child(4),
        .um-table th:nth-child(5),
        .um-table td:nth-child(5) {
          text-align: center;
        }

        .um-table th:nth-child(6),
        .um-table td:nth-child(6) {
          text-align: right;
          padding-right: 12px;
        }

        .um-table td:nth-child(3) {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .um-role,
        .um-status {
          margin: 0 auto;
        }

        .um-actions {
          white-space: nowrap;
        }

        /* Final table alignment */
        .um-table th:nth-child(1),
        .um-table td:nth-child(1) {
          width: 5%;
        }

        .um-table th:nth-child(2),
        .um-table td:nth-child(2) {
          width: 24%;
        }

        .um-table th:nth-child(3),
        .um-table td:nth-child(3) {
          width: 31%;
        }

        .um-table th:nth-child(4),
        .um-table td:nth-child(4) {
          width: 12%;
          text-align: left;
        }

        .um-table th:nth-child(5),
        .um-table td:nth-child(5) {
          width: 12%;
          text-align: left;
        }

        .um-table th:nth-child(6),
        .um-table td:nth-child(6) {
          width: 16%;
          text-align: right;
          padding-right: 16px;
        }

        .um-role,
        .um-status {
          margin: 0;
        }

        /* Final proper table geometry */
        .um-table {
          width: 100%;
          table-layout: fixed;
        }

        /* No */
        .um-table th:nth-child(1),
        .um-table td:nth-child(1) {
          width: 54px !important;
          padding-left: 8px !important;
          padding-right: 8px !important;
          text-align: center !important;
        }

        /* Nama */
        .um-table th:nth-child(2),
        .um-table td:nth-child(2) {
          width: 250px !important;
          text-align: left !important;
        }

        /* Email */
        .um-table th:nth-child(3),
        .um-table td:nth-child(3) {
          width: auto !important;
          text-align: left !important;
        }

        /* Role */
        .um-table th:nth-child(4),
        .um-table td:nth-child(4) {
          width: 145px !important;
          padding-left: 12px !important;
          padding-right: 12px !important;
          text-align: center !important;
        }

        /* Status */
        .um-table th:nth-child(5),
        .um-table td:nth-child(5) {
          width: 135px !important;
          padding-left: 10px !important;
          padding-right: 10px !important;
          text-align: center !important;
        }

        /* Aksi */
        .um-table th:nth-child(6),
        .um-table td:nth-child(6) {
          width: 170px !important;
          padding-left: 10px !important;
          padding-right: 12px !important;
          text-align: center !important;
        }

        .um-role,
        .um-status {
          margin-left: auto !important;
          margin-right: auto !important;
        }

        .um-actions {
          text-align: center !important;
          white-space: nowrap;
        }

        .um-action-head {
          text-align: center !important;
        }

        .um-protected {
          margin-left: auto;
          margin-right: auto;
        }

        .um-email {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .um-user {
          min-width: 0;
        }

        .um-user > div {
          min-width: 0;
        }

        .um-user strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @media (max-width: 1000px) {
          .um-table {
            min-width: 900px;
          }
        }

        /* USER MANAGER WHOLE UI ZOOM START */

        @media (min-width: 901px) {
          .um-page {
            zoom: 1.3;
            width: min(
              1216px,
              calc((100vw - 36px) / 1.3)
            );
          }
        }

        /* USER MANAGER WHOLE UI ZOOM END */
      `}</style>
    </main>
  );
}