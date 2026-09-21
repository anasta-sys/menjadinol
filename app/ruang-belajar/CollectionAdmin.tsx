"use client";

import { useState } from "react";
import {
  createCollection,
  deleteCollection
} from "./actions";

type Collection = {
  id:string;
  title:string;
  slug:string;
};

function confirmDelete(
  event: React.FormEvent<HTMLFormElement>
) {
  if (
    !window.confirm(
      "Yakin fitur ini dihapus? Semua tulisan di dalamnya juga akan ikut terhapus."
    )
  ) {
    event.preventDefault();
  }
}

export default function CollectionAdmin({
  collections
}:{
  collections:Collection[];
}) {
  const [open,setOpen] = useState(false);

  return (
    <section className="learning-admin-box">
      <div className="learning-admin-head">
        <div>
          <span className="folder-label">
            admin
          </span>
          <h2>
            Kelola fitur belajar
          </h2>
        </div>

        <button
          className="learning-add-button"
          type="button"
          onClick={() =>
            setOpen((value) => !value)
          }
        >
          {open
            ? "tutup"
            : "+ buat fitur baru"}
        </button>
      </div>

      {open && (
        <form
          action={createCollection}
          className="learning-folder-form"
        >
          <label>
            Nama fitur
            <input
              name="title"
              maxLength={120}
              required
            />
          </label>

          <label>
            Slug opsional
            <input
              name="slug"
              maxLength={120}
              pattern="[a-z0-9-]*"
            />
          </label>

          <label className="folder-form-full">
            Deskripsi
            <textarea
              name="description"
              maxLength={500}
            />
          </label>

          <button
            className="learning-save-button"
            type="submit"
          >
            simpan fitur
          </button>
        </form>
      )}

      <div className="learning-admin-list">
        {collections.map((item) => (
          <div
            className="learning-admin-row"
            key={item.id}
          >
            <div>
              <strong>{item.title}</strong>
              <small>/{item.slug}</small>
            </div>

            <form
              action={deleteCollection}
              onSubmit={confirmDelete}
            >
              <input
                type="hidden"
                name="id"
                value={item.id}
              />

              <button
                className="learning-delete-button"
                type="submit"
              >
                hapus
              </button>
            </form>
          </div>
        ))}
      </div>
    </section>
  );
}
