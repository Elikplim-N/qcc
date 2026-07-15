/* eslint-disable @next/next/no-img-element */
// Official Qodesh City Church logo. The PNG (white artwork, transparent
// background) lives in each app's public folder as /qodesh-logo.png.

export function QccLogo({ size = 36 }: { size?: number }) {
  return (
    <img
      src="/qodesh-logo.png"
      alt="Qodesh City Church"
      width={size}
      height={size}
      className="object-contain"
    />
  );
}

// Larger lockup for login / public pages — same artwork, bigger canvas so
// the "Qodesh City Church" wordmark inside the PNG stays readable.
export function QccLogoFull({
  size = 128,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src="/qodesh-logo.png"
      alt="Qodesh City Church"
      width={size}
      height={size}
      className={`object-contain ${className}`}
    />
  );
}
