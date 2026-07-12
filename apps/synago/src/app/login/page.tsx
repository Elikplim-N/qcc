"use client";

import { useActionState } from "react";

import { QccLogo } from "@qcc/ui/components/logo";
import { loginAction, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-zinc-100">
          <QccLogo size={64} />
          <h1 className="text-xl font-bold tracking-wide">QCC Synago</h1>
          <p className="text-sm text-zinc-400">Operations & arrivals — leader sign in</p>
        </div>
        <form action={formAction} className="card space-y-4">
          <div>
            <label className="label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              name="username"
              className="input"
              autoComplete="username"
              autoCapitalize="none"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              autoComplete="current-password"
              required
            />
          </div>
          {state.error ? (
            <p className="text-sm text-red-400">{state.error}</p>
          ) : null}
          <button className="btn w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-zinc-500">
          Accounts are created by your leader. No self sign-up.
        </p>
      </div>
    </main>
  );
}
