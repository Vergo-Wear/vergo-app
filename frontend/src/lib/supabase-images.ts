import { createSupabaseClient } from "@/lib/supabase";

export async function getSupabaseImageUrlById(id: number, fallbackImage = "") {
  const supabase = createSupabaseClient();

  if (!supabase || !Number.isFinite(id)) {
    return fallbackImage;
  }

  const { data, error } = await supabase
    .from("images")
    .select("image_url")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return fallbackImage;
  }

  const imageUrl = data?.image_url;

  return typeof imageUrl === "string" && imageUrl.trim().length > 0 ? imageUrl : fallbackImage;
}
