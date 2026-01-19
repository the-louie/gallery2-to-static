import { Layout } from './components/Layout';
import { AlbumGrid } from './components/AlbumGrid';

function App() {
  return (
    <Layout>
      <AlbumGrid albumId={7} />
    </Layout>
  );
}

export default App;
