"use client";

import { useEffect } from "react";

/** Adds viewport cues without hiding content when scripts are unavailable. */
export function MotionEnhancements({ page }: { page: "home" | "profile" }) {
  useEffect(() => {
    if (page === "home") {
      const items = document.querySelectorAll<HTMLElement>(".mfb-home .timeline-item");
      if (!items.length || !("IntersectionObserver" in window)) return;
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) if (entry.isIntersecting) {
          entry.target.classList.add("is-in-view");
          observer.unobserve(entry.target);
        }
      }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
      items.forEach(item => observer.observe(item));
      return () => observer.disconnect();
    }

    const nav = document.querySelector<HTMLElement>(".mfb-profile-nav");
    if (!nav || !("IntersectionObserver" in window)) return;
    const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
    const sections = links.map(link => {
      const hash = link.getAttribute("href");
      return hash ? document.getElementById(hash.slice(1)) : null;
    }).filter((section): section is HTMLElement => section !== null);
    if (!sections.length) return;
    const active = new Set<string>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) active.add(entry.target.id);
        else active.delete(entry.target.id);
      }
      const current = sections.find(section => active.has(section.id));
      links.forEach(link => {
        const selected = Boolean(current && link.getAttribute("href") === `#${current.id}`);
        link.classList.toggle("is-active", selected);
        if (selected) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-15% 0px -68% 0px" });
    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, [page]);
  return null;
}
