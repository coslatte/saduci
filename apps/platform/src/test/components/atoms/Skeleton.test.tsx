import "../../setup";
import { render } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

import { Skeleton } from "@/components/atoms/Skeleton";
import { TableSkeleton } from "@/components/molecules/TableSkeleton";

describe("Skeleton", () => {
  it("is decorative and marked for styling hooks", () => {
    const { container } = render(<Skeleton />);
    const node = container.querySelector('[data-slot="skeleton"]');

    expect(node).not.toBeNull();
    expect(node?.getAttribute("aria-hidden")).toBe("true");
  });

  it("applies the variant shape", () => {
    const { container } = render(<Skeleton variant="circle" />);
    const node = container.querySelector('[data-slot="skeleton"]');

    expect(node?.className.includes("rounded-full")).toBe(true);
  });

  it("hides the shimmer when static", () => {
    const { container } = render(<Skeleton static />);
    const node = container.querySelector('[data-slot="skeleton"]');

    expect(node?.querySelector("span")).toBeNull();
  });

  it("renders a shimmer overlay by default", () => {
    const { container } = render(<Skeleton />);
    const node = container.querySelector('[data-slot="skeleton"]');

    expect(node?.querySelector("span")).not.toBeNull();
  });
});

describe("TableSkeleton", () => {
  it("announces its busy state and message", () => {
    const { getByRole, container } = render(
      <TableSkeleton columns={3} rows={2} />,
    );

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(getByRole("status").textContent).toContain("Cargando");
  });

  it("reserves the requested number of rows", () => {
    const { container } = render(<TableSkeleton columns={2} rows={4} />);
    const body = container.querySelectorAll(".grid.gap-4");

    // One header grid plus one grid per body row.
    expect(body.length).toBe(5);
  });

  it("shows the provided status label", () => {
    const { getByRole } = render(
      <TableSkeleton columns={2} rows={1} label="Cargando datos…" />,
    );

    expect(getByRole("status").textContent).toBe("Cargando datos…");
  });
});
