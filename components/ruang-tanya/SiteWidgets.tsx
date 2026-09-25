"use client";

import RuangTanya from "./RuangTanya";
import RuangCerita from "../ruang-cerita/RuangCerita";

type SiteWidgetsProps = {
  accountName?: string;
};

export default function SiteWidgets({
  accountName = "",
}: SiteWidgetsProps) {
  return (
    <>
      <RuangCerita />
      <RuangTanya
        userName={accountName.trim() || "Kamu"}
      />
    </>
  );
}