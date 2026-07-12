"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@qcc/ui/components/status-badge";
import {
  createBacentaAction,
  createCouncilAction,
  createGovernorshipAction,
} from "./actions";

interface ManageClientProps {
  visibleCouncils: any[];
  allGovs: any[];
  allBacentas: any[];
  countByBacenta: Map<string, number>;
  creatableCouncils: any[];
  creatableGovs: any[];
  canCreateCouncil: boolean;
  canCreateGov: boolean;
}

export function ManageClient({
  visibleCouncils,
  allGovs,
  allBacentas,
  countByBacenta,
  creatableCouncils,
  creatableGovs,
  canCreateCouncil,
  canCreateGov,
}: ManageClientProps) {
  const [openModal, setOpenModal] = useState<string | null>(null);
  const councilFormRef = useRef<HTMLFormElement>(null);
  const govFormRef = useRef<HTMLFormElement>(null);
  const bacentaFormRef = useRef<HTMLFormElement>(null);

  const closeModal = (type: string) => {
    setOpenModal(null);
    if (type === "council" && councilFormRef.current) councilFormRef.current.reset();
    if (type === "gov" && govFormRef.current) govFormRef.current.reset();
    if (type === "bacenta" && bacentaFormRef.current) bacentaFormRef.current.reset();
  };

  const handleSubmit = async (e: React.FormEvent, action: any, type: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    await action(formData);
    closeModal(type);
  };

  const visibleGovs = (councilId: string) =>
    allGovs.filter((g) => g.councilId === councilId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Manage hierarchy</h1>
        <div className="flex items-center gap-2">
          <Link href="/manage/leaders" className="btn-secondary">
            Leaders & roles →
          </Link>
        </div>
      </div>

      {/* Hierarchy Tree */}
      <div className="space-y-4">
        {visibleCouncils.length === 0 ? (
          <p className="card text-sm text-zinc-500">No councils yet.</p>
        ) : (
          visibleCouncils.map((c) => (
            <div key={c.id} className="card space-y-3">
              <h2 className="font-bold">{c.name}</h2>
              <div className="space-y-2">
                {visibleGovs(c.id).map((g) => (
                  <div key={g.id} className="ml-4 rounded-lg border border-zinc-700 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-sm font-semibold">{g.name}</span>
                      <StatusBadge value={g.area} />
                    </div>
                    <div className="space-y-1">
                      {allBacentas
                        .filter((b) => b.governorshipId === g.id)
                        .map((b) => (
                          <Link
                            key={b.id}
                            href={`/manage/bacentas/${b.id}`}
                            className="flex items-center justify-between rounded border border-zinc-700/50 px-3 py-2 text-sm transition hover:border-zinc-600 hover:bg-zinc-800/30"
                          >
                            <span className="flex items-center gap-2">
                              {b.name} <StatusBadge value={b.area} />
                            </span>
                            <span className="text-xs text-zinc-500">
                              {countByBacenta.get(b.id) ?? 0} members
                            </span>
                          </Link>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
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
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="card w-full max-w-md space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{title}</h2>
            <button
              onClick={onClose}
              className="text-zinc-400 transition hover:text-zinc-200"
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
