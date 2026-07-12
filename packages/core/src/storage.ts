// Photo upload storage. Backed by Supabase Storage for now — the app talks
// only to this module, so swapping to Cloudflare R2 (or anything else)
// later means rewriting this file, not every call site.
import { createClient } from "@supabase/supabase-js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "qcc-photos";

let client: ReturnType<typeof createClient> | undefined;

function getClient() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to upload photos.",
    );
  }
  client = createClient(url, key);
  return client;
}

// Uploads a file under a folder prefix (e.g. "fellowship", "premob") and
// returns its public URL. Throws on failure — callers decide how to handle it.
export async function uploadPhoto(file: File, folder: string): Promise<string> {
  const supabase = getClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
