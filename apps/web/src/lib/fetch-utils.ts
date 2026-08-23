// Helper to unwrap Eden Treaty responses uniformly

export async function unwrapEden<T>(promise: Promise<{ data: T | null; error: any | null }>): Promise<T> {
  const { data, error } = await promise;
  if (error) {
    const errorValue = error.value as { message?: string } | undefined;
    throw new Error(errorValue?.message || "API request failed");
  }
  return data as T;
}
