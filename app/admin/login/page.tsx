import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin-login-form";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (verifyAdminSessionToken(token)) {
    redirect("/cases");
  }

  return (
    <main className="admin-login-shell">
      <section className="admin-login-card">
        <div className="admin-login-mark" aria-hidden="true">案</div>
        <p className="eyebrow">Secure Access</p>
        <h1>案件管理后台</h1>
        <p className="muted-copy">请输入管理员账号和密码，查看客户提交的案件资料。</p>
        <AdminLoginForm />
        <p className="admin-login-note">登录状态将在此设备保留 7 天，请勿在公共设备上使用。</p>
      </section>
    </main>
  );
}
