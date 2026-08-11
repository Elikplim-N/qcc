"use client";

import { useEffect, useState } from "react";
import { findDuplicatesAction, mergeDuplicatesAction } from "./actions";

interface Person {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  isLeader: boolean;
  isMember: boolean;
  isVisitor: boolean;
  createdAt: Date;
}

interface DuplicateGroup {
  canonicalId: string;
  people: Person[];
}

export default function DuplicatesPage() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const result = await findDuplicatesAction();
        setGroups(result);
      } catch (err: any) {
        setError(err.message || "Failed to load duplicates");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleMerge = async (group: DuplicateGroup) => {
    const canonicalName = group.people.find(p => p.id === group.canonicalId)?.fullName || "canonical member";
    if (!confirm(`Merge ${group.people.length} people into "${canonicalName}"?`)) return;

    setMerging(group.canonicalId);
    setActionError(null);
    setSuccess(null);
    try {
      const duplicateIds = group.people.filter(p => p.id !== group.canonicalId).map(p => p.id);
      await mergeDuplicatesAction(group.canonicalId, duplicateIds);
      setGroups(prev => prev.filter(g => g.canonicalId !== group.canonicalId));
      setSuccess(`Successfully merged duplicates into "${canonicalName}"!`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setActionError(err.message || "Failed to merge duplicates.");
    } finally {
      setMerging(null);
    }
  };

  if (loading) {
    return <div className="card text-sm text-zinc-400">Loading duplicates…</div>;
  }

  if (error) {
    return <div className="card border-red-900 text-sm text-red-400">{error}</div>;
  }

  if (groups.length === 0) {
    return (
      <div className="max-w-2xl space-y-4">
        {success && (
          <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3 text-sm text-emerald-400 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold">✓</span>
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess(null)} className="text-emerald-500 hover:text-emerald-300 font-bold">✕</button>
          </div>
        )}
        <h1 className="text-2xl font-bold mb-4">Duplicates</h1>
        <div className="empty-state card">
          <p className="font-medium text-zinc-400">No duplicates found</p>
          <p className="mt-1">Your member database looks clean!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Duplicates</h1>
        <p className="mt-1 text-sm text-zinc-400">{groups.length} group(s) detected</p>
      </div>

      {success && (
        <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3.5 text-sm text-emerald-400 flex items-center justify-between gap-3 transition duration-300">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold">✓</span>
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-500 hover:text-emerald-300 font-bold">✕</button>
        </div>
      )}

      {actionError && (
        <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-3.5 text-sm text-red-400 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-500 hover:text-red-300 font-bold">✕</button>
        </div>
      )}

      {groups.map((group) => {
        const canonical = group.people.find(p => p.id === group.canonicalId)!;
        const others = group.people.filter(p => p.id !== group.canonicalId);

        return (
          <div key={group.canonicalId} className="card space-y-3 border border-amber-900/30 bg-amber-950/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-300">Merge {group.people.length} people</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Keep "{canonical.fullName}" and merge:
                </p>
              </div>
              <button
                onClick={() => handleMerge(group)}
                disabled={merging === group.canonicalId}
                className="btn text-xs px-3 py-1.5 whitespace-nowrap"
              >
                {merging === group.canonicalId ? "Merging…" : "Merge"}
              </button>
            </div>

            <div className="space-y-2">
              {/* Canonical (to keep) */}
              <div className="rounded-lg border border-emerald-900/30 bg-emerald-950/10 p-3 text-sm">
                <div className="flex items-center gap-2 text-emerald-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  <span className="font-semibold">Keep (canonical)</span>
                </div>
                <div className="mt-2 space-y-1">
                  <p className="font-medium">{canonical.fullName}</p>
                  {canonical.email && <p className="text-xs text-zinc-400">{canonical.email}</p>}
                  <p className="text-xs text-zinc-400">{canonical.phone}</p>
                  <p className="text-xs text-zinc-500">
                    {[
                      canonical.isLeader ? "Leader" : null,
                      canonical.isMember ? "Member" : null,
                      canonical.isVisitor ? "Visitor" : null,
                    ].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>

              {/* Duplicates (to delete) */}
              {others.map((person) => (
                <div key={person.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-sm">
                  <p className="font-medium">{person.fullName}</p>
                  {person.email && <p className="text-xs text-zinc-400">{person.email}</p>}
                  <p className="text-xs text-zinc-400">{person.phone}</p>
                  <p className="text-xs text-zinc-500">
                    {[
                      person.isLeader ? "Leader" : null,
                      person.isMember ? "Member" : null,
                      person.isVisitor ? "Visitor" : null,
                    ].filter(Boolean).join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
