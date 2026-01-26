import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api, unwrap } from "../api";
import type { UserPublic } from "../../../../backend/src/features/auth/auth.types";
import type { ProfilePublic } from "../../../../backend/src/features/profile/types";

export const authQueries = {
  me: () =>
    queryOptions({
      queryKey: ["auth", "me"],
      queryFn: async () => {
        const res = await api.profile.$get();
        return unwrap<ProfilePublic>(res);
      },
      retry: false, // Ne pas retry si non connecté
    }),
};

export function useLogin() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await api.auth.login.$post({ json: data });
      return unwrap<{ user: UserPublic }>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}

export function useSignup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await api.auth.signup.$post({ json: data });
      return unwrap<{ user: UserPublic }>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await api.auth.logout.$post();
      return unwrap<null>(res);
    },
    onSuccess: () => {
      qc.clear(); // Clear tout le cache
    },
  });
}
