import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HerView from './HerView';
import HisView from './HisView';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HerView />} />
        <Route path="/admin" element={<HisView />} />
      </Routes>
    </Router>
  );
}

export default App;
