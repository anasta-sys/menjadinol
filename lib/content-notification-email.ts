import { Resend } from "resend";

type ContentStatus = "draft" | "review" | "published";

type SendContentNotificationParams = {
  to: string;
  name?: string | null;
  title: string;
  section: string;
  status: ContentStatus;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getSectionLabel(section: string) {
  const labels: Record<string, string> = {
    "ruang-belajar": "Ruang Belajar",
    artikel: "Artikel",
    layanan: "Perjalanan",
    tentang: "Tentang",
    sinopsis: "Sinopsis",
    kontak: "Kontak",
  };

  return labels[section] ?? section;
}

function getStatusInfo(status: ContentStatus) {
  if (status === "published") {
    return {
      label: "Published",
      subject: "Konten berhasil dipublikasikan — Menjadi Nol",
      message: "berhasil dipublikasikan",
    };
  }

  if (status === "review") {
    return {
      label: "Review",
      subject: "Konten berhasil dikirim untuk review — Menjadi Nol",
      message: "berhasil dikirim untuk review",
    };
  }

  return {
    label: "Draft",
    subject: "Draft berhasil disimpan — Menjadi Nol",
    message: "berhasil disimpan sebagai Draft",
  };
}

export async function sendContentNotificationEmail({
  to,
  name,
  title,
  section,
  status,
}: SendContentNotificationParams) {
  /*
   * Helper ini sengaja tidak melempar error ke proses utama.
   * Email gagal tidak boleh membuat penyimpanan konten gagal.
   */
  try {
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.OTP_FROM_EMAIL;

    if (!resendKey || !from) {
      console.error(
        "Notifikasi konten tidak dikirim: RESEND_API_KEY atau OTP_FROM_EMAIL belum tersedia."
      );
      return;
    }

    if (!to) {
      console.error(
        "Notifikasi konten tidak dikirim: email penerima tidak tersedia."
      );
      return;
    }

    const resend = new Resend(resendKey);

    const sectionLabel = getSectionLabel(section);
    const statusInfo = getStatusInfo(status);

    const displayName =
      name?.trim() ||
      to.split("@")[0] ||
      "Penulis";

    const dateText = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    }).format(new Date());

    const safeName = escapeHtml(displayName);
    const safeTitle = escapeHtml(title);
    const safeSection = escapeHtml(sectionLabel);
    const safeDate = escapeHtml(dateText);

    const { error } = await resend.emails.send({
      from,
      to,
      subject: statusInfo.subject,

      text: [
        `Hai ${displayName},`,
        "",
        `Konten "${title}" ${statusInfo.message}.`,
        "",
        `Bagian: ${sectionLabel}`,
        `Status: ${statusInfo.label}`,
        `Waktu: ${dateText} WIB`,
        "",
        "Menjadi Nol",
        "Perjalanan pulang dalam diri",
      ].join("\n"),

      html: `
        <div style="
          margin:0;
          padding:32px 16px;
          background:#f7f6f0;
          font-family:Arial,Helvetica,sans-serif;
          color:#26372d;
        ">
          <div style="
            max-width:600px;
            margin:0 auto;
            padding:34px;
            background:#ffffff;
            border:1px solid #e2e6df;
            border-radius:22px;
          ">
            <div style="
              margin-bottom:16px;
              font-size:12px;
              font-weight:700;
              letter-spacing:.18em;
              color:#718577;
            ">
              MENJADI NOL
            </div>

            <h1 style="
              margin:0 0 24px;
              font-family:Georgia,serif;
              font-size:27px;
              line-height:1.3;
              font-weight:400;
              color:#173d2a;
            ">
              ${escapeHtml(statusInfo.subject.replace(" — Menjadi Nol", ""))}
            </h1>

            <p style="
              margin:0 0 16px;
              font-size:15px;
              line-height:1.7;
            ">
              Hai <strong>${safeName}</strong>,
            </p>

            <p style="
              margin:0 0 22px;
              font-size:15px;
              line-height:1.7;
            ">
              Konten <strong>“${safeTitle}”</strong>
              ${escapeHtml(statusInfo.message)}.
            </p>

            <div style="
              padding:18px 20px;
              background:#f4f6f1;
              border-radius:14px;
              font-size:14px;
              line-height:1.9;
            ">
              <strong>Bagian:</strong> ${safeSection}<br />
              <strong>Status:</strong> ${statusInfo.label}<br />
              <strong>Waktu:</strong> ${safeDate} WIB
            </div>

            <div style="
              margin-top:30px;
              padding-top:20px;
              border-top:1px solid #e8ebe6;
              font-family:Georgia,serif;
              color:#607468;
              line-height:1.6;
            ">
              Menjadi Nol<br />
              <span style="
                font-family:Arial,Helvetica,sans-serif;
                font-size:13px;
              ">
                Perjalanan pulang dalam diri
              </span>
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error(
        "Resend notifikasi konten gagal:",
        error
      );
    }
  } catch (error) {
    console.error(
      "Gagal mengirim email notifikasi konten:",
      error
    );
  }
}