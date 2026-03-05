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

  it("does not emit immediately when callback reference changes", () => {
    vi.useFakeTimers();
    const onReportA = vi.fn();
    const onReportB = vi.fn();
    const { rerender } = render(<Harness value={7} onReport={onReportA} />);

    rerender(<Harness value={7} onReport={onReportB} />);
    expect(onReportA).not.toHaveBeenCalled();
    expect(onReportB).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onReportA).not.toHaveBeenCalled();
    expect(onReportB).toHaveBeenCalledTimes(1);
    expect(onReportB).toHaveBeenCalledWith(7);

    vi.useRealTimers();
  });
});
