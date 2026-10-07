export default function Uploader({ onFile }) {
  const handleChange = (e) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
  };

  return (
    <div className="uploader">
      <strong>Upload cover</strong>
      <input type="file" accept="image/*" onChange={handleChange} />
    </div>
  );
}
