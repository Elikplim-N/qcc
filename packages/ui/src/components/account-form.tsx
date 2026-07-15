"use client";

// Self-service account settings: change username and/or password.
// Both fields are optional — blank means "keep current".
export function AccountForm({
  action,
  username,
}: {
  action: (formData: FormData) => Promise<void>;
  username: string;
}) {
  return (
    <form action={action} className="card max-w-2xl space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
        Account Settings
      </h2>
      <p className="text-xs text-zinc-500">
        Manage your username and password to keep your account secure.
      </p>

      <div className="space-y-4">
        <div>
          <label className="label">Username</label>
          <input
            name="username"
            type="text"
            className="input"
            defaultValue={username}
            minLength={3}
            autoCapitalize="none"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Leave unchanged to keep your current username
          </p>
        </div>

        <div className="border-t border-zinc-800 pt-4">
          <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Change Password (Optional)
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">New password (min 8 chars)</label>
              <input
                name="password"
                type="password"
                className="input"
                minLength={8}
                placeholder="Leave empty to keep current"
              />
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input
                name="confirmPassword"
                type="password"
                className="input"
                minLength={8}
                placeholder="Leave empty to keep current"
              />
            </div>
          </div>
        </div>
      </div>

      <button className="btn w-full sm:w-auto">Save changes</button>
    </form>
  );
}
