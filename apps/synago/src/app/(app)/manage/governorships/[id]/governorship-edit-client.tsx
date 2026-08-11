"use client";

import { useEffect, useState } from "react";

import {
  updateGovernorshipAction,
  deleteGovernorshipAction,
  promoteLeaderAction,
  removeLeaderAction,
  searchMembersAction,
  searchBacentasAction,
  assignBacentaToGovernorshipAction,
} from "../../actions";

interface MemberOption {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
}

interface BacentaSearchResult {
  id: string;
  name: string;
  area: string;
  governorshipName: string | null;
}

/** Typeahead search over members — queries the server live so nobody is
 * hidden by a stale, capped preload list. */
function MemberSearchSelect({
  onSelect,
  placeholder = "Search by name or phone…",
}: {
  onSelect: (member: MemberOption | null) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<MemberOption[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const rows = await searchMembersAction(q);
        if (!cancelled) setResults(rows);
      } catch {
        if (!cancelled) setResults([]);
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
    onSelect(m);
  };

  const clear = () => {
    setSelectedId("");
    setQuery("");
    onSelect(null);
  };

  return (
    <div className="relative">
      <input
        className="input pr-8"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (selectedId) {
            setSelectedId("");
            onSelect(null);
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
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-zinc-800 bg-zinc-900 text-sm shadow-xl">
          {results.map((m) => (
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

/** Typeahead search over bacentas — used to find and move a misrouted
 * bacenta into this governorship. */
function BacentaSearchSelect({
  onSelect,
}: {
  onSelect: (bacenta: BacentaSearchResult | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<BacentaSearchResult[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const rows = await searchBacentasAction(q);
        if (!cancelled) setResults(rows);
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const select = (b: BacentaSearchResult) => {
    setSelectedId(b.id);
    setQuery(`${b.name} (${b.area === "area1" ? "A1" : "A2"})`);
    setOpen(false);
    onSelect(b);
  };

  const clear = () => {
    setSelectedId("");
    setQuery("");
    onSelect(null);
  };

  return (
    <div className="relative">
      <input
        className="input pr-8"
        placeholder="Search bacenta by name…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (selectedId) {
            setSelectedId("");
            onSelect(null);
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {selectedId && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear selected bacenta"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
        >
          ✕
        </button>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-zinc-800 bg-zinc-900 text-sm shadow-xl">
          {results.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(b)}
                className="block w-full px-3 py-2 text-left hover:bg-zinc-800"
              >
                {b.name}{" "}
                <span className="text-zinc-500">
                  ({b.area === "area1" ? "A1" : "A2"}
                  {b.governorshipName ? ` — currently in ${b.governorshipName}` : ""})
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface GovernorshipEditClientProps {
  governorship: {
    id: string;
    name: string;
    area: string;
    councilId: string | null;
    parentGovernorshipId: string | null;
  };
  councils: { id: string; name: string }[];
  parentOptions: { id: string; name: string }[];
  bacentas: { id: string; name: string; area: string }[];
  currentGovernor: {
    leaderId: string;
    firstName: string;
    lastName: string;
    username: string;
  } | null;
}

export function GovernorshipEditClient({
  governorship,
  councils,
  parentOptions,
  bacentas,
  currentGovernor,
}: GovernorshipEditClientProps) {
  const [error, setError] = useState<string | null>(null);
  const [savingDetails, setSavingDetails] = useState(false);
  const [selectedGovernorMember, setSelectedGovernorMember] = useState<MemberOption | null>(null);
  const [assigningGovernor, setAssigningGovernor] = useState(false);
  const [removingGovernor, setRemovingGovernor] = useState(false);
  const [selectedBacenta, setSelectedBacenta] = useState<BacentaSearchResult | null>(null);
  const [movingBacenta, setMovingBacenta] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDetailsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSavingDetails(true);
    try {
      await updateGovernorshipAction(new FormData(e.currentTarget));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSavingDetails(false);
    }
  };

  const handleAssignGovernor = async () => {
    if (!selectedGovernorMember) return;
    setError(null);
    setAssigningGovernor(true);
    try {
      const fd = new FormData();
      fd.set("memberId", selectedGovernorMember.id);
      fd.set("role", "governor");
      fd.set("governorshipId", governorship.id);
      await promoteLeaderAction(fd);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign governor.");
      setAssigningGovernor(false);
    }
  };

  const handleRemoveGovernor = async () => {
    if (!currentGovernor) return;
    setError(null);
    setRemovingGovernor(true);
    try {
      const fd = new FormData();
      fd.set("leaderId", currentGovernor.leaderId);
      await removeLeaderAction(fd);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove governor.");
      setRemovingGovernor(false);
    }
  };

  const handleMoveBacenta = async () => {
    if (!selectedBacenta) return;
    setError(null);
    setMovingBacenta(true);
    try {
      const fd = new FormData();
      fd.set("bacentaId", selectedBacenta.id);
      fd.set("governorshipId", governorship.id);
      await assignBacentaToGovernorshipAction(fd);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not move bacenta.");
      setMovingBacenta(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${governorship.name}"? This cannot be undone.`)) return;
    setError(null);
    setDeleting(true);
    try {
      const fd = new FormData();
      fd.set("governorshipId", governorship.id);
      await deleteGovernorshipAction(fd);
      window.location.href = "/manage";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete governorship.");
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-bold">Edit governorship</h1>

      {error && (
        <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <form onSubmit={handleDetailsSubmit} className="card space-y-4">
        <input type="hidden" name="governorshipId" value={governorship.id} />
        <div>
          <label className="label">Name</label>
          <input name="name" className="input" defaultValue={governorship.name} required />
        </div>
        <div>
          <label className="label">Council</label>
          <select name="councilId" className="input" defaultValue={governorship.councilId ?? ""}>
            <option value="">— Unassigned (route later)</option>
            {councils.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Area</label>
          <select name="area" className="input" defaultValue={governorship.area}>
            <option value="area1">Area 1 (in person)</option>
            <option value="area2">Area 2 (bussed)</option>
          </select>
        </div>
        <div>
          <label className="label">Senior governorship (oversees this one)</label>
          <select
            name="parentGovernorshipId"
            className="input"
            defaultValue={governorship.parentGovernorshipId ?? ""}
          >
            <option value="">— None (top-level)</option>
            {parentOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500">
            The senior governor automatically sees everything under this
            governorship too. Roles and names stay unchanged.
          </p>
        </div>
        <button className="btn w-full" disabled={savingDetails}>
          {savingDetails ? "Saving…" : "Save"}
        </button>
      </form>

      <div className="card space-y-3">
        <h2 className="text-sm font-semibold text-zinc-300">Governor</h2>
        {currentGovernor ? (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm text-zinc-200">
                {currentGovernor.firstName} {currentGovernor.lastName}
              </p>
              <p className="text-xs text-zinc-500">@{currentGovernor.username}</p>
            </div>
            <button
              type="button"
              onClick={handleRemoveGovernor}
              disabled={removingGovernor}
              className="btn-danger shrink-0"
            >
              {removingGovernor ? "Removing…" : "Remove"}
            </button>
          </div>
        ) : (
          <p className="badge bg-amber-950 text-amber-300 border border-amber-900/30">Vacant</p>
        )}
        <div className="space-y-2 border-t border-zinc-800 pt-3">
          <label className="label">{currentGovernor ? "Replace with" : "Assign governor"}</label>
          <MemberSearchSelect onSelect={setSelectedGovernorMember} />
          <button
            type="button"
            onClick={handleAssignGovernor}
            disabled={!selectedGovernorMember || assigningGovernor}
            className="btn w-full"
          >
            {assigningGovernor ? "Assigning…" : "Assign as governor"}
          </button>
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="text-sm font-semibold text-zinc-300">
          Bacentas in this governorship ({bacentas.length})
        </h2>
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {bacentas.length === 0 ? (
            <p className="text-sm text-zinc-500">No bacentas yet.</p>
          ) : (
            bacentas.map((b) => (
              <div key={b.id} className="flex items-center justify-between py-1 text-sm text-zinc-300">
                <span>{b.name}</span>
                <span className="badge bg-zinc-800 text-zinc-400 border border-zinc-700">
                  {b.area === "area1" ? "A1" : "A2"}
                </span>
              </div>
            ))
          )}
        </div>
        <div className="space-y-2 border-t border-zinc-800 pt-3">
          <label className="label">Move a bacenta here (fix a wrong governorship)</label>
          <BacentaSearchSelect onSelect={setSelectedBacenta} />
          <button
            type="button"
            onClick={handleMoveBacenta}
            disabled={!selectedBacenta || movingBacenta}
            className="btn w-full"
          >
            {movingBacenta ? "Moving…" : "Move bacenta here"}
          </button>
        </div>
      </div>

      <div className="card space-y-3 border border-red-900/30">
        <h2 className="text-sm font-semibold text-red-300">Danger zone</h2>
        <p className="text-xs text-zinc-500">
          Deleting only works once this governorship has no bacentas and no governor.
        </p>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting || bacentas.length > 0 || !!currentGovernor}
          className="btn-danger w-full"
        >
          {deleting ? "Deleting…" : "Delete governorship"}
        </button>
      </div>
    </div>
  );
}
