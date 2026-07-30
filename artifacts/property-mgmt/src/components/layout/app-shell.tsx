import { Sidebar } from './sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <Sidebar />
      <main className="ml-[280px] min-h-[100dvh]">
        {children}
      </main>
    </div>
  );
}
