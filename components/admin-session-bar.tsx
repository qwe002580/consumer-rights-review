"use client";

import React, { useState } from "react";

export function AdminSessionBar() {
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      window.location.assign("/admin/login");
    }
  }

  return (
    <div className="admin-session-bar">
      <span>案件管理后台</span>
      <button disabled={loggingOut} onClick={handleLogout} type="button">
        {loggingOut ? "正在退出..." : "退出登录"}
      </button>
    </div>
  );
}
