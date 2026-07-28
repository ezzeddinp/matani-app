import { supabase } from "@/hooks/supabase";

export const authenticatedBackendFetch = async (
  input: string,
  init: RequestInit = {}
): Promise<Response> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("AUTH_SESSION_REQUIRED");

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(input, { ...init, headers });
};
