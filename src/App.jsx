import { BrowserRouter, Routes, Route } from "react-router-dom";
import Signup from "./pages/Login";
import Board from "./pages/Dashboard.jsx";
import ProtectedRoute from "./components/ProtectedRoute";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard.jsx";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Signup />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* <Route
          path="/board"
          element={
            <ProtectedRoute>
              <Board />
            </ProtectedRoute>
          }
        /> */}
      </Routes>
    </BrowserRouter>
  );
};

export default App;