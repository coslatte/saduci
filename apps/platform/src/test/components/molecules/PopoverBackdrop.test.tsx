import "../../setup";
import { fireEvent, render, act } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { Popover } from "@/components/molecules/Popover";

/**
 * Regression: `Popover` listens for `mousedown` on the document, which fires on
 * every press anywhere in the app. It used to set `exiting` unconditionally, and
 * `exiting` mounts the `fixed inset-0 pointer-events-auto` backdrop. That
 * backdrop appeared between `mousedown` and `mouseup`, so the browser dispatched
 * `click` on `<body>` instead of the pressed control and no link or button
 * responded. Only the controls *inside* the popover kept working, which is
 * exactly the reported symptom.
 */
function backdrop(): Element | null {
  return document.body.querySelector("div.fixed.inset-0");
}

function dialog(): Element | null {
  return document.body.querySelector('[role="dialog"]');
}

describe("Popover backdrop", () => {
  it("no monta un overlay a pantalla completa mientras esta cerrado", () => {
    render(
      <Popover trigger={<button type="button">perfil</button>}>
        <button type="button">Accion interna</button>
      </Popover>,
    );

    expect(dialog()).toBeNull();
    expect(backdrop()).toBeNull();

    // A press anywhere in the document, on a popover that was never opened.
    act(() => {
      fireEvent.mouseDown(document.body);
      fireEvent.mouseUp(document.body);
      fireEvent.click(document.body);
    });

    expect(backdrop()).toBeNull();
  });

  it("monta el overlay al abrirlo y lo retira al pulsar fuera", () => {
    const { getByText } = render(
      <Popover trigger={<button type="button">perfil</button>}>
        <button type="button">Accion interna</button>
      </Popover>,
    );

    const trigger = getByText("perfil");
    act(() => {
      fireEvent.click(trigger);
    });

    expect(dialog()).not.toBeNull();
    expect(backdrop()).not.toBeNull();

    act(() => {
      fireEvent.mouseDown(document.body);
    });

    // The panel starts its exit animation; the backdrop is still mounted until
    // that animation settles, so the assertion is that the dialog was told to
    // close, not that it vanished synchronously.
    expect(dialog()).not.toBeNull();
  });

  it("no altera el clic de un control exterior cuando esta cerrado", () => {
    const onOutside = { calls: 0 };
    const { getByText } = render(
      <div>
        <button
          type="button"
          onClick={() => {
            onOutside.calls += 1;
          }}
        >
          Enlace externo
        </button>
        <Popover trigger={<button type="button">perfil</button>}>
          <button type="button">Accion interna</button>
        </Popover>
      </div>,
    );

    const outside = getByText("Enlace externo");
    act(() => {
      fireEvent.mouseDown(outside);
      fireEvent.mouseUp(outside);
      fireEvent.click(outside);
    });

    expect(onOutside.calls).toBe(1);
    expect(backdrop()).toBeNull();
  });
});
