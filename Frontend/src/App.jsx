import {useState} from 'react';

function App() {
  const [message,setMessage] = useState('');

  const callAPI = async ()=>{
    try{
      const response = await fetch('http://localhost:3000');
      const data = await response.json();
      setMessage(data.message);
    }catch (error){
      console.log('Error fetching data', error)
    }
  }

  return (
    <div>
      <button onClick={callAPI}>Get Message</button>
      <p>{message}</p>
    </div>
  );
}

export default App
