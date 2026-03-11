"use client";

import { createContext, useContext, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calculator,
  BookOpen,
  Wheat,
  PanelLeftClose,
  PanelLeftOpen,
  CircleUserRound,
} from "lucide-react";

import { NAVBAR_ICON_SIZE, DEFAULT_COLLAPSED_NAVBAR } from "@/lib/ui/constants";
import { ThemeSelect, Theme, getInitialTheme } from "@/lib/ui/theme-select";

const navItems = [
  { href: "/", label: "Calculator", icon: Calculator },
  { href: "/recipes", label: "Recipes", icon: BookOpen },
  { href: "/ingredients", label: "Ingredients", icon: Wheat },
];

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

const NavbarContext = createContext<{
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  mounted: boolean;
  theme: Theme;
  setTheme: React.Dispatch<React.SetStateAction<Theme>>;
}>({
  collapsed: false,
  setCollapsed: () => {},
  mounted: false,
  theme: Theme.Light,
  setTheme: () => {},
});

export function useNavbarContext() {
  return useContext(NavbarContext);
}

function getInitialCollapsedState(): boolean {
  if (typeof window === "undefined") return DEFAULT_COLLAPSED_NAVBAR;
  const stored = localStorage.getItem("sidebar-collapsed");
  return stored !== null ? stored === "true" : DEFAULT_COLLAPSED_NAVBAR;
}

export function Navbar({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => getInitialCollapsedState());
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  return (
    <NavbarContext value={{ collapsed, setCollapsed, mounted, theme, setTheme }}>
      <div className="flex h-screen flex-col">
        <Header />
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <div className="flex-1 overflow-auto">{children}</div>
        </div>
      </div>
    </NavbarContext>
  );
}

/** Logo, collapse/expand button, `ThemeSelect` button, and account button to the right */
export function Header() {
  const { collapsed, setCollapsed, mounted, theme, setTheme } = useContext(NavbarContext);
  const pathname = usePathname();
  const [hoveringLogo, setHoveringLogo] = useState(true);

  const pageTitle =
    pathname === "/"
      ? "Calculator"
      : pathname.startsWith("/recipes")
        ? "Recipes"
        : pathname.startsWith("/ingredients")
          ? "Ingredients"
          : "Sci-Cream";

  const iconSize = NAVBAR_ICON_SIZE;
  const logoSize = iconSize + 2;

  if (!mounted) return <header className="navbar h-12 shrink-0" />;

  return (
    <header className="navbar flex h-12 shrink-0 items-center justify-between">
      <div className="flex items-center">
        {collapsed ? (
          <button
            title="Expand sidebar"
            id="expand-sidebar-button"
            className={`m-4 p-2 ${hoveringLogo ? "" : "header-button"}`}
            onClick={() => setCollapsed(false)}
            onMouseEnter={() => setHoveringLogo(false)}
            onMouseLeave={() => setHoveringLogo(true)}
          >
            {!hoveringLogo ? (
              <PanelLeftOpen size={iconSize} />
            ) : (
              <Image src="/favicon.ico" alt="Sci-Cream" width={logoSize} height={logoSize} />
            )}
          </button>
        ) : (
          <div className="flex w-52 items-center">
            <Image
              src="/favicon.ico"
              alt="Sci-Cream"
              width={logoSize}
              height={logoSize}
              className="mr-auto ml-6"
            />
            <ThemeSelect themeState={[theme, setTheme]} />
            <button
              title="Collapse sidebar"
              id="collapse-sidebar-button"
              className="header-button mr-3"
              onClick={() => {
                setCollapsed(true);
                setHoveringLogo(true);
              }}
            >
              <PanelLeftClose size={iconSize} />
            </button>
          </div>
        )}
        <h1 className="m-2 text-lg font-bold">{pageTitle}</h1>
      </div>
      <button title="Account" className="header-button m-3">
        <CircleUserRound size={iconSize} />
      </button>
    </header>
  );
}

/** Collapsible sidebar with nav links */
export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, mounted } = useContext(NavbarContext);

  if (!mounted) return <aside className="navbar w-18 shrink-0" />;

  const iconSize = NAVBAR_ICON_SIZE;

  return (
    <aside
      id="sidebar"
      className={`navbar flex shrink-0 flex-col transition-[width] duration-200 ${collapsed ? "w-18" : "w-52"}`}
    >
      {/* Nav links */}
      <nav className="mt-1 flex flex-1 flex-col gap-1 px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`sidebar-item ${active ? "sidebar-item-active" : ""} gap-2 px-2`}
            >
              <Icon size={iconSize} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
