import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold">Mes habitudes</h1>
    </main>
  );
}
