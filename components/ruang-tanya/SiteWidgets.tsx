"use client";

import { usePathname } from "next/navigation";
import RuangTanya from "./RuangTanya";
import RuangCerita from "../ruang-cerita/RuangCerita";

type SiteWidgetsProps = {
  accountName?: string;
};

export default function SiteWidgets({
  accountName = "",
}: SiteWidgetsProps) {
  const pathname = usePathname();

  const hideOnAuthPage =
    pathname === "/reader-login" ||
    pathname === "/reader-register";

  if (hideOnAuthPage) {
    return null;
  }

  return (
    <>
      <RuangCerita />
      <RuangTanya
        userName={accountName.trim() || "Kamu"}
      />
    </>
  );
}
