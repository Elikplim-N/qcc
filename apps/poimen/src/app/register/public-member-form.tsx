import { PhotoInput } from "@qcc/ui/components/photo-input";

type ScopedBacenta = {
  id: string;
  name: string;
  area: "area1" | "area2";
  governorshipName: string;
};

type MemberValues = {
  id?: string;
  firstName?: string;
  lastName?: string;
  otherName?: string | null;
  gender?: string | null;
  phoneNumber?: string;
  altPhoneNumber?: string | null;
  email?: string | null;
  location?: string | null;
  dateOfBirth?: string | null;
  isWorking?: boolean;
  school?: string | null;
  status?: string;
  photoUrl?: string | null;
  bacentaId?: string | null;
  notes?: string | null;
};

export function PublicMemberForm({
  action,
  bacentas,
  values = {},
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  bacentas: ScopedBacenta[];
  values?: MemberValues;
  submitLabel: string;
}) {
  return (
    <form action={action} className="card max-w-2xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">First name *</label>
          <input name="firstName" className="input" defaultValue={values.firstName} required />
        </div>
        <div>
          <label className="label">Last name *</label>
          <input name="lastName" className="input" defaultValue={values.lastName} required />
        </div>
        <div>
          <label className="label">Other name</label>
          <input name="otherName" className="input" defaultValue={values.otherName ?? ""} />
        </div>
        <div>
          <label className="label">Gender</label>
          <select name="gender" className="input" defaultValue={values.gender ?? ""}>
            <option value="">—</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div>
          <label className="label">Phone number *</label>
          <input name="phoneNumber" className="input" defaultValue={values.phoneNumber} required />
        </div>
        <div>
          <label className="label">Alt phone</label>
          <input name="altPhoneNumber" className="input" defaultValue={values.altPhoneNumber ?? ""} />
        </div>
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" className="input" defaultValue={values.email ?? ""} />
        </div>
        <div>
          <label className="label">Location</label>
          <input name="location" className="input" defaultValue={values.location ?? ""} />
        </div>
        <div>
          <label className="label">Date of birth</label>
          <input name="dateOfBirth" type="date" className="input" defaultValue={values.dateOfBirth ?? ""} />
        </div>
        <div>
          <label className="label">Bacenta</label>
          <select name="bacentaId" className="input" defaultValue={values.bacentaId ?? ""}>
            <option value="">
              — None / I'll be assigned later —
            </option>
            {bacentas.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.area === "area1" ? "Area 1" : "Area 2"})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">School (if student)</label>
          <input name="school" className="input" defaultValue={values.school ?? ""} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input type="checkbox" name="isWorking" defaultChecked={values.isWorking} className="h-4 w-4" />
        Working (not a student)
      </label>
      <PhotoInput name="photoUrl" initial={values.photoUrl} />
      <div>
        <label className="label">Notes</label>
        <textarea name="notes" className="input" rows={2} defaultValue={values.notes ?? ""} />
      </div>
      <button className="btn">{submitLabel}</button>
    </form>
  );
}
