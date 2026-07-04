  import { StrictMode } from "react";
  import { createRoot } from "react-dom/client";
  import "./index.css";
  import App from "./App.jsx";
  import { BrowserRouter } from "react-router-dom";
  import { GoogleOAuthProvider } from "@react-oauth/google";

  // Set VITE_GOOGLE_CLIENT_ID in your .env file
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
  console.log("CLIENT ID:", GOOGLE_CLIENT_ID);
  
  createRoot(document.getElementById("root")).render(
    <BrowserRouter>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <App />
      </GoogleOAuthProvider>
    </BrowserRouter>
  );