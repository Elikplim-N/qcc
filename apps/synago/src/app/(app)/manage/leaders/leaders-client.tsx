"use client";

import { useMemo, useRef, useState } from "react";
import { Modal } from "@qcc/ui/components/modal";
import { ROLE_LABELS, type Role } from "@qcc/core/permissions";
import { promoteLeaderAction, setLeaderActiveAction } from "../actions";

interface LeaderRow {
  id: string;
  role: Role;
  username: string;
  isActive: boolean;
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
  phoneNumber: string;
}

interface LeadersClientProps {
  actorId: string;
  visibleLeaders: LeaderRow[];
  roleOptions: Role[];
  councilOptions: Option[];
  govOptions: Option[];
  scopedBacentas: BacentaOption[];
  scopedMembers: MemberOption[];
}

export function LeadersClient({
  actorId,
  visibleLeaders,
  roleOptions,
  councilOptions,
  govOptions,
  scopedBacentas,
  scopedMembers,
}: LeadersClientProps) {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [role, setRole] = useState<Role | "">("");
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

      <div className="card divide-y divide-zinc-800 p-0">
        {filteredLeaders.length === 0 ? (
          <p className="p-4 text-sm text-zinc-500">No leaders match.</p>
        ) : (
          filteredLeaders.map((l) => (
            <div
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {l.fullName}{" "}
                  <span className="text-xs text-zinc-500">@{l.username}</span>
                </div>
                <div className="truncate text-xs text-zinc-500">
                  {ROLE_LABELS[l.role]}
                  {l.scopeLabel ? ` · ${l.scopeLabel}` : ""}
                  {!l.isActive ? " · DEACTIVATED" : ""}
                </div>
              </div>
              {l.id !== actorId ? (
                <form action={setLeaderActiveAction} className="shrink-0">
                  <input type="hidden" name="leaderId" value={l.id} />
                  <input type="hidden" name="active" value={String(!l.isActive)} />
                  <button className={l.isActive ? "btn-danger" : "btn-secondary"}>
                    {l.isActive ? "Deactivate" : "Reactivate"}
                  </button>
                </form>
              ) : null}
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <Modal title="Promote a member to leader" onClose={closeModal}>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-zinc-500">
              Attaches a login to an existing member — never a duplicate
              person. Re-promoting an existing leader updates their role and
              password.
            </p>

            <div>
              <label className="label">Member</label>
              <select name="memberId" className="input" required defaultValue="" autoFocus>
                <option value="" disabled>
                  Select member
                </option>
                {scopedMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName} — {m.phoneNumber}
                  </option>
                ))}
              </select>
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

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Username (optional)</label>
                <input
                  name="username"
                  className="input"
                  autoCapitalize="none"
                  placeholder="e.g. kofi.mensah (auto if empty)"
                />
              </div>
              <div>
                <label className="label">Password (optional)</label>
                <input
                  name="password"
                  className="input"
                  placeholder="Defaults to 'change-me-now'"
                />
              </div>
            </div>

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
    </div>
  );
}
