export function isAuthorizedInternalRequest(headers: Headers): boolean {
  const expected = process.env.SYNC_API_SECRET ?? process.env.CRON_SECRET;
  if (!expected) {
    return false;
  }
  const auth = headers.get("authorization");
  if (!auth) {
    return false;
  }
  return auth === `Bearer ${expected}`;
}
