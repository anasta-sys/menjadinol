"use client";

import type { ReactNode } from "react";

type ReaderProtectedContentProps = {
  children: ReactNode;
  className?: string;
};

export default function ReaderProtectedContent({
  children,
  className = "",
}: ReaderProtectedContentProps) {
  return (
    <div
      className={`reader-protected-content ${className}`.trim()}
    >
      {children}
    </div>
  );
}