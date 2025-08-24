// src/lib/forge.ts
import { api } from "./api";

export type Problem = {
  id: number;
  title: string;
  description: string;
  domain?: string | null;
  scope?: string | null;
  severity?: number | null;
  status: string;
  created_by_email?: string | null;
  created_at: string;
  votes_count: number;
  followers_count: number;
  notes_count: number;
};

export type ProblemNote = {
  id: number;
  title?: string | null;
  body: string;
  is_public: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
  author_user_id?: number | null;
};

export type Solution = {
  id: number;
  problem_id: number;
  title: string;
  description: string;
  status: string;
  anonymous: boolean;
  created_by_email?: string | null;
  created_at: string;
  votes_count: number;
  followers_count: number;
  notes_count: number;
  featured_in_forge: boolean;
  impact_score: number;
};

export type ProblemDetail = Problem & {
  notes: ProblemNote[];
  top_solutions?: Solution[] | null;
};

export async function getProblem(problemId: number, include_top_solutions = true) {
  const { data } = await api.get<ProblemDetail>(`/forge/problems/${problemId}`, {
    params: { include_top_solutions },
  });
  return data;
}

export async function createProblemNote(
  problemId: number,
  payload: { title?: string; body: string; is_public?: boolean; order_index?: number }
) {
  const { data } = await api.post<ProblemNote>(`/forge/problems/${problemId}/notes`, payload);
  return data;
}

export async function updateProblemNote(
  noteId: number,
  payload: Partial<{ title: string; body: string; is_public: boolean; order_index: number }>
) {
  const { data } = await api.patch<ProblemNote>(`/forge/problem-notes/${noteId}`, payload);
  return data;
}

export async function deleteProblemNote(noteId: number) {
  await api.delete(`/forge/problem-notes/${noteId}`);
}

export async function createSolution(
  problemId: number,
  payload: { title: string; description: string; anonymous?: boolean; created_by_email?: string }
) {
  const { data } = await api.post<Solution>(`/forge/problems/${problemId}/solutions`, payload);
  return data;
}

export async function listFeaturedSolutions(params?: {
  limit?: number;
  offset?: number;
  sort?: "impact" | "top" | "new";
}) {
  const { data } = await api.get<Solution[]>("/forge/solutions/featured", { params });
  return data;
}

/* NEW: list all solutions for a problem (if you want a full list) */
export async function listProblemSolutions(problemId: number) {
  // the backend exposes top solutions in getProblem(); if you want all, you can call again with a big top_n later.
  // Leaving a stub for future expansion or custom route if you add it.
  return getProblem(problemId, true);
}

/* NEW: add a note to a solution */
export async function createSolutionNote(
  solutionId: number,
  payload: { title?: string; body: string; is_public?: boolean; order_index?: number }
) {
  const { data } = await api.post(`/forge/solutions/${solutionId}/notes`, payload);
  return data;
}