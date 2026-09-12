import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { requerirUsuario } from "@/features/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const user = await requerirUsuario();
      return { user };
    } catch {
      throw redirect({ to: "/auth" });
    }
  },
  component: () => <Outlet />,
});
