// lib/api/fetcher.ts
export async function fetcher<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`/api${path}`, options); // <-- prepends /api
  if (!res.ok) throw new Error(`Network error: ${res.status}`);
  return res.json();
}
