import { Navigate } from "react-router-dom";
import { auth } from "../services/firebase";

const ProtectedRoute = ({ children }) => {
  const user = auth.currentUser;

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;