export default function Uploader({ onFile }) {

  return (
    <div className="uploader">
      <button className="importButton">Import</button>
      <input placeholder="Paste playlist link" className="idInputter" />
    </div>
  );
}
