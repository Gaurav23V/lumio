export type ReaderToolbarProps = {
  title: string;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSearch: (term: string) => void;
};

export function ReaderToolbar(props: ReaderToolbarProps) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        borderBottom: "1px solid #ddd",
        padding: "8px 12px",
        fontFamily: "system-ui, sans-serif"
      }}
    >
      <strong>{props.title}</strong>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button type="button" onClick={props.onZoomOut}>
          -
        </button>
        <span>{Math.round(props.zoom * 100)}%</span>
        <button type="button" onClick={props.onZoomIn}>
          +
        </button>
        <input
          placeholder="Search"
          onKeyDown={(event) => {
            if (event.key !== "Enter") {
              return;
            }
            props.onSearch((event.currentTarget as HTMLInputElement).value);
          }}
          style={{ padding: "6px 8px" }}
        />
      </div>
    </header>
  );
}
