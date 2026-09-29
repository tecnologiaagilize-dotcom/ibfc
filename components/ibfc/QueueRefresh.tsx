"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export function QueueRefresh({interval = 4000}:{interval?:number}) {
  const router=useRouter();
  useEffect(()=>{const id=window.setInterval(()=>router.refresh(),interval);return ()=>window.clearInterval(id)},[router,interval]);
  return null;
}
