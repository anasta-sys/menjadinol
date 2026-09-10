import PageBackLink from "@/app/components/PageBackLink";
import { redirect } from "next/navigation";

export default function LegacyLayananPage(){
  redirect("/perjalanan");
}

<PageBackLink />