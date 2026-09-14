import PageContentMeta from "@/app/components/PageContentMeta";

export type PageContentData = {
  page_key: string;
  eyebrow: string | null;
  title: string;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
  author_id: string | null;
  author_name?: string | null;
  writer_location?: string | null;
};

export default function PageContent({
  content,
}: {
  content: PageContentData;
}) {
  return (
    <>
      {content.eyebrow && (
        <p className="eyebrow">
          {content.eyebrow}
        </p>
      )}

      <h1>{content.title}</h1>

      <PageContentMeta
        authorName={
          content.author_name
        }
        createdAt={
          content.created_at
        }
        updatedAt={
          content.updated_at
        }
        location={
          content.writer_location
        }
      />

      {content.description && (
        <div
          className="jp-rich-render"
          dangerouslySetInnerHTML={{
            __html:
              content.description,
          }}
        />
      )}
    </>
  );
}