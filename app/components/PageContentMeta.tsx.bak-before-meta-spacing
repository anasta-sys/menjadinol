type Props = {
  authorName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  location?: string | null;
};

function formatWib(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const tanggal = new Intl.DateTimeFormat(
    "id-ID",
    {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(date);

  const jam = new Intl.DateTimeFormat(
    "id-ID",
    {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  )
    .format(date)
    .replace(":", ".");

  return `${tanggal} · ${jam} WIB`;
}

export default function PageContentMeta({
  authorName,
  createdAt,
  updatedAt,
  location,
}: Props) {
  const dateValue =
    updatedAt || createdAt;

  const formatted =
    formatWib(dateValue);

  if (
    !authorName &&
    !formatted &&
    !location
  ) {
    return null;
  }

  return (
    <div className="page-content-meta">
      <div>
        {authorName && (
          <span>
            Ditulis oleh{" "}
            <strong>
              {authorName}
            </strong>
          </span>
        )}

        {authorName &&
          formatted && (
            <span> · </span>
          )}

        {formatted && (
          <span>
            {formatted}
          </span>
        )}
      </div>

      {location && (
        <div className="page-content-location">
          📍 {location}
        </div>
      )}

      <style jsx>{`
        .page-content-meta {
          margin: 10px 0 22px;
          color: #748077;
          font-size: 12px;
          line-height: 1.65;
        }

        .page-content-meta strong {
          color: #526454;
          font-weight: 700;
        }

        .page-content-location {
          margin-top: 3px;
        }
      `}</style>
    </div>
  );
}