import { redirect } from "next/navigation";

export const metadata = { title: "Login Penulis · menjadi nol", robots: { index:false, follow:false } };

export default function LoginPage() {
  redirect("/writer-login");
}
