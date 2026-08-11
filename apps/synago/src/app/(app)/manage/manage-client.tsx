"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@qcc/ui/components/status-badge";
import { Modal } from "@qcc/ui/components/modal";
import { Collapse } from "@qcc/ui/components/collapse";
import {
  createBacentaAction,
  createCouncilAction,
  createGovernorshipAction,
  searchMembersAction,
} from "./actions";

interface BacentaRow {
  id: string;
  name: string;
  area: string;
  governorshipName: string;
  councilName: string;
  memberCount: number;
  leaderName?: string;
}

interface MemberOption {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
}

interface GovernorshipRow {
  id: string;
  name: string;
  area: string;
  councilName: string | null;
}

interface ManageClientProps {
  visibleBacentas: BacentaRow[];
  visibleGovs: GovernorshipRow[];
  creatableCouncils: any[];
  creatableGovs: any[];
  canCreateCouncil: boolean;
  canCreateGov: boolean;
  isChiefAdmin: boolean;
}

/** Typeahead search over members — queries the server live so nobody is
 * hidden by a stale, capped preload list (the old client-side selects were
 * backed by a query capped at 500 members, which missed anyone past the
 * cutoff or added after the page loaded). */
function MemberSearchSelect({
  name,
  onSelect,
  placeholder = "Search by name or phone…",
}: {
  name: string;
  onSelect?: (member: MemberOption | null) => void;
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
    onSelect?.(m);
  };

  const clear = () => {
    setSelectedId("");
    setQuery("");
    onSelect?.(null);
  };

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selectedId} />
      <input
        className="input pr-8"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (selectedId) {
            setSelectedId("");
            onSelect?.(null);
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {selectedId && (
        <button
          type="button"
          onClick={clear}
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

function LeaderTag({ name }: { name?: string }) {
  return name ? (
    <span className="text-xs text-zinc-500">{name}</span>
  ) : (
    <span className="badge bg-amber-950 text-amber-300 border border-amber-900/30">
      Vacant
    </span>
  );
}

export function ManageClient({
  visibleBacentas,
  visibleGovs,
  creatableCouncils,
  creatableGovs,
  canCreateCouncil,
  canCreateGov,
  isChiefAdmin,
}: ManageClientProps) {
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [govName, setGovName] = useState("");
  const [bacentaName, setBacentaName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const councilFormRef = useRef<HTMLFormElement>(null);
  const govFormRef = useRef<HTMLFormElement>(null);
  const bacentaFormRef = useRef<HTMLFormElement>(null);

  const handleGovMemberSelect = (member: MemberOption | null) => {
    if (member) setGovName(`${member.firstName} ${member.lastName}`);
  };

  const handleBacentaMemberSelect = (member: MemberOption | null) => {
    if (member) setBacentaName(`${member.firstName} ${member.lastName}`);
  };

  const handleDeleteBacenta = (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/bacentas/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      // Reload page to refresh data
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete bacenta:", error);
      setDeleting(false);
    }
  };

  const closeModal = (type: string) => {
    setOpenModal(null);
    setFormError(null);
    if (type === "council" && councilFormRef.current) councilFormRef.current.reset();
    if (type === "gov") {
      if (govFormRef.current) govFormRef.current.reset();
      setGovName("");
    }
    if (type === "bacenta") {
      if (bacentaFormRef.current) bacentaFormRef.current.reset();
      setBacentaName("");
    }
  };

  const handleSubmit = async (e: React.FormEvent, action: any, type: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    // Server actions throw on validation/permission errors — surface the
    // message instead of crashing the page.
    try {
      await action(formData);
      closeModal(type);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  };

  const errorBanner = formError ? (
    <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
      {formError}
    </p>
  ) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold">Manage hierarchy</h1>
        <Link href="/manage/leaders" className="btn-secondary w-full sm:w-auto text-center">
          Leaders & roles →
        </Link>
      </div>

      {/* Governorships Table — collapsed into a one-line summary by default */}
      {visibleGovs.length > 0 && (
        <Collapse title="Governorships" badge={visibleGovs.length}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3 font-semibold">Governorship</th>
                  <th className="px-4 py-3 font-semibold">Council</th>
                  <th className="px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {visibleGovs.map((g) => (
                  <tr key={g.id} className="hover:bg-zinc-800/30">
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="flex items-center gap-2">
                        {g.name} <StatusBadge value={g.area} />
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-400">
                      {g.councilName ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {isChiefAdmin && (
                        <Link href={`/manage/governorships/${g.id}`} className="text-indigo-400 hover:underline">
                          Edit →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Collapse>
      )}

      {/* Bacentas Table — collapsible summary, open by default */}
      <Collapse title="Bacentas" badge={visibleBacentas.length} defaultOpen>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3 font-semibold">Bacenta</th>
                <th className="px-4 py-3 font-semibold">Governorship</th>
                <th className="px-4 py-3 font-semibold">Council</th>
                <th className="px-4 py-3 font-semibold">Leader</th>
                <th className="px-4 py-3 font-semibold">Members</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {visibleBacentas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                    No bacentas yet.
                  </td>
                </tr>
              ) : (
                visibleBacentas.map((b) => (
                  <tr key={b.id} className="hover:bg-zinc-800/30">
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="flex items-center gap-2">
                        {b.name} <StatusBadge value={b.area} />
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-400">
                      {b.governorshipName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-400">{b.councilName}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <LeaderTag name={b.leaderName} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-400">{b.memberCount}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right space-x-2">
                      <Link href={`/manage/bacentas/${b.id}`} className="text-indigo-400 hover:underline">
                        Edit →
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeleteBacenta(b.id, b.name)}
                        className="text-red-400 hover:text-red-300 inline"
                        title="Delete bacenta"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Collapse>

      {/* Creation Buttons */}
      <div className="flex flex-wrap gap-2">
        {canCreateCouncil && (
          <button
            onClick={() => setOpenModal("council")}
            className="btn-secondary"
          >
            + New council
          </button>
        )}
        {canCreateGov && (
          <button
            onClick={() => setOpenModal("gov")}
            className="btn-secondary"
          >
            + New governorship
          </button>
        )}
        <button
          onClick={() => setOpenModal("bacenta")}
          className="btn-secondary"
        >
          + New bacenta
        </button>
      </div>

      {/* Modal: New Council */}
      {openModal === "council" && (
        <Modal
          title="Create new council"
          onClose={() => closeModal("council")}
        >
          <form
            ref={councilFormRef}
            onSubmit={(e) => handleSubmit(e, createCouncilAction, "council")}
            className="space-y-4"
          >
            {errorBanner}
            <div>
              <label className="label">Council name</label>
              <input
                name="name"
                placeholder="Enter council name"
                className="input"
                required
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => closeModal("council")}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn">
                Create council
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: New Governorship */}
      {openModal === "gov" && (
        <Modal
          title="Create new governorship"
          onClose={() => closeModal("gov")}
        >
          <form
            ref={govFormRef}
            onSubmit={(e) => handleSubmit(e, createGovernorshipAction, "gov")}
            className="space-y-4"
          >
            {errorBanner}
            <div>
              <label className="label">Council</label>
              <select name="councilId" className="input" required defaultValue="">
                <option value="" disabled>
                  Select a council
                </option>
                {creatableCouncils.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Governorship name</label>
              <input
                name="name"
                placeholder="Enter governorship name"
                className="input"
                value={govName}
                onChange={(e) => setGovName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Area</label>
              <select name="area" className="input" defaultValue="area1">
                <option value="area1">Area 1 (in person)</option>
                <option value="area2">Area 2 (bussed)</option>
              </select>
            </div>
            <div>
              <label className="label">Governor (member) — optional, assign later</label>
              <MemberSearchSelect name="memberId" onSelect={handleGovMemberSelect} />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => closeModal("gov")}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn">
                Create governorship
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: New Bacenta */}
      {openModal === "bacenta" && (
        <Modal
          title="Create new bacenta"
          onClose={() => closeModal("bacenta")}
        >
          <form
            ref={bacentaFormRef}
            onSubmit={(e) => handleSubmit(e, createBacentaAction, "bacenta")}
            className="space-y-4"
          >
            {errorBanner}
            <div>
              <label className="label">Governorship</label>
              <select name="governorshipId" className="input" required defaultValue="">
                <option value="" disabled>
                  Select a governorship
                </option>
                {creatableGovs.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Bacenta name</label>
              <input
                name="name"
                placeholder="Enter bacenta name"
                className="input"
                value={bacentaName}
                onChange={(e) => setBacentaName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Area</label>
              <select name="area" className="input" defaultValue="area1">
                <option value="area1">Area 1 (in person)</option>
                <option value="area2">Area 2 (bussed)</option>
              </select>
            </div>
            <div>
              <label className="label">Leader (member) — optional, assign later</label>
              <MemberSearchSelect name="memberId" onSelect={handleBacentaMemberSelect} />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => closeModal("bacenta")}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn">
                Create bacenta
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Delete bacenta"
          onClose={() => !deleting && setDeleteTarget(null)}
        >
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">
              Delete <span className="font-semibold">{deleteTarget.name}</span>?
            </p>
            <p className="text-xs text-zinc-500">
              This action cannot be undone. All members and records associated with this bacenta will be permanently deleted.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="btn-danger"
              >
                {deleting ? "Deleting…" : "Delete bacenta"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
