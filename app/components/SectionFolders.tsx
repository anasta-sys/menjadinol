import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SectionFolderAdminActions from "@/app/components/SectionFolderAdminActions";

type Section =
  | "tentang"
  | "artikel"
  | "layanan"
  | "ruang-belajar"
  | "ruang-jeda"
  | "kontak";

type Folder = {
  id: string;
  section: Section;
  title: string;
  slug: string;
  description: string;
  parent_id?: string | null;
};

function sectionPath(section: Section) {
  if (section === "layanan") return "/perjalanan";
  if (section === "ruang-belajar") return "/ruang-belajar";
  if (section === "artikel") return "/cerita-makna";
  return `/${section}`;
}

function JourneyIcon({ index }: { index: number }) {
  const type = index % 8;

  const common = {
    width: 54,
    height: 54,
    viewBox: "0 0 64 64",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
  };

  if (type === 0) {
    return (
      <svg {...common}>
        <circle cx="32" cy="32" r="30" fill="#E5F2DC" />
        <path d="M32 49V28" stroke="#356B37" strokeWidth="3" strokeLinecap="round" />
        <path d="M31 31C20 31 15 24 16 17C26 16 32 21 31 31Z" fill="#6EA94B" />
        <path d="M33 27C34 17 41 12 50 14C49 23 43 28 33 27Z" fill="#3F7D3C" />
        <path d="M32 49C27 43 23 40 18 39" stroke="#83B85D" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 1) {
    return (
      <svg {...common}>
        <circle cx="32" cy="32" r="30" fill="#F7E9D5" />
        <ellipse cx="32" cy="45" rx="17" ry="6" fill="#8A5A32" />
        <ellipse cx="32" cy="36" rx="13" ry="5" fill="#A87542" />
        <ellipse cx="32" cy="28" rx="9" ry="4" fill="#C2945D" />
        <ellipse cx="32" cy="21" rx="5" ry="3" fill="#D6AD75" />
      </svg>
    );
  }

  if (type === 2) {
    return (
      <svg {...common}>
        <circle cx="32" cy="32" r="30" fill="#E2F0DF" />
        <circle cx="32" cy="33" r="18" fill="#FFF9E8" stroke="#B88A2D" strokeWidth="3" />
        <circle cx="32" cy="33" r="3" fill="#315F39" />
        <path d="M32 17L37 31L32 49L27 35Z" fill="#3D7B43" />
        <path d="M16 33L30 28L48 33L34 38Z" fill="#D5A93E" />
        <path d="M32 15V11" stroke="#8A6725" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="32" cy="9" r="3" stroke="#8A6725" strokeWidth="2" />
      </svg>
    );
  }

  if (type === 3) {
    return (
      <svg {...common}>
        <circle cx="32" cy="32" r="30" fill="#FBE4DF" />
        <path
          d="M32 47C27 39 17 34 17 25C17 18 26 16 32 24C38 16 47 18 47 25C47 34 37 39 32 47Z"
          fill="#D87862"
        />
        <path d="M32 26V44" stroke="#B95E4E" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 4) {
    return (
      <svg {...common}>
        <circle cx="32" cy="32" r="30" fill="#DDEFFA" />
        <path d="M11 19C20 17 27 19 32 24V48C27 43 20 42 11 44V19Z" fill="#FFFFFF" stroke="#438DB1" strokeWidth="2" />
        <path d="M53 19C44 17 37 19 32 24V48C37 43 44 42 53 44V19Z" fill="#FFFFFF" stroke="#438DB1" strokeWidth="2" />
        <path d="M32 24V48" stroke="#2E789C" strokeWidth="2" />
      </svg>
    );
  }

  if (type === 5) {
    return (
      <svg {...common}>
        <circle cx="32" cy="32" r="30" fill="#DCEFE4" />
        <path d="M5 45C16 34 19 22 32 18C44 14 52 19 59 23V53H5V45Z" fill="#79AD78" />
        <path d="M5 49C18 44 20 31 32 28C44 25 51 33 59 37V53H5V49Z" fill="#4D8B5A" />
        <path d="M29 54C27 45 28 39 33 34C37 30 41 28 46 26" stroke="#FFF6D9" strokeWidth="5" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 6) {
    return (
      <svg {...common}>
        <circle cx="32" cy="32" r="30" fill="#E9DFF7" />
        <path d="M32 48C23 42 20 34 22 27C27 29 30 33 32 38C34 33 37 29 42 27C44 34 41 42 32 48Z" fill="#7955B5" />
        <path d="M32 39C26 33 26 24 32 17C38 24 38 33 32 39Z" fill="#9A74CE" />
        <path d="M31 48C21 48 15 43 13 36C21 35 27 38 32 44C37 38 43 35 51 36C49 43 43 48 33 48Z" fill="#6845A1" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="32" cy="32" r="30" fill="#E1F1DF" />
      <path
        d="M17 45C21 25 34 15 49 16C48 32 37 44 17 45Z"
        fill="#4D9147"
      />
      <path d="M18 46C27 37 35 30 47 20" stroke="#275F32" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M30 35C27 31 25 28 24 24" stroke="#76B46A" strokeWidth="2" strokeLinecap="round" />
      <path d="M36 29C40 29 43 28 46 26" stroke="#76B46A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

async function userIsAdmin() {
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims?.sub) {
    return false;
  }

  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aal?.currentLevel !== "aal2") {
    return false;
  }

  const { data: admin } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", claims.claims.sub)
    .maybeSingle();

  return !!admin;
}

export default async function SectionFolders({
  folders,
}: {
  folders: Folder[];
}) {
  if (!folders.length) {
    return null;
  }

  const isAdmin = await userIsAdmin();

  return (
    <section
      className="section-folder-grid"
      aria-label="Fitur halaman"
    >
      {folders.map((folder, index) => {
        const basePath = sectionPath(folder.section);

        return (
          <article
            key={folder.id}
            className="section-folder-shell"
          >
            <Link
              className="section-folder-card"
              href={`${basePath}/${folder.slug}`}
            >
              <div
                className="section-cute-icon"
                aria-hidden="true"
              >

                <JourneyIcon index={index} />
              </div>

              <div className="section-folder-copy">
                <h2>{folder.title}</h2>

                {folder.description && (
                  <p>{folder.description}</p>
                )}
              </div>

              <span
                className="folder-arrow"
                aria-hidden="true"
              >
                &rarr;
              </span>
            </Link>

            {isAdmin && (
              <SectionFolderAdminActions
                folder={{
                  id: folder.id,
                  title: folder.title,
                  slug: folder.slug,
                  description: folder.description,
                }}
              />
            )}
          </article>
        );
      })}
    </section>
  );
}




