import { SidebarTrigger } from '@/components/ui/sidebar';

type PageHeaderProps = {
  title: string;
  children?: React.ReactNode;
};

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b bg-background/80 px-4 py-2 backdrop-blur-sm sm:flex-nowrap sm:gap-4 sm:px-6">
      <SidebarTrigger className="md:hidden" />
      <h1 className="flex-1 text-xl font-semibold min-w-[180px]">{title}</h1>
      {children}
    </header>
  );
}
