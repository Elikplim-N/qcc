"use client";

import { useFormStatus } from "react-dom";

/**
 * Submit button for server-action forms with built-in feedback: while the
 * action runs it disables itself (blocking double-submits/duplicates) and
 * shows a spinner + "…ing" label so users see something is happening.
 */
export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  className = "btn w-full",
  name,
  value,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  // Optional submitter name/value so one form can carry multiple decisions
  // (e.g. approve/reject) while still getting double-submit protection.
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      aria-busy={pending}
      name={name}
      value={value}
    >
      {pending ? (
        <>
          <span className="spinner h-4 w-4 border-2" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
