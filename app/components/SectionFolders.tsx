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
  id:string;
  section:Section;
  title:string;
  slug:string;
  description:string;
};

function sectionPath(section:Section) {
  if(section === "layanan") return "/perjalanan/folder";
  if(section === "ruang-belajar") return "/ruang-belajar/tema";
  return `/${section}/folder`;
}

function sectionIcon(section:Section) {
  switch(section) {
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

  const { data: claims } =
    await supabase.auth.getClaims();

  if(!claims?.claims?.sub) {
    return false;
  }

  const { data: aal } =
    await supabase.auth.mfa
      .getAuthenticatorAssuranceLevel();

  if(aal?.currentLevel !== "aal2") {
    return false;
  }

  const { data: admin } =
    await supabase
      .from("admin_users")
      .select("user_id")
      .eq(
        "user_id",
        claims.claims.sub
      )
      .maybeSingle();

  return !!admin;
}

export default async function SectionFolders({
  folders
}:{
  folders:Folder[];
}) {
  if(!folders.length) {
    return null;
  }

  const isAdmin = await userIsAdmin();

  return (
    <section
      className="section-folder-grid"
      aria-label="Konten halaman"
    >
      {folders.map((folder) => {
        const basePath =
          sectionPath(folder.section);

        const icon =
          sectionIcon(folder.section);

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
                <span className="section-cute-spark">
                  ✦
                </span>

                <span className="section-cute-emoji">
                  {icon}
                </span>
              </div>

              <div className="section-folder-copy">
                <h2>
                  {folder.title}
                </h2>

                {folder.description && (
                  <p>
                    {folder.description}
                  </p>
                )}
              </div>

              <span
                className="folder-arrow"
                aria-hidden="true"
              >
                →
              </span>
            </Link>

            {isAdmin && (
              <SectionFolderAdminActions
                folder={{
                  id:folder.id,
                  title:folder.title,
                  slug:folder.slug,
                  description:folder.description,
                }}
              />
            )}
          </article>
        );
      })}
    </section>
  );
}
