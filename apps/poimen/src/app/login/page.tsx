"use client";

import { useActionState } from "react";

import { QccLogoFull } from "@qcc/ui/components/logo";
import { loginAction, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#09090b] p-6">
      {/* Background ambient lighting */}
      <div className="absolute -left-1/4 -top-1/4 h-[60%] w-[60%] rounded-full bg-indigo-500/10 blur-[120px]" />
      <div className="absolute -bottom-1/4 -right-1/4 h-[60%] w-[60%] rounded-full bg-violet-500/5 blur-[120px]" />

      <div className="relative z-10 w-full max-w-sm animate-[slide-up_0.2s_ease-out]">
        <div className="mb-8 flex flex-col items-center gap-2 text-center text-zinc-100">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-6 py-4 shadow-xl shadow-indigo-950/10">
            <QccLogoFull size={64} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-100 mt-2">QCC Poimen</h1>
          <p className="text-sm text-zinc-400 font-medium">Member directory &amp; journeys — leader sign in</p>
        </div>

        <form action={formAction} className="card p-6 space-y-4 border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md shadow-2xl">
          <div>
            <label className="label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              name="username"
              className="input transition-all duration-200"
              autoComplete="username"
              autoCapitalize="none"
              placeholder="e.g. chiefadmin"
              required
              disabled={pending}
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
              className="input transition-all duration-200"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              disabled={pending}
            />
          </div>

          {state.error ? (
            <div className="flex items-center gap-2.5 rounded-lg border border-red-900/30 bg-red-950/20 px-3 py-2 text-xs font-semibold text-red-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{state.error}</span>
            </div>
          ) : null}

          <button className="btn w-full font-bold cursor-pointer" disabled={pending}>
            {pending ? (
              <>
                <span className="spinner mr-2" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-zinc-500 font-medium">
          Accounts are created by your leader. No self sign-up.
        </p>
      </div>
    </main>
  );
}
