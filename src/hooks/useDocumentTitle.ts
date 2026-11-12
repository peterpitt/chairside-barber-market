import { useEffect } from "react";

// Lightweight replacement for TanStack Router's per-route head() title handling.
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
