import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Image as ImageIcon,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Trophy,
  UserCircle,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import AdminAnnouncementManager from "../features/announcements/AdminAnnouncementManager";
import AdminConcernManager from "../features/forum/AdminConcernManager";
import AdminNowHappeningManager from "../features/nowHappening/AdminNowHappeningManager";
import AdminScoring from "../features/ranking/AdminScoring";
import AdminScheduleManager from "../features/schedule/AdminScheduleManager";
import AdminUpcomingGamesManager from "../features/matchup/AdminUpcomingGamesManager";
import AdminMatchResultsManager from "../features/matchResults/AdminMatchResultsManager";

function AdminDashboard() {
  const { signOut, session } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("matchup");
  const userEmail = session?.user?.email ?? "Unknown admin";

  const navigationItems = useMemo(
    () => [
      { id: "matchup", label: "Upcoming Games", icon: LayoutDashboard },
      { id: "now-happening", label: "Now Happening", icon: ImageIcon },
      { id: "schedules", label: "Schedules", icon: Calendar },
      { id: "announcements", label: "Announcements", icon: Megaphone },
      { id: "scoring", label: "Scoring", icon: Trophy },
      { id: "concerns", label: "Concerns", icon: MessageSquare },
    ],
    [],
  );

  const activeContentByTab = {
    matchup: <AdminUpcomingGamesManager />,
    "now-happening": <AdminNowHappeningManager />,
    schedules: <AdminScheduleManager />,
    announcements: <AdminAnnouncementManager />,
    scoring: (
      <>
        <AdminScoring />
        <AdminMatchResultsManager />
      </>
    ),
    concerns: <AdminConcernManager />,
  };

  async function handleSignOut() {
    await signOut();
    navigate("/adnu-admin-portal/login");
  }

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text">
      <aside className="fixed left-0 top-0 hidden min-h-screen w-64 flex-col bg-[#111827] text-white/70 lg:flex">
        <div className="border-b border-white/10 px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">
            Manager Panel
          </p>
          <h1 className="mt-2 text-xl font-bold text-white">
            ADNLS3 Dashboard
          </h1>
        </div>

        <nav className="mt-4 flex-1">
          {navigationItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full items-center gap-3 border-l-4 px-6 py-3 text-left text-sm font-medium transition ${
                  isActive
                    ? "border-brand-neon text-brand-neon"
                    : "border-transparent text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/10">
          <div className="px-6 py-4">
            <div className="flex items-center gap-3">
              <UserCircle className="h-8 w-8 shrink-0 text-white/40" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  Signed in as
                </p>
                <p className="mt-0.5 truncate text-sm text-white/70">
                  {userEmail}
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 px-6 py-4">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      <main className="px-4 py-6 pb-24 sm:px-6 lg:ml-64 lg:px-8 lg:py-10 lg:pb-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-theme-subtle">
                Manager Panel
              </p>
              <h1 className="mt-1 text-xl font-bold text-theme-text">
                ADNLS3 Dashboard
              </h1>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full border border-theme-border-soft px-4 py-2 text-sm font-semibold text-theme-text transition hover:bg-theme-surface-hover"
            >
              Sign Out
            </button>
          </div>

          {activeContentByTab[activeTab]}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-theme-border bg-theme-surface lg:hidden">
        <div className="grid grid-cols-6">
          {navigationItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold transition ${
                  isActive
                    ? "text-brand-neon"
                    : "text-theme-muted hover:text-theme-text"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default AdminDashboard;
