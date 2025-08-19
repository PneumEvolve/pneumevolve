import { api } from "@/lib/api";
const API = import.meta.env.VITE_API_URL;

export async function requireSeed(userEmail: string | null | undefined, amount: number, reason: string) {
  if (!userEmail) throw new Error("Login required");
  await axios.post(`${API}/seed/spend`, { amount, reason }, { headers: { "x-user-email": userEmail } });
}