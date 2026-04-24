import { Trophy, Target, BarChart3, Shield, LogOut } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import logo from "@/assets/logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "@/lib/user-avatar";
import { displayName } from "@/lib/display-name";

const baseItems = [
  { title: "Inicio", url: "/", icon: Trophy },
  { title: "Mi Predicción", url: "/prediccion", icon: Target },
  { title: "Ranking", url: "/ranking", icon: BarChart3 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut, user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<{ first_name: string | null; last_name: string | null; email: string | null; avatar_seed: string | null } | null>(null);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setProfile(null);
      return;
    }
    supabase
      .from("profiles")
      .select("is_admin, first_name, last_name, email, avatar_seed")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setIsAdmin(!!(data as any)?.is_admin);
        setProfile((data as any) ?? null);
      });
  }, [user]);

  const items = isAdmin
    ? [...baseItems, { title: "Admin", url: "/admin", icon: Shield }]
    : baseItems;

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background overflow-hidden">
            <img src={logo} alt="Prode Mundial 2026" className="h-9 w-9 object-contain" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground leading-tight">Prode</p>
              <p className="text-xs text-sidebar-foreground/70 leading-tight">Mundial 2026</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <NavLink to={item.url} end={item.url === "/"}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        {user && (
          <div className="flex items-center gap-2 px-2 pb-2">
            <UserAvatar
              seed={profile?.avatar_seed ?? null}
              name={displayName(profile ?? { email: user.email ?? null })}
              className="h-7 w-7 shrink-0"
            />
            {!collapsed && (
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {displayName(profile ?? { email: user.email ?? null })}
              </p>
            )}
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Cerrar sesión">
              <LogOut className="h-4 w-4" />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
