import { QccLogo } from "./logo";

// Full-area loading indicator: spinning ring with the pulsing QCC mark inside.
// Pure CSS animation, safe to render from Server Components (loading.tsx).
export function QccLoader({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const ring = { sm: "h-16 w-16", md: "h-24 w-24", lg: "h-32 w-32" }[size];
  const logo = { sm: 34, md: 52, lg: 72 }[size];

  return (
    <div className={`flex min-h-[200px] w-full items-center justify-center ${className}`}>
      <div className="relative flex items-center justify-center">
        <div
          className={`absolute animate-spin rounded-full border-4 border-indigo-400 border-r-transparent ${ring}`}
        />
        <div className="relative z-10 animate-pulse text-zinc-100">
          <QccLogo size={logo} />
        </div>
      </div>
    </div>
  );
}
