export function BootstrappedBanner({ label }: { label: string }) {
  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: 8,
        padding: 12,
        fontFamily: "system-ui, sans-serif"
      }}
    >
      {label}
    </div>
  );
}
