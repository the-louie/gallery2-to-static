import { useAlbumData } from './hooks/useAlbumData';
import { Layout } from './components/Layout';

function App() {
  const { data, isLoading, error, refetch } = useAlbumData(7);

  return (
    <Layout>
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
    </Layout>
  );
}

export default App;
