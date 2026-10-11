import axios from 'axios';
import { useState } from 'react';
export default function Uploader({ onFile }) {
  const[playlistUrl, setPlaylistUrl] = useState('');
  return (
    <div className="uploader">
      <button className="importButton" onClick={async ()=> {
        // If the box is empty, don't waste an API call
          if (!playlistUrl.trim()) return;
        try{
          const response = await axios.post('http://127.0.0.1:3000/api/spotify/playlist',
            {
              url:playlistUrl
            },
            {
              withCredentials:true
            }
            );
          console.log("Success", response.data);
          setPlaylistUrl('');
        }catch(error){
           console.error(error)
        }
      } }>Import</button>
      <input placeholder="Paste playlist link" className="idInputter" value={playlistUrl} onChange={(e)=>setPlaylistUrl(e.target.value)} />
    </div>
  );
}
