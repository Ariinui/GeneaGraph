import { Routes, Route } from 'react-router';
import { AppProvider } from '@/context/AppContext';
import Home from '@/pages/Home';
import Report from '@/pages/Report';
import Data from '@/pages/Data';
import Relations from '@/pages/Relations';
import Analytics from '@/pages/Analytics';
import MainLayout from '@/components/MainLayout';

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/report" element={<Report />} />
          <Route path="/data" element={<Data />} />
          <Route path="/relations" element={<Relations />} />
          <Route path="/analytics" element={<Analytics />} />
        </Route>
      </Routes>
    </AppProvider>
  );
}
