import { useEffect } from "react";

export function useSEO(title: string, description?: string) {
  useEffect(() => {
    document.title = `${title} — RateCheck`;
    if (description) {
      const el = document.querySelector('meta[name="description"]');
      if (el) el.setAttribute("content", description);
    }
  }, [title, description]);
}
