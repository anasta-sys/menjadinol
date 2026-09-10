import AdminLoginClient from "./AdminLoginClient";

export const metadata = { title: "Login Admin · kembali ke nol", robots: { index:false, follow:false } };

export default function AdminLoginPage() {
  return <main className="proper-login-page"><div className="shell"><AdminLoginClient /></div></main>;
}
