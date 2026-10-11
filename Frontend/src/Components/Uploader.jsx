import axios from 'axios';
import { useState } from 'react';
export default function Uploader({ onFile }) {
  const[playlistUrl, setPlaylistUrl] = useState('');
  return (
    <div className="uploader">
      <button className="importButton" onClick={async ()=> {
        try{
          const response = await axios.post('http://127.0.0.1:3000/api/spotify/playlist',{
            url: playlistUrl ,
            credentials: 'include',
          });
          console.log("Success", response.data);
        }catch(error){
           console.error(error)
        }
      } } value={playlistUrl} onChange={(e)=>setPlaylistUrl(e.target.value)}>Import</button>
      <input placeholder="Paste playlist link" className="idInputter" />
    </div>
  );
}
