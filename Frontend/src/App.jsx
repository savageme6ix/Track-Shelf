import {useState} from 'react';

function App() {
  const [message,setMessage] = useState('');
  const [isLoading,setIsLoading] = useState(false);
  const [error,setError] = useState(null);


  const callAPI = async ()=>{
    //Abort controller to cancel the fetch request
  const controller = new AbortController();
  const { signal } = controller;

    try{
      setIsLoading(true);
      setError(null);
      const response = await fetch('http://localhost:3000/api/test', {signal} );

      if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

      const data = await response.json();
      setMessage(data.message);
    }catch (error){
      if(error.name !== 'AbortError'){
        setError(error.message);
      }
    }finally {
        // The finally block guarantees loading stops whether the request succeeds or fails
        setIsLoading(false); 
      }
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* 4. Disable button during loading to prevent double-clicks */}
      <button onClick={callAPI} disabled={isLoading}>
        {isLoading ? 'Fetching...' : 'Get Message'}
      </button>

      {/* 5. Inline layout so the button doesn't vanish while loading */}
      {isLoading && <div> Loading...</div>}
      {error && <div style={{ color: 'red' }}> Error: {error}</div>}
      {message && !isLoading && <p>{message}</p>}
    </div>
  );

}

export default App
