import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/alta")({
  beforeLoad: () => {
    throw redirect({ to: "/auth", search: { tab: "registro" }, replace: true });
  },
  component: () => null,
});
