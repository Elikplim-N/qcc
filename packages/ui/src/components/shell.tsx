"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { QccLogo } from "./logo";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
};

type IconName = "home" | "users" | "check" | "bus" | "radar" | "grid" | "gear";

function Icon({ name, className }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <path d="M3 11.5 12 4l9 7.5M5.5 10v9h13v-9" />,
    users: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 15.2c1.6.7 2.7 2 3 4.8" />
      </>
    ),
    check: (
      <>
        <rect x="4" y="5" width="16" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M8.5 14l2.5 2.5 4.5-5" />
      </>
    ),
    bus: (
      <>
        <rect x="4" y="4" width="16" height="13" rx="2" />
        <path d="M4 10h16M8 21v-2m8 2v-2" />
        <circle cx="8.5" cy="14" r="0.5" />
        <circle cx="15.5" cy="14" r="0.5" />
      </>
    ),
    radar: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 12l6-6" />
      </>
    ),
    grid: (
      <>
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </>
    ),
    gear: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2.5v3m0 13v3M4.6 4.6l2.1 2.1m10.6 10.6 2.1 2.1M2.5 12h3m13 0h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}

export function Shell({
  items,
  fullName,
  roleLabel,
  logout,
  appName = "QCC",
  children,
}: {
  items: NavItem[];
  fullName: string;
  roleLabel: string;
  logout: () => Promise<void>;
  appName?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : href === "/arrivals"
        ? pathname === "/arrivals"
        : pathname.startsWith(href);

  return (
    <div className="min-h-dvh md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-800 p-4 md:flex md:min-h-dvh">
        <div className="mb-8 flex items-center gap-3 px-2 text-zinc-100">
          <QccLogo size={34} />
          <div>
            <div className="text-sm font-bold tracking-wide">{appName}</div>
            <div className="text-[11px] text-zinc-500">Qodesh City Church</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive(it.href)
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              <Icon name={it.icon} className="h-5 w-5" />
              {it.label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 border-t border-zinc-800 pt-4">
          <div className="px-2 text-sm font-medium text-zinc-200">{fullName}</div>
          <div className="px-2 text-xs text-zinc-500">{roleLabel}</div>
          <form action={logout} className="mt-3 px-2">
            <button className="text-xs text-zinc-500 underline hover:text-zinc-300">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2 text-zinc-100">
          <QccLogo size={26} />
          <span className="text-sm font-bold tracking-wide">{appName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400">{roleLabel}</span>
          <form action={logout}>
            <button className="text-xs text-zinc-500 underline">Sign out</button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 p-4 pb-24 md:p-8 md:pb-8">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around gap-1 overflow-x-auto border-t border-zinc-800 bg-zinc-950/95 px-1 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur md:hidden">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`flex min-w-14 flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[10px] font-medium ${
              isActive(it.href) ? "text-white" : "text-zinc-500"
            }`}
          >
            <Icon name={it.icon} className="h-5 w-5" />
            {it.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
