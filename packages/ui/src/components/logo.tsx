export function QccLogo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-label="Qodesh City Church"
    >
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2.5" />
      {/* steeple */}
      <path
        d="M24 6v10M20 16l4-6 4 6M18 34V18l6-4 6 4v16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Q tail */}
      <path
        d="M34 36l8 8"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
