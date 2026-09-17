import type { ReactNode } from "react";

export function SectionLeaf({
  slug,
  size = 96,
}: {
  slug: string;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 120 120",
    "aria-hidden": true,
  } as const;

  if (slug === "tentang") {
    return (
      <svg {...common}>
        <defs><linearGradient id="tentangLeaf" x1="0" y1="1" x2="1" y2="0"><stop stopColor="#2f7139"/><stop offset="1" stopColor="#76ad65"/></linearGradient></defs>
        <path d="M23 98C18 59 43 27 99 14c-1 48-27 78-76 84Z" fill="url(#tentangLeaf)"/>
        <path d="M25 97C43 67 64 45 89 25" fill="none" stroke="#dcebd7" strokeWidth="2.4" strokeLinecap="round"/>
        <path d="M45 71 40 50M59 56 57 35M43 72l23-4M58 56l22-5" fill="none" stroke="#dcebd7" strokeWidth="1.2" opacity=".65"/>
      </svg>
    );
  }

  if (slug === "perjalanan") {
    return (
      <svg {...common}>
        <path d="M20 101C37 72 59 44 93 20" fill="none" stroke="#356f38" strokeWidth="3" strokeLinecap="round"/>
        <path d="M31 83C13 77 9 63 14 49c18 3 26 14 17 34Z" fill="#5e9850"/>
        <path d="M49 63C34 50 38 35 49 25c14 11 15 24 0 38Z" fill="#3f813f"/>
        <path d="M67 47C58 29 67 17 81 12c9 15 4 28-14 35Z" fill="#70a75a"/>
        <path d="M55 79C70 65 84 67 94 78c-13 13-27 13-39 1Z" fill="#4c8b45"/>
        <path d="M75 57C91 47 103 52 109 64c-15 9-27 6-34-7Z" fill="#76a963"/>
      </svg>
    );
  }

  if (slug === "ruang-belajar") {
    return (
      <svg {...common}>
        <path d="M28 102C44 77 58 54 78 26" fill="none" stroke="#356f38" strokeWidth="3" strokeLinecap="round"/>
        {[0,1,2,3,4].map((i) => (
          <g key={i} transform={`translate(${i*10} ${-i*14})`}>
            <path d="M35 82C19 80 13 70 15 58c15 1 23 9 20 24Z" fill={i%2 ? "#4b8845" : "#6ca15a"}/>
            <path d="M43 72C50 57 62 54 73 59c-7 14-18 19-30 13Z" fill={i%2 ? "#75a966" : "#3f7e3f"}/>
          </g>
        ))}
      </svg>
    );
  }

  if (slug === "sinopsis") {
    return (
      <svg {...common}>
        <path d="M24 103C22 70 37 36 83 17c15 31 3 68-36 84Z" fill="#438141"/>
        <path d="M27 101C44 73 59 52 76 30" fill="none" stroke="#dcebd7" strokeWidth="2.3"/>
        <path d="M42 78c-12-12-17-24-16-35M54 61c-8-14-9-26-6-36M41 79c17-1 29-5 40-12M54 61c14-3 24-8 33-16" fill="none" stroke="#dcebd7" strokeWidth="2" strokeLinecap="round"/>
        <path d="M32 55c8-5 16-7 25-6M48 42c7-4 14-5 22-4" fill="none" stroke="#dcebd7" strokeWidth="1.6" opacity=".8"/>
      </svg>
    );
  }

  if (slug === "artikel") {
    return (
      <svg {...common}>
        <path d="M22 101C42 74 60 50 86 20" fill="none" stroke="#356f38" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="31" cy="83" r="15" fill="#6e9d73"/>
        <circle cx="47" cy="67" r="16" fill="#527f5c"/>
        <circle cx="64" cy="50" r="15" fill="#82a987"/>
        <circle cx="80" cy="31" r="14" fill="#5b8c64"/>
        <circle cx="69" cy="79" r="15" fill="#8eaf8e"/>
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M24 102C43 75 60 51 87 20" fill="none" stroke="#356f38" strokeWidth="3" strokeLinecap="round"/>
      <path d="M35 83C17 78 13 64 18 51c17 3 25 14 17 32Z" fill="#4d8745"/>
      <path d="M50 65C38 50 43 36 55 28c12 13 10 26-5 37Z" fill="#6ca05a"/>
      <path d="M66 48C60 31 69 20 83 17c6 15 0 27-17 31Z" fill="#3e7b3d"/>
      <path d="M58 77C73 65 88 68 96 80c-14 11-27 9-38-3Z" fill="#7ca76c"/>
      <path d="M77 58C91 47 104 51 111 62c-13 10-26 8-34-4Z" fill="#568d49"/>
    </svg>
  );
}

export function LeafBadge({
  slug,
  children,
}: {
  slug: string;
  children?: ReactNode;
}) {
  return (
    <div style={{
      width: 124,
      height: 124,
      borderRadius: "50%",
      display: "grid",
      placeItems: "center",
      background: "rgba(226,239,218,.62)",
      flex: "0 0 auto",
    }}>
      <SectionLeaf slug={slug} size={108} />
      {children}
    </div>
  );
}
