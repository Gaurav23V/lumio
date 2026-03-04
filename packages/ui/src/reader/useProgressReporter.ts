import { useEffect, useRef } from "react";

type ProgressReportOptions = {
  debounceMs?: number;
};

export function useProgressReporter<T>(
  value: T | null,
  onReport: (value: T) => void,
  options: ProgressReportOptions = {}
): void {
  const debounceMs = options.debounceMs ?? 1_000;
  const latestValue = useRef<T | null>(value);
  const timer = useRef<number | null>(null);

  latestValue.current = value;

  useEffect(() => {
    if (value === null) {
      return;
    }
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
    }
    timer.current = window.setTimeout(() => {
      if (latestValue.current !== null) {
        onReport(latestValue.current);
      }
    }, debounceMs);

    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
    };
  }, [value, debounceMs, onReport]);

  useEffect(() => {
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
      if (latestValue.current !== null) {
        onReport(latestValue.current);
      }
    };
  }, [onReport]);
}
