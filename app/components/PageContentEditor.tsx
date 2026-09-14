import type {
  ReactNode,
} from "react";

export default function PageContentEditor({
  children,
  title = "Kelola halaman",
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <section className="page-content-editor">
      <div className="page-content-editor-head">
        <span className="eyebrow">
          admin
        </span>

        <h2>{title}</h2>
      </div>

      <div className="page-content-editor-body">
        {children}
      </div>
    </section>
  );
}