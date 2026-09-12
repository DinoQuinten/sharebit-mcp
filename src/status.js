/** Verify an agent credential using ShareBit's canonical identity endpoint. */
export async function verifyCredential(credentials, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(`${credentials.origin}/api/v1/me`, {
      headers: { authorization: `Bearer ${credentials.token}` },
    });
    if (response.ok) return { status: "connected" };
    if (response.status === 401) return { status: "rejected" };
    return { status: "unexpected", code: response.status };
  } catch (error) {
    return { status: "unreachable", error: error instanceof Error ? error.message : String(error) };
  }
}
