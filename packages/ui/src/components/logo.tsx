// Qodesh City Church logo. Drawn as an SVG so it stays crisp at any size and
// inherits currentColor (white on dark shells, any color elsewhere).

export function QccLogo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      aria-label="Qodesh City Church"
    >
      {/* circle, broken at the lower-right like the Q tail/swoosh */}
      <path
        d="M97 88a46 46 0 1 0-74.5 1"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* cross on the spire */}
      <path
        d="M60 8v12M54.5 13.5h11"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* tall pointed spire */}
      <path
        d="M60 20L44 88h32L60 20Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* spire brick texture */}
      <path
        d="M53 58h14M50.5 70h19M48 82h24M55.5 46h9M58 34h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.7"
      />
      {/* sanctuary roof sweeping right */}
      <path
        d="M76 88V56l22 20v12"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M84 74l6 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      {/* wave / swoosh across the base */}
      <path
        d="M22 92c14 10 34 12 52 6 14-4.5 24-3 32 2"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M34 100c12 6 28 7 42 2.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

// Mark + wordmark lockup, matching the official logo layout:
// the mark above "Qodesh" with "CITY CHURCH" letter-spaced beneath.
export function QccLogoFull({
  size = 96,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <QccLogo size={size} />
      <span
        className="font-light leading-none tracking-wide"
        style={{ fontSize: size * 0.34, marginTop: size * 0.06 }}
      >
        Qodesh
      </span>
      <span
        className="font-medium uppercase leading-none"
        style={{
          fontSize: size * 0.115,
          letterSpacing: size * 0.032,
          marginTop: size * 0.07,
        }}
      >
        City Church
      </span>
    </div>
  );
}
