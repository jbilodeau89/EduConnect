"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type SupabaseClient = ReturnType<typeof createClientComponentClient>;

let client: SupabaseClient | null = null;
let warned = false;

const missingEnv =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const missingEnvMessage =
  "Supabase environment variables are not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";

type ThrowingFn = (...args: never[]) => never;

const createThrowingProxy = (): ThrowingFn & Record<string, ThrowingFn> => {
  const handler: ProxyHandler<ThrowingFn> = {
    get() {
      return createThrowingProxy();
    },
    apply() {
      throw new Error(missingEnvMessage);
    },
  };

  const thrower: ThrowingFn = () => {
    throw new Error(missingEnvMessage);
  };

  return new Proxy(thrower, handler) as ThrowingFn & Record<string, ThrowingFn>;
};

const createStubClient = (): SupabaseClient => {
  const objectHandler: ProxyHandler<Record<string, unknown>> = {
    get() {
      return createThrowingProxy();
    },
  };

  return new Proxy({}, objectHandler) as unknown as SupabaseClient;
};

/** Lazily create the browser Supabase client only when first used. */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  if (missingEnv) {
    if (!warned && process.env.NODE_ENV !== "production") {
      console.warn(missingEnvMessage);
      warned = true;
    }
    client = createStubClient();
    return client;
  }
  client = createClientComponentClient();
  return client;
}
