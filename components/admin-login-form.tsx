"use client";

import React, { useState, type FormEvent } from "react";

export function AdminLoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: formData.get("username"),
          password: formData.get("password")
        })
      });

      if (!response.ok) {
        throw new Error("账号或密码不正确");
      }

      window.location.assign("/cases");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "登录失败，请稍后再试");
      setSubmitting(false);
    }
  }

  return (
    <form className="admin-login-form" onSubmit={handleSubmit}>
      <label>
        <span>账号</span>
        <input
          autoComplete="username"
          name="username"
          placeholder="请输入后台账号"
          required
          type="text"
        />
      </label>
      <label>
        <span>密码</span>
        <input
          autoComplete="current-password"
          name="password"
          placeholder="请输入后台密码"
          required
          type="password"
        />
      </label>
      {error ? <p className="login-error" role="alert">{error}</p> : null}
      <button className="primary-button" disabled={submitting} type="submit">
        {submitting ? "登录中..." : "登录后台"}
      </button>
    </form>
  );
}
