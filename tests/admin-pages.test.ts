import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

afterEach(() => {
  delete process.env.ADMIN_PASSWORD;
});

describe("admin pages", () => {
  it("exposes a cases list page module", async () => {
    const page = await import("../app/(admin)/cases/page");
    expect(typeof page.default).toBe("function");
  });

  it("exposes a case detail page module", async () => {
    const page = await import("../app/(admin)/cases/[id]/page");
    expect(typeof page.default).toBe("function");
  });

  it("exposes the login page, protected layout, and session controls", async () => {
    const [loginPage, adminLayout, loginForm, sessionBar] = await Promise.all([
      import("../app/admin/login/page"),
      import("../app/(admin)/layout"),
      import("../components/admin-login-form"),
      import("../components/admin-session-bar")
    ]);

    expect(typeof loginPage.default).toBe("function");
    expect(typeof adminLayout.default).toBe("function");
    expect(typeof loginForm.AdminLoginForm).toBe("function");
    expect(typeof sessionBar.AdminSessionBar).toBe("function");
  });

  it("renders credential fields without exposing the configured password", async () => {
    process.env.ADMIN_PASSWORD = "server-only-password";
    const { AdminLoginForm } = await import("../components/admin-login-form");
    const html = renderToStaticMarkup(React.createElement(AdminLoginForm));

    expect(html).toContain('name="username"');
    expect(html).toContain('name="password"');
    expect(html).toContain('type="password"');
    expect(html).toContain("登录后台");
    expect(html).not.toContain("server-only-password");
  });
});
