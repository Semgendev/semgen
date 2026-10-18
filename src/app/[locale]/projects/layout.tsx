import { AppHeader } from "@/components/app-header";

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      {children}
    </>
  );
}
