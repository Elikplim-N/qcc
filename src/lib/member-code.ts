// Human-readable member code generated from name + phone,
// e.g. "QCC-AK-2481-7X".
export function generateMemberCode(
  firstName: string,
  lastName: string,
  phone: string,
): string {
  const initials = `${firstName[0] ?? "X"}${lastName[0] ?? "X"}`.toUpperCase();
  const digits = phone.replace(/\D/g, "").slice(-4).padStart(4, "0");
  const rand = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `QCC-${initials}-${digits}-${rand}`;
}
