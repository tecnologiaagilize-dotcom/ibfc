import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { logout } from "@/app/(app)/actions";
import { MobileNav } from "./mobile-nav";

export function Topbar({ userLabel }: { userLabel: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-950">
      <MobileNav />
      <span className="font-semibold text-slate-900 dark:text-slate-50">
        <span className="sm:hidden">IBFC</span>
        <span className="hidden sm:inline">Instituto Brasileiro da Família Cristã</span>
      </span>
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-sm text-slate-600 sm:inline dark:text-slate-300">
          {userLabel}
        </span>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sair
          </Button>
        </form>
      </div>
    </header>
  );
}
