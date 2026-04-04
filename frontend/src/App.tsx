import { Navigate, Route, Routes } from "react-router-dom";
import MealPage from "./pages/MealPage";
import MapPage from "./pages/MapPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MealPage />} />
      <Route path="/map" element={<MapPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
