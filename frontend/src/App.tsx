import { useAlbumData } from './hooks/useAlbumData';

function App() {
  const { data, isLoading, error, refetch } = useAlbumData(7);

  return (
    <div>
      <h1>Gallery 2 to Static</h1>
      <p>Frontend application initialized</p>
      <button onClick={refetch} disabled={isLoading} aria-label="Reload data">
        {isLoading ? 'Loading...' : 'Reload Data'}
      </button>
      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}
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
