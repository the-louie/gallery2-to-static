import { useEffect, useState } from 'react';
import type { Child } from '../../types';

function App() {
  const [data, setData] = useState<Child[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = () => {
    setIsLoading(true);
    setError(null);
    // Test JSON import from parent data directory
    // Note: In production, JSON files should be in public/data/ or served via static hosting
    // For development, Vite serves files from public/ directory at root path
    // Files from ../data/ need to be accessible via /data/ path
    fetch('/data/test.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load JSON: ${response.statusText}`);
        }
        return response.json();
      })
      .then((json: Child[]) => {
        console.log('JSON imported successfully:', json);
        setData(json);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error loading JSON:', err);
        setError(err.message);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div>
      <h1>Gallery 2 to Static</h1>
      <p>Frontend application initialized</p>
      <button onClick={loadData} disabled={isLoading} aria-label="Reload data">
        {isLoading ? 'Loading...' : 'Reload Data'}
      </button>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {data && (
        <div>
          <h2>JSON Import Test</h2>
          <p>Successfully loaded {data.length} items</p>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default App;
