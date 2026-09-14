type Props = {
  authorName?: string | null;
  createdAt?: string | null;
  location?: string | null;
};

function formatDateTime(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const formatted = new Intl.DateTimeFormat(
    "id-ID",
    {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  ).format(date);

  return `${formatted} WIB`;
}

export default function EntryMeta({
  authorName,
  createdAt,
  location,
}: Props) {
  const dateTime =
    formatDateTime(createdAt);

  if (
    !authorName &&
    !dateTime &&
    !location
  ) {
    return null;
  }

  return (
    <div
      style={{
        margin:
          "10px 0 22px",
        color: "#71806f",
        fontSize: "12px",
        lineHeight: 1.7,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "7px",
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {authorName && (
          <span>
            {authorName}
          </span>
        )}

        {authorName &&
          dateTime && (
            <span
              aria-hidden="true"
            >
              ·
            </span>
          )}

        {dateTime && (
          <span>
            {dateTime}
          </span>
        )}
      </div>

      {location && (
        <div
          style={{
            marginTop: "3px",
            fontWeight: 500,
            textTransform: "none",
            letterSpacing: 0,
          }}
        >
          📍 {location}
        </div>
      )}
    </div>
  );
}