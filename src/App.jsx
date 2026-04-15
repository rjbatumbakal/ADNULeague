import { Analytics } from "@vercel/analytics/react";
import AppRoutes from "./routes/AppRoutes";
import BackToTop from "./components/layout/BackToTop";

function App() {
  return (
    <>
      <AppRoutes />
      <BackToTop />
      <Analytics />
    </>
  );
}

export default App;
