import Uploader from './Uploader';

export default function Header({ onFile }) {
  return (
    <header>
      <div>
        <h1>Auto‑Themed Music UI (like YT Music)</h1>
        <p>
          Upload any album/artist image. The page extracts dominant colors and
          auto-styles the UI: background gradient, accent button, readable
          text, and a palette.
        </p>
      </div>
      <Uploader onFile={onFile} />
    </header>
  );
}
