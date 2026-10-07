import { useEffect, useRef, useState } from 'react';
import Header from './Components/Header';
import AlbumCard from './Components/AlbumsCard';
import ThemePanel from './Components/ThemePanel';
import { PLACEHOLDER_SRC } from './utils/placeholder';
import { useAlbumTheme } from './utils/useAlbumTheme';
import './index.css';

function App() {
  const [message,setMessage] = useState('');
  const [isLoading,setIsLoading] = useState(false);
  const [error,setError] = useState(null);

  const { theme, processImage } = useAlbumTheme();
  const [src, setSrc] = useState(PLACEHOLDER_SRC);
  const [title, setTitle] = useState('Artist Name');
  const [subtitle, setSubtitle] = useState('Single • 2025');
  const objectUrl = useRef(null);

  const handleFile = (file) => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(file);
    setSrc(objectUrl.current);

    // Demo titles from filename
    const name = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    setTitle(name || 'Artist Name');
    setSubtitle('Single • 2025');
  };

  // Clean up the last object URL on unmount
  useEffect(() => () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
  }, []);


  // const callAPI = async ()=>{

  //   try{
  //     setIsLoading(true);
  //     setError(null);
  //     const response = await fetch('http://localhost:3000/api/spotify/login');

  //     if (!response.ok) {
  //         throw new Error(`HTTP error! Status: ${response.status}`);
  //       }

  //     const data = await response.json();
  //     setMessage(data.message);
  //   }catch (error){
  //     if(error){
  //       setError(error.message);
  //     }
  //   }finally {
  //       // The finally block guarantees loading stops whether the request succeeds or fails
  //       setIsLoading(false); 
  //       setMessage('');
  //     }
  // }

  return (
    <>
    <div style={{ padding: '20px' }}>
      {/* 4. Disable button during loading to prevent double-clicks */}
      <button onClick={window.location.assign("http://127.0.0.1:3000/api/spotify/login")} disabled={isLoading}>
        {isLoading ? 'Fetching...' : 'login'}
      </button>

      {/* 5. Inline layout so the button doesn't vanish while loading */}
      {isLoading && <div> Loading...</div>}
      {error && <div style={{ color: 'red' }}> Error: {error}</div>}
      {message && !isLoading && <p>{message}</p>}
    </div>

    <div className="wrap">
      <Header onFile={handleFile} />

      <div className="grid">
        <AlbumCard
          src={src}
          title={title}
          subtitle={subtitle}
          onImageLoad={processImage}
        />
        <ThemePanel theme={theme} />
      </div>

      <footer>
        Works fully offline. Dominant colors are computed in your browser using
        Canvas + a small k‑means palette extractor (no libraries).
      </footer>
    </div>
    </>

  );

}

export default App

