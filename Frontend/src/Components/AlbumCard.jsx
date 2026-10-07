export default function AlbumCard({ src, title, subtitle, onImageLoad }) {
  return (
    <section className="card">
      <img
        className="art"
        alt="Album art preview"
        src={src}
        onLoad={(e) => onImageLoad(e.currentTarget)}
      />
      <div className="meta">
        <div className="titles">
          <h2 className="artist">{title}</h2>
          <p className="subtitle">{subtitle}</p>
        </div>
        <button className="play">Play</button>
      </div>
    </section>
  );
}
