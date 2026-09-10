import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SectionFolderAdminActions from "@/app/components/SectionFolderAdminActions";

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

function sectionPath(section: Section) {
  if (section === "layanan") {
    return "/perjalanan/folder";
  }

  if (section === "ruang-belajar") {
    return "/ruang-belajar/tema";
  }

  return `/${section}/folder`;
}

function sectionIcon(section: Section) {
  switch (section) {
    case "tentang":
      return "🦋";
    case "layanan":
      return "🪷";
    case "ruang-belajar":
      return "☘️";
    case "sinopsis":
      return "🌸";
    case "artikel":
      return "✨";
    case "kontak":
      return "💌";
    default:
      return "🌿";
  }
}

async function userIsAdmin() {
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  if (!userId) {
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
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(admin);
}

export default async function SectionFolders({
  folders,
}: {
  folders: Folder[];
}) {
  if (folders.length === 0) {
    return null;
  }

  const isAdmin = await userIsAdmin();

  const cards = folders.map((folder) => {
    const href = `${sectionPath(folder.section)}/${folder.slug}`;
    const icon = sectionIcon(folder.section);

    return (
      <article
        key={folder.id}
        className="section-folder-shell"
      >
        <Link
          className="section-folder-card"
          href={href}
        >
          <div
            className="section-cute-icon"
            aria-hidden="true"
          >
            <span className="section-cute-spark">
              ✦
            </span>

            <span className="section-cute-emoji">
              {icon}
            </span>
          </div>

          <div className="section-folder-copy">
            <h2>{folder.title}</h2>

            {folder.description ? (
              <p>{folder.description}</p>
            ) : null}
          </div>

          <span
            className="folder-arrow"
            aria-hidden="true"
          >
            →
          </span>
        </Link>

        {isAdmin ? (
          <SectionFolderAdminActions
            folder={{
              id: folder.id,
              title: folder.title,
              slug: folder.slug,
              description: folder.description,
            }}
          />
        ) : null}
      </article>
    );
  });

  return (
    <section
      className="section-folder-grid"
      aria-label="Konten halaman"
    >
      {cards}
    </section>
  );
}
