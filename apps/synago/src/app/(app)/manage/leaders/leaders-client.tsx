"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@qcc/ui/components/modal";
import { ROLE_LABELS, type Role } from "@qcc/core/permissions";
import { promoteLeaderAction, removeLeaderAction, searchMembersAction } from "../actions";

interface LeaderRow {
  id: string;
  role: Role;
  username: string;
  fullName: string;
  scopeLabel: string;
}

interface Option {
  id: string;
  name: string;
}

interface BacentaOption extends Option {
  area: "area1" | "area2";
}

interface MemberOption {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
}

interface LeadersClientProps {
  actorId: string;
  visibleLeaders: LeaderRow[];
  roleOptions: Role[];
  councilOptions: Option[];
  govOptions: Option[];
  scopedBacentas: BacentaOption[];
}

/** Typeahead search over members — queries the server live so nobody is
 * hidden by a stale, capped preload list (the old client-side select was
 * backed by a query capped at 500 members, which missed anyone past the
 * cutoff or added after the page loaded). */
function MemberSearchSelect({
  name,
  placeholder = "Search by name or phone…",
}: {
  name: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState<MemberOption[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setFiltered([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const rows = await searchMembersAction(q);
        if (!cancelled) setFiltered(rows);
      } catch {
        if (!cancelled) setFiltered([]);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const select = (m: MemberOption) => {
    setSelectedId(m.id);
    setQuery(`${m.firstName} ${m.lastName} — ${m.phoneNumber ?? "no phone"}`);
    setOpen(false);
  };

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selectedId} />
      <input
        className="input pr-8"
        placeholder={placeholder}
        value={query}
        autoFocus
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (selectedId) setSelectedId("");
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {selectedId && (
        <button
          type="button"
          onClick={() => {
            setSelectedId("");
            setQuery("");
          }}
          aria-label="Clear selected member"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
        >
          ✕
        </button>
      )}
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-zinc-800 bg-zinc-900 text-sm shadow-xl">
          {filtered.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(m)}
                className="block w-full px-3 py-2 text-left hover:bg-zinc-800"
              >
                {m.firstName} {m.lastName}{" "}
                <span className="text-zinc-500">— {m.phoneNumber}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LeadersClient({
  actorId,
  visibleLeaders,
  roleOptions,
  councilOptions,
  govOptions,
  scopedBacentas,
}: LeadersClientProps) {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [role, setRole] = useState<Role | "">("");
  const [removeTarget, setRemoveTarget] = useState<LeaderRow | null>(null);
  const [removing, setRemoving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const filteredLeaders = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return visibleLeaders;
    return visibleLeaders.filter(
      (l) =>
        l.fullName.toLowerCase().includes(term) ||
        l.username.toLowerCase().includes(term),
    );
  }, [visibleLeaders, search]);

  const closeModal = () => {
    setModalOpen(false);
    setRole("");
    formRef.current?.reset();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await promoteLeaderAction(formData);
    closeModal();
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const formData = new FormData();
      formData.set("leaderId", removeTarget.id);
      await removeLeaderAction(formData);
      setRemoveTarget(null);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold">Leaders & roles</h1>
        <button onClick={() => setModalOpen(true)} className="btn w-full sm:w-auto">
          + Promote leader
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or username..."
        className="input"
      />

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Scope</th>
              <th className="px-4 py-3 font-semibold">Username</th>
              <th className="px-4 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filteredLeaders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                  No leaders match.
                </td>
              </tr>
            ) : (
              filteredLeaders.map((l) => (
                <tr key={l.id} className="hover:bg-zinc-800/30">
                  <td className="whitespace-nowrap px-4 py-3 font-medium">{l.fullName}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-400">
                    {ROLE_LABELS[l.role]}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-400">
                    {l.scopeLabel || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-400">@{l.username}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {l.id !== actorId ? (
                      <button onClick={() => setRemoveTarget(l)} className="btn-danger">
                        Remove
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <Modal title="Promote a member to leader" onClose={closeModal}>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-zinc-500">
              Attaches a login to an existing member — never a duplicate
              person. A username is generated from their name (shown in the
              table after) and their password defaults to{" "}
              <span className="font-mono text-zinc-400">change-me-now</span>.
              Re-promoting an existing leader updates their role.
            </p>

            <div>
              <label className="label">Member</label>
              <MemberSearchSelect name="memberId" />
            </div>

            <div>
              <label className="label">Username (optional — auto-generated if blank)</label>
              <input
                name="username"
                className="input"
                placeholder="e.g. john.doe"
                pattern="[a-z0-9._-]+"
                title="Lowercase letters, numbers, dots, hyphens only"
              />
            </div>

            <div>
              <label className="label">Role</label>
              <select
                name="role"
                className="input"
                required
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                <option value="" disabled>
                  Select role
                </option>
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>

            {/* Only the scope field relevant to the chosen role is shown. */}
            {role === "council_leader" && (
              <div>
                <label className="label">Council</label>
                <select name="councilId" className="input" required defaultValue="">
                  <option value="" disabled>
                    Select a council
                  </option>
                  {councilOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {role === "governor" && (
              <div>
                <label className="label">Governorship</label>
                <select name="governorshipId" className="input" required defaultValue="">
                  <option value="" disabled>
                    Select a governorship
                  </option>
                  {govOptions.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {role === "bacenta_leader" && (
              <div>
                <label className="label">Bacenta</label>
                <select name="bacentaId" className="input" required defaultValue="">
                  <option value="" disabled>
                    Select a bacenta
                  </option>
                  {scopedBacentas.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.area === "area1" ? "A1" : "A2"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeModal} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn">
                Promote / update leader
              </button>
            </div>
          </form>
        </Modal>
      )}

      {removeTarget && (
        <Modal title="Remove leader" onClose={() => setRemoveTarget(null)}>
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">
              Remove <span className="font-semibold">{removeTarget.fullName}</span> as{" "}
              {ROLE_LABELS[removeTarget.role]}
              {removeTarget.scopeLabel ? ` of ${removeTarget.scopeLabel}` : ""}?
            </p>
            <p className="text-xs text-zinc-500">
              Their position becomes vacant immediately and can be assigned to
              someone else. They lose login access. Records they've already
              submitted stay attached to the bacenta and are not affected.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                disabled={removing}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={removing}
                className="btn-danger"
              >
                {removing ? "Removing…" : "Remove leader"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
