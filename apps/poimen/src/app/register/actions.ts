"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db, members } from "@qcc/db";
import { generateMemberCode } from "@qcc/core/member-code";

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? null : v;
}

export async function publicRegisterMemberAction(formData: FormData) {
  const firstName = str(formData, "firstName");
  const lastName = str(formData, "lastName");
  const phoneNumber = str(formData, "phoneNumber");

  if (!firstName || !lastName || !phoneNumber) {
    throw new Error("First name, last name and phone number are required.");
  }

  const [row] = await db
    .insert(members)
    .values({
      memberCode: generateMemberCode(firstName, lastName, phoneNumber),
      firstName,
      lastName,
      otherName: str(formData, "otherName"),
      gender: (str(formData, "gender") as "male" | "female" | null) ?? null,
      phoneNumber,
      altPhoneNumber: str(formData, "altPhoneNumber"),
      email: str(formData, "email"),
      location: str(formData, "location"),
      dateOfBirth: str(formData, "dateOfBirth"),
      isWorking: formData.get("isWorking") === "on",
      school: str(formData, "school"),
      status: "committed",
      photoUrl: str(formData, "photoUrl"),
      bacentaId: str(formData, "bacentaId"),
      notes: str(formData, "notes"),
      createdByLeaderId: null,
    })
    .returning({ id: members.id });

  revalidatePath("/");
  redirect(`/register/success/${row.id}`);
}
