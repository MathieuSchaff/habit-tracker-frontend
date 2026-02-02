import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "../api";

// ============================================
// QUERIES
// ============================================

export const authQueries = {
  // Récupérer le profil complet
  me: () =>
    queryOptions({
      queryKey: ["auth", "me"],
      queryFn: async () => {
        const res = await api.profile.$get();
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        return json.data;
      },
      retry: false,
    }),

  // Vérifier si l'utilisateur est authentifié
  session: () =>
    queryOptions({
      queryKey: ["session"],
      queryFn: async () => {
        const res = await api.auth.session.$get();
        if (!res.ok) throw new Error("Not authenticated");
        return res.json();
      },
      retry: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }),
};

// ============================================
// MUTATIONS
// ============================================

export function useLogin() {

  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await api.auth.login.$post({ json: data });
      return res.json();
    },
  });
}

export function useSignup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await api.auth.signup.$post({ json: data });
      return res.json();
    },
    onSuccess: (res) => {
      if (res.success) {
        qc.invalidateQueries({ queryKey: ["session"] });
        qc.invalidateQueries({ queryKey: ["auth"] });
      }
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.auth.logout.$post();
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["session"] });
      qc.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}
