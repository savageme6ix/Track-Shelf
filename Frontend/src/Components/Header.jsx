import Uploader from './Uploader';

export default function Header({ onFile }) {
  return (
    <header>
      <div>
        <h1>Track-Shelf</h1>
        <p>
          Upload any playlist. Track Shelf compares the playlist
          to music 
        </p>
        <p>
          on your local library 
          and shows you which ones you 
          have locally.
        </p>
      </div>
      <Uploader onFile={onFile} />
    </header>
  );
}
