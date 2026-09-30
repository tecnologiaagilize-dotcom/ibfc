"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function VisitCounter({ initialTotal }: { initialTotal: number | null }) {
  const [total, setTotal] = useState(initialTotal);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const controller = new AbortController();
    fetch("/api/visits", { method: "POST", signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (typeof result?.total === "number") setTotal(result.total);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [pathname]);

  if (total === null) return null;
  return <div style={{ marginTop: 8, fontSize: 14 }}>Visitas registradas: <strong>{total.toLocaleString("pt-BR")}</strong></div>;
}
