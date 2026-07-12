"use client";

export function DeleteMemberForm({
  action,
  memberId,
}: {
  action: (formData: FormData) => void;
  memberId: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Are you absolutely sure you want to permanently delete this member?")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="memberId" value={memberId} />
      <button className="btn-danger w-full sm:w-auto font-bold py-2.5 px-6">
        Delete Member
      </button>
    </form>
  );
}
