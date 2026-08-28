import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://undeusgyuliiwxjlqgsu.supabase.co";
const SUPABASE_ANON_KEY =
  "sb_publishable_HYgr6i7DmChimzeTz9mtRg_DHXUz2y4";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
