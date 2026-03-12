import type { Method } from "@inertiajs/core";
import { http } from "@inertiajs/core";

export async function requestJson<TResponse>(
  method: Method,
  url: string,
  data?: unknown,
): Promise<TResponse> {
  const hasBody = method !== "get" && typeof data !== "undefined";
  const response = await http.getClient().request({
    method,
    url,
    data: hasBody ? JSON.stringify(data) : undefined,
    headers: {
      Accept: "application/json",
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
  });
  const payload = response.data.trim();

  return (payload ? JSON.parse(payload) : undefined) as TResponse;
}
