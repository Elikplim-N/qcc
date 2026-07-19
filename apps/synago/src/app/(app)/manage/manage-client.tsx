"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@qcc/ui/components/status-badge";
import { Modal } from "@qcc/ui/components/modal";
import {
  createBacentaAction,
  createCouncilAction,
  createGovernorshipAction,
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
  phoneNumber: string;
}

interface ManageClientProps {
  visibleBacentas: BacentaRow[];
  creatableCouncils: any[];
  creatableGovs: any[];
  canCreateCouncil: boolean;
  canCreateGov: boolean;
  scopedMembers: MemberOption[];
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
  creatableCouncils,
  creatableGovs,
  canCreateCouncil,
  canCreateGov,
  scopedMembers,
}: ManageClientProps) {
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [govName, setGovName] = useState("");
  const [bacentaName, setBacentaName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const councilFormRef = useRef<HTMLFormElement>(null);
  const govFormRef = useRef<HTMLFormElement>(null);
  const bacentaFormRef = useRef<HTMLFormElement>(null);

  const handleGovMemberSelect = (memberId: string) => {
    if (memberId) {
      const member = scopedMembers.find((m) => m.id === memberId);
      if (member) {
        setGovName(`${member.firstName} ${member.lastName}`);
      }
    }
  };

  const handleBacentaMemberSelect = (memberId: string) => {
    if (memberId) {
      const member = scopedMembers.find((m) => m.id === memberId);
      if (member) {
        setBacentaName(`${member.firstName} ${member.lastName}`);
      }
    }
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
    await action(formData);
    closeModal(type);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold">Manage hierarchy</h1>
        <Link href="/manage/leaders" className="btn-secondary w-full sm:w-auto">
          Leaders & roles →
        </Link>
      </div>

      <div className="card overflow-x-auto p-0">
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
              <label className="label">Governor (member)</label>
              <select
                name="memberId"
                className="input"
                defaultValue=""
                onChange={(e) => handleGovMemberSelect(e.target.value)}
              >
                <option value="">— (optional, assign later)</option>
                {scopedMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName} — {m.phoneNumber}
                  </option>
                ))}
              </select>
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
              <label className="label">Leader (member)</label>
              <select
                name="memberId"
                className="input"
                defaultValue=""
                onChange={(e) => handleBacentaMemberSelect(e.target.value)}
              >
                <option value="">— (optional, assign later)</option>
                {scopedMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName} — {m.phoneNumber}
                  </option>
                ))}
              </select>
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
