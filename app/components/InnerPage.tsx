import type {
  ReactNode,
} from "react";

export default function InnerPage({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={`inner-page ${className}`}
    >
      <div className="shell inner-card">
        {children}
      </div>
    </main>
  );
}