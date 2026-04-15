import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

function MainLayout() {
  return (
    <div className="flex h-screen min-h-[100dvh] flex-col overflow-hidden bg-theme-bg text-theme-text">
      <Navbar />
      <main
        id="app-scroll-root"
        className="flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+6.5rem)] lg:pb-0"
      >
        <Outlet />
        <Footer />
      </main>
    </div>
  );
}

export default MainLayout;
