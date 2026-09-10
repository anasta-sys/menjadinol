"use client";

import { useState } from "react";
import ContentTableBuilder, { type ContentTableData } from "@/app/components/ContentTableBuilder";
import RichTextEditor from "@/app/components/RichTextEditor";

type EntryPreview = {
  title: string;
  excerpt: string;
  body: string;
  attachmentName?: string;
} | null;

function safePreviewHtml(raw: string) {
  if (typeof window === "undefined") return raw;

  const doc = new DOMParser().parseFromString(raw || "", "text/html");

  doc.querySelectorAll("script,iframe,object,embed,style").forEach((node) => node.remove());

  doc.body.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach((attr) => {
      if (/^on/i.test(attr.name)) element.removeAttribute(attr.name);
      if (
        (attr.name === "href" || attr.name === "src") &&
        /^\s*javascript:/i.test(attr.value)
      ) {
        element.removeAttribute(attr.name);
      }
    });
  });

  return doc.body.innerHTML;
}

import {
  createContentFolder,
  createFolderEntry,
  updateContentFolder,
  updateFolderEntry,
  deleteContentFolder,
  deleteFolderEntry,
} from "./folder-actions";

type Section =
  | "tentang"
  | "artikel"
  | "layanan"
  | "ruang-belajar"
  | "sinopsis"
  | "kontak";

type Folder = {
  id: string;
  section: Section;
  title: string;
  slug: string;
  description: string;
};

type AdminRole = "writer" | "admin" | "superadmin";

type Entry = {
  id: string;
  folder_id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  table_data?: ContentTableData | null;
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
  attachment_size?: number | null;
  status: "draft" | "review" | "published";
  published_at?: string | null;
};

const sections: { value: Section; label: string }[] = [
  { value: "tentang", label: "Tentang" },
  { value: "layanan", label: "Perjalanan" },
  { value: "ruang-belajar", label: "Ruang Belajar" },
  { value: "sinopsis", label: "Sinopsis" },
  { value: "artikel", label: "Artikel" },
  { value: "kontak", label: "Kontak" },
];

function confirmFolderDelete(event: React.FormEvent<HTMLFormElement>) {
  if (!window.confirm(
    "Yakin folder ini dihapus?\n\nSemua tulisan di dalam folder ini juga akan ikut terhapus."
  )) {
    event.preventDefault();
  }
}

function confirmEntryDelete(event: React.FormEvent<HTMLFormElement>) {
  if (!window.confirm(
    "Yakin tulisan ini dihapus?\n\nTulisan yang sudah dihapus tidak dapat dikembalikan dari menu ini."
  )) {
    event.preventDefault();
  }
}

export default function FolderManager({
  folders,
  entries,
  adminRole = "admin",
  initialSection = "tentang",
}: {
  folders: Folder[];
  entries: Entry[];
  adminRole?: AdminRole;
  initialSection?: Section;
}) {
  const isWriter = adminRole === "writer";
  const isSuperAdmin = adminRole === "superadmin";
  const [section,setSection] = useState<Section>(initialSection);
  const [showFolderForm,setShowFolderForm] = useState(false);
  const [entryFolder,setEntryFolder] = useState("");
  const [editingFolder,setEditingFolder] = useState("");
  const [editingEntry,setEditingEntry] = useState("");
  const [entryPreview,setEntryPreview] = useState<EntryPreview>(null);

  const visibleFolders = folders.filter((folder) => folder.section === section);
  const currentLabel = sections.find((item) => item.value === section)?.label ?? "";

  function openEntryPreview(button: HTMLButtonElement) {
    const form = button.form;
    if (!form) return;

    const fd = new FormData(form);
    const title = String(fd.get("title") ?? "").trim();
    const excerpt = String(fd.get("excerpt") ?? "").trim();
    const body = safePreviewHtml(String(fd.get("body") ?? ""));
    const file = fd.get("attachment");

    if (!title) {
      window.alert("Judul wajib diisi sebelum preview.");
      return;
    }

    if (!body.replace(/<[^>]*>/g, "").trim() && !(file instanceof File && file.size > 0)) {
      window.alert("Isi tulisan atau lampiran wajib diisi sebelum preview.");
      return;
    }

    setEntryPreview({
      title,
      excerpt,
      body,
      attachmentName: file instanceof File && file.size > 0 ? file.name : undefined,
    });
  }

  return (
    <section className="proper-dashboard-card folder-manager-card">
      <div className="dashboard-list-head">
        <div>
          <p className="eyebrow">kelola konten</p>
          <h2>Pilih bagian halaman</h2>
          <p style={{marginTop:"6px",opacity:.7}}>
            {isWriter
              ? "Pilih folder → tulis draft → kirim untuk review. Publikasi dilakukan Admin/Superadmin."
              : "Pilih bagian → buat folder → tambahkan banyak tulisan sesuai tema folder."}
          </p>
        </div>

        {!isWriter && (
          <button
            className="admin-secondary"
            type="button"
            onClick={() => setShowFolderForm((value) => !value)}
          >
            {showFolderForm ? "tutup" : "+ folder baru"}
          </button>
        )}
      </div>

      <div className="folder-section-tabs">
        {sections.map((item) => (
          <button
            key={item.value}
            type="button"
            className={section === item.value ? "admin-mini active" : "admin-mini"}
            onClick={() => {
              setSection(item.value);
              setEntryFolder("");
              setEditingFolder("");
              setEditingEntry("");
              setShowFolderForm(false);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div style={{margin:"18px 0 10px"}}>
        <strong>{currentLabel}</strong>
      </div>

      {!isWriter && showFolderForm && (
        <form action={createContentFolder} className="proper-admin-form folder-add-form">
          <input type="hidden" name="section" value={section}/>

          <div className="admin-two-col">
            <label>
              Nama folder
              <input name="title" maxLength={120} required/>
            </label>
            <label>
              Slug opsional
              <input name="slug" maxLength={120} pattern="[a-z0-9-]*"/>
            </label>
          </div>

          <label>
            Deskripsi
            <textarea name="description" className="summary-field" maxLength={500}/>
          </label>

          <button className="login-submit admin-save" type="submit">
            simpan folder
          </button>
        </form>
      )}

      <div className="article-admin-list">
        {visibleFolders.length === 0 && (
          <div className="empty-admin">
            Belum ada folder di bagian {currentLabel}.
          </div>
        )}

        {visibleFolders.map((folder) => {
          const folderEntries = entries.filter(
            (entry) => entry.folder_id === folder.id
          );
          const isOpen = entryFolder === folder.id;
          const folderEditOpen = editingFolder === folder.id;

          return (
            <article className="folder-admin-block" key={folder.id}>
              <div className="admin-row">
                <div className="admin-row-copy">
                  <strong>{folder.title}</strong>
                  <span>/{folder.slug}</span>
                  {folder.description && <span>{folder.description}</span>}
                  <span>{folderEntries.length} tulisan</span>
                </div>

                <div className="admin-row-actions">
                  <button
                    className="admin-mini"
                    type="button"
                    onClick={() => {
                      setEntryFolder(isOpen ? "" : folder.id);
                      setEditingEntry("");
                    }}
                  >
                    {isOpen ? "tutup isi" : "+ tulis"}
                  </button>

                  {!isWriter && (
                    <button
                      className="admin-mini"
                      type="button"
                      onClick={() =>
                        setEditingFolder(folderEditOpen ? "" : folder.id)
                      }
                    >
                      {folderEditOpen ? "batal" : "rename / edit"}
                    </button>
                  )}

                  {isSuperAdmin && (
                    <form
                      action={deleteContentFolder}
                      onSubmit={confirmFolderDelete}
                    >
                      <input type="hidden" name="id" value={folder.id}/>
                      <button className="admin-mini danger" type="submit">
                        hapus
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {!isWriter && folderEditOpen && (
                <div className="folder-entry-admin">
                  <p className="eyebrow">rename / edit folder</p>

                  <form action={updateContentFolder} className="proper-admin-form">
                    <input type="hidden" name="id" value={folder.id}/>

                    <div className="admin-two-col">
                      <label>
                        Nama folder
                        <input
                          name="title"
                          maxLength={120}
                          defaultValue={folder.title}
                          required
                        />
                      </label>
                      <label>
                        Slug
                        <input
                          name="slug"
                          maxLength={120}
                          pattern="[a-z0-9-]*"
                          defaultValue={folder.slug}
                          required
                        />
                      </label>
                    </div>

                    <label>
                      Deskripsi
                      <textarea
                        name="description"
                        className="summary-field"
                        maxLength={500}
                        defaultValue={folder.description}
                      />
                    </label>

                    <button className="login-submit admin-save" type="submit">
                      simpan perubahan folder
                    </button>
                  </form>
                </div>
              )}

              {isOpen && (
                <div className="folder-entry-admin">
                  <div style={{marginBottom:"16px"}}>
                    <p className="eyebrow">tulis konten</p>
                    <h3>{folder.title}</h3>
                    <p style={{opacity:.7,marginTop:"5px"}}>
                      Kamu bisa menyimpan banyak tulisan di folder tema ini.
                    </p>
                  </div>

                  <form action={createFolderEntry} className="proper-admin-form">
                    <input type="hidden" name="folder_id" value={folder.id}/>

                    <div className="admin-two-col">
                      <label>
                        Judul
                        <input name="title" maxLength={180} required/>
                      </label>
                      <label>
                        Slug opsional
                        <input name="slug" maxLength={120} pattern="[a-z0-9-]*"/>
                      </label>
                    </div>

                    <label>
                      Ringkasan
                      <textarea name="excerpt" className="summary-field" maxLength={420}/>
                    </label>

                    <RichTextEditor
                      name="body"
                      label="Isi tulisan"
                      maxLength={100000}
                      minHeight={320}
                    />

                    <label className="material-upload-field">
                      Materi PDF / JPG / PNG (opsional)
                      <input
                        type="file"
                        name="attachment"
                        accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                      />
                      <small>Maksimal 12 MB. File disimpan privat dan divalidasi lagi di server.</small>
                    </label>

                    <ContentTableBuilder />

                    <div className="admin-actions">
                      <button
                        className="admin-secondary"
                        type="button"
                        onClick={(event) => openEntryPreview(event.currentTarget)}
                      >
                        preview
                      </button>

                      <button
                        className="admin-secondary"
                        type="submit"
                        name="status"
                        value="draft"
                      >
                        simpan draft
                      </button>

                      {isWriter ? (
                        <button
                          className="login-submit admin-save"
                          type="submit"
                          name="status"
                          value="review"
                        >
                          kirim untuk review
                        </button>
                      ) : (
                        <button
                          className="login-submit admin-save"
                          type="submit"
                          name="status"
                          value="published"
                        >
                          publikasikan
                        </button>
                      )}
                    </div>
                  </form>

                  <div style={{marginTop:"18px"}}>
                    {folderEntries.length === 0 && (
                      <div className="empty-admin">
                        Belum ada tulisan di folder ini.
                      </div>
                    )}

                    {folderEntries.map((entry) => {
                      const entryEditOpen = editingEntry === entry.id;

                      return (
                        <div className="folder-entry-manage" key={entry.id}>
                          <div className="admin-row">
                            <div className="admin-row-copy">
                              <strong>{entry.title}</strong>
                              <span>/{entry.slug}</span>
                              <span>{entry.status}</span>
                            </div>

                            <div className="admin-row-actions">
                              <button
                                className="admin-mini"
                                type="button"
                                onClick={() =>
                                  setEditingEntry(entryEditOpen ? "" : entry.id)
                                }
                              >
                                {entryEditOpen ? "batal" : "edit / rename"}
                              </button>

                              {isSuperAdmin && (
                                <form
                                  action={deleteFolderEntry}
                                  onSubmit={confirmEntryDelete}
                                >
                                  <input type="hidden" name="id" value={entry.id}/>
                                  <button className="admin-mini danger" type="submit">
                                    hapus
                                  </button>
                                </form>
                              )}
                            </div>
                          </div>

                          {entryEditOpen && (
                            <form
                              action={updateFolderEntry}
                              className="proper-admin-form folder-entry-edit-form"
                            >
                              <input type="hidden" name="id" value={entry.id}/>

                              <div className="admin-two-col">
                                <label>
                                  Judul
                                  <input
                                    name="title"
                                    maxLength={180}
                                    defaultValue={entry.title}
                                    required
                                  />
                                </label>
                                <label>
                                  Slug
                                  <input
                                    name="slug"
                                    maxLength={120}
                                    pattern="[a-z0-9-]*"
                                    defaultValue={entry.slug}
                                    required
                                  />
                                </label>
                              </div>

                              <label>
                                Ringkasan
                                <textarea
                                  name="excerpt"
                                  className="summary-field"
                                  maxLength={420}
                                  defaultValue={entry.excerpt}
                                />
                              </label>

                              <RichTextEditor
                                name="body"
                                label="Isi tulisan"
                                defaultValue={entry.body}
                                maxLength={100000}
                                minHeight={260}
                              />

                              <label className="material-upload-field">
                                Ganti materi PDF / JPG / PNG
                                <input
                                  type="file"
                                  name="attachment"
                                  accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                                />
                                <small>Maksimal 12 MB. Kosongkan bila tidak ingin mengganti file.</small>
                              </label>

                              {entry.attachment_path && (
                                <label className="material-remove-check">
                                  <input type="checkbox" name="remove_attachment" value="yes" />
                                  Hapus materi saat ini ({entry.attachment_name ?? "file"})
                                </label>
                              )}

                              <ContentTableBuilder initialValue={entry.table_data ?? null} />

                              <div className="admin-actions">
                                <button
                                  className="admin-secondary"
                                  type="button"
                                  onClick={(event) => openEntryPreview(event.currentTarget)}
                                >
                                  preview
                                </button>

                                <button
                                  className="admin-secondary"
                                  type="submit"
                                  name="status"
                                  value="draft"
                                >
                                  simpan sebagai draft
                                </button>

                                {isWriter ? (
                                  <button
                                    className="login-submit admin-save"
                                    type="submit"
                                    name="status"
                                    value="review"
                                  >
                                    kirim untuk review
                                  </button>
                                ) : (
                                  <button
                                    className="login-submit admin-save"
                                    type="submit"
                                    name="status"
                                    value="published"
                                  >
                                    publikasikan
                                  </button>
                                )}
                              </div>
                            </form>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {entryPreview && (
        <div
          className="admin-preview-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Preview tulisan"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEntryPreview(null);
          }}
        >
          <article className="admin-preview-modal">
            <div className="admin-preview-header">
              <div>
                <p className="eyebrow">preview tulisan</p>
                <span>Belum disimpan atau dipublikasikan</span>
              </div>

              <button
                className="admin-secondary"
                type="button"
                onClick={() => setEntryPreview(null)}
              >
                tutup
              </button>
            </div>

            <div className="admin-preview-article">
              <h1>{entryPreview.title}</h1>

              {entryPreview.excerpt && (
                <p className="admin-preview-excerpt">{entryPreview.excerpt}</p>
              )}

              <div
                className="jp-rich-render admin-preview-body"
                dangerouslySetInnerHTML={{ __html: entryPreview.body }}
              />

              {entryPreview.attachmentName && (
                <div className="admin-preview-attachment">
                  Lampiran: {entryPreview.attachmentName}
                </div>
              )}
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
