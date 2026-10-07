import { toHex } from '../utils/color';

export default function ThemePanel({ theme }) {
  const { bg, accent, text, palette } = theme;

  return (
    <aside className="panel">
      <div className="row">
        <span className="pill">BG: {toHex(bg)}</span>
        <span className="pill">Accent: {toHex(accent)}</span>
        <span className="pill">Text: {toHex(text)}</span>
      </div>

      <div className="progress"><span /></div>

      <div className="palette">
        {palette.slice(0, 6).map((rgb, i) => (
          <div
            key={i}
            className="swatch"
            title={toHex(rgb)}
            style={{ background: toHex(rgb) }}
          />
        ))}
      </div>

      <p className="note">
        Tip: choose a vivid, high‑contrast cover for a dramatic theme.
      </p>
    </aside>
  );
}
