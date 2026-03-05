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
  const latestOnReport = useRef(onReport);
  const timer = useRef<number | null>(null);

  latestValue.current = value;
  latestOnReport.current = onReport;

  useEffect(() => {
    if (value === null) {
      return;
    }
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
    }
    timer.current = window.setTimeout(() => {
      if (latestValue.current !== null) {
        latestOnReport.current(latestValue.current);
      }
    }, debounceMs);

    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
    };
  }, [value, debounceMs]);

  useEffect(() => {
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
      if (latestValue.current !== null) {
        latestOnReport.current(latestValue.current);
      }
    };
  }, []);
}
