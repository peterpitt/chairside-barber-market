import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Supabase needs browser env/keys we don't have under test — stub it so routing
// can be exercised in isolation.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      getUser: async () => ({ data: { user: null } }),
    },
  },
}));

import App from "@/App";

describe("App routing", () => {
  it("renders the landing page at /", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText("Style with Confident Hair")).toBeInTheDocument();
  });

  it("resolves /login client-side instead of a 404", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.queryByText("404")).not.toBeInTheDocument();
  });

  it("renders the 404 page for unknown routes", () => {
    render(
      <MemoryRouter initialEntries={["/does-not-exist"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText("404")).toBeInTheDocument();
  });
});
