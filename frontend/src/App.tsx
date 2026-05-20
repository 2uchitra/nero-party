import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { PartyPage } from "./pages/PartyPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/party/:code" element={<PartyPage />} />
      </Routes>
    </BrowserRouter>
  );
}
