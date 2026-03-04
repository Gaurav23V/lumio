import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useProgressReporter } from "./useProgressReporter";

function Harness(props: { value: number | null; onReport: (value: number) => void }) {
  useProgressReporter(props.value, props.onReport, { debounceMs: 200 });
  return null;
}

describe("useProgressReporter", () => {
  it("debounces progress emission", () => {
    vi.useFakeTimers();
    const onReport = vi.fn();
    const { rerender } = render(<Harness value={1} onReport={onReport} />);

    rerender(<Harness value={2} onReport={onReport} />);
    rerender(<Harness value={3} onReport={onReport} />);
    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(onReport).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onReport).toHaveBeenCalledWith(3);

    vi.useRealTimers();
  });
});
