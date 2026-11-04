import "../../setup";
import { fireEvent, render, within } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

import { AccessibleSelect } from "@/components/atoms/AccessibleSelect";

const OPTIONS = [
  { value: "0", label: "0 — Vacío" },
  { value: "2", label: "2 — Coma" },
  { value: "21", label: "21 — Sepsis grave" },
];

function bodyScope() {
  return within(document.body as unknown as HTMLElement);
}

describe("AccessibleSelect", () => {
  it("renders the listbox in a body portal above the shell chrome", () => {
    const { container } = render(
      <AccessibleSelect value="2" onChange={() => {}} options={OPTIONS} />,
    );
    fireEvent.click(bodyScope().getByRole("combobox"));

    const listbox = bodyScope().getByRole("listbox");
    expect(listbox.parentElement).toBe(document.body);
    expect(container.contains(listbox)).toBe(false);
    expect(listbox.className.includes("fixed")).toBe(true);
  });

  it("selects an option on click and closes", () => {
    const onChange = mock(() => {});
    render(
      <AccessibleSelect value="0" onChange={onChange} options={OPTIONS} />,
    );
    fireEvent.click(bodyScope().getByRole("combobox"));

    const listbox = bodyScope().getByRole("listbox");
    fireEvent.click(within(listbox).getByText("2 — Coma"));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("2");
    expect(bodyScope().queryByRole("listbox")).toBeNull();
  });

  it("moves highlight with arrows and chooses with Enter", () => {
    const onChange = mock(() => {});
    render(
      <AccessibleSelect value="0" onChange={onChange} options={OPTIONS} />,
    );
    const trigger = bodyScope().getByRole("combobox");
    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "Enter" });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("2");
  });

  it("closes on Escape and returns focus to the trigger", () => {
    render(
      <AccessibleSelect value="0" onChange={() => {}} options={OPTIONS} />,
    );
    const trigger = bodyScope().getByRole("combobox");
    fireEvent.click(trigger);
    expect(bodyScope().queryByRole("listbox")).not.toBeNull();

    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(bodyScope().queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes when clicking outside", () => {
    render(
      <div>
        <button type="button">outside</button>
        <AccessibleSelect value="0" onChange={() => {}} options={OPTIONS} />
      </div>,
    );
    fireEvent.click(bodyScope().getByRole("combobox"));
    expect(bodyScope().queryByRole("listbox")).not.toBeNull();

    fireEvent.mouseDown(bodyScope().getByText("outside"));
    expect(bodyScope().queryByRole("listbox")).toBeNull();
  });
});
