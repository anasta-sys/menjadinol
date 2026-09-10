"use client";

import { useState } from "react";

export default function ReaderLogoutButton() {
  const [submitting, setSubmitting] =
    useState(false);

  return (
    <form
      action="/api/logout"
      method="post"
      style={{
        display: "inline",
        margin: 0,
      }}
      onSubmit={() => setSubmitting(true)}
    >
      <button
        type="submit"
        className="reader-logout-button"
        disabled={submitting}
        aria-label="Keluar"
      >
        {submitting ? "keluar..." : "logout"}
      </button>
    </form>
  );
}
