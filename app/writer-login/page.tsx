import WriterLoginClient from "./WriterLoginClient";

export const metadata = { title: "Login Penulis · kembali ke nol", robots: { index:false, follow:false } };

export default function WriterLoginPage() {
  return <main className="proper-login-page"><div className="shell"><WriterLoginClient /></div></main>;
}
