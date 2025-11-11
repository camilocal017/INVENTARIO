"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Icons } from '@/components/icons';
import { Separator } from '@/components/ui/separator';
import { LayoutDashboard, FileText, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { href: '/', icon: LayoutDashboard, label: 'Inventario' },
  { href: '/reports', icon: FileText, label: 'Reportes' },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
          <Icons.Logo className="size-8" />
          <span className="text-lg font-semibold text-sidebar-foreground">
            Inventario cami
          </span>
        </div>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
      <SidebarMenu>
        {menuItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href}
              tooltip={item.label}
            >
              <Link href={item.href}>
                <item.icon />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
