import { api } from "@/lib/api";

export async function requireSeed(userEmail: string | null | undefined, amount: number, reason: string) {
  if (!userEmail) throw new Error("Login required");
  await api.post(`/seed/spend`, { amount, reason }, { headers: { "x-user-email": userEmail } });
}