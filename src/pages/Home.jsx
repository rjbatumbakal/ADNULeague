import { Bell } from "lucide-react";
import AnnouncementList from "../features/announcements/AnnouncementList";
import FeaturedMatchupCarousel from "../features/matchup/FeaturedMatchupCarousel";
import NowHappeningCarousel from "../features/nowHappening/NowHappeningCarousel";
import HomeRankings from "../features/ranking/HomeRankings";

function Home() {
  function formatAnnouncementDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const formattedDate = date.toLocaleDateString("en-GB");
    const formattedTime = date.toLocaleTimeString("en-PH", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return `${formattedDate}\n${formattedTime}`;
  }

  return (
    <div className="animate-in fade-in overflow-hidden">
      <section className="relative w-full overflow-hidden">
        <div
          className="relative flex min-h-[250px] items-center justify-center bg-brand-blue bg-cover bg-center bg-no-repeat px-6 text-center lg:h-[350px]"
          style={{ backgroundImage: "url('/banner.png')" }}
        >
          <img
            src="/oneAteneo_oneLeague.png"
            alt="One Ateneo One League"
            className="relative z-10 h-auto w-full max-w-[560px]"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-theme-bg" />
        </div>
      </section>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-12 pt-10 sm:px-6 lg:gap-12 lg:px-8 lg:pb-16 lg:pt-12">
        <section>
          <FeaturedMatchupCarousel />
        </section>
        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr] lg:items-stretch">
          <article className="order-2 h-full lg:order-1">
            <div className="max-w-full overflow-hidden h-full">
              <NowHappeningCarousel className="h-full min-h-[26rem] lg:min-h-[30rem] xl:min-h-[32rem]" fillHeight={true} />
            </div>
          </article>
          <article className="order-1 flex h-full min-h-[26rem] flex-col overflow-hidden rounded-3xl border border-theme-border bg-theme-surface p-5 shadow-panel lg:order-2 lg:min-h-[30rem] lg:p-8 xl:min-h-[32rem]">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-gold-soft text-brand-gold">
                <Bell className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-gold">
                  Bulletin
                </p>
                <h2 className="mt-1 text-2xl font-bold text-theme-text">
                  Latest Announcement
                </h2>
              </div>
            </div>

            <div className="mt-6 min-h-0 flex-1 overflow-hidden">
              <AnnouncementList
                limit={8}
                className="h-full content-start overflow-y-auto pr-1"
                formatCreatedAt={formatAnnouncementDate}
                recentWithinHours={4}
                expandSingleCard={true}
                cardProps={{
                  compact: true,
                  className: "",
                  scrollableContent: true,
                }}
              />
            </div>
          </article>
        </section>
        <section>
          <HomeRankings />
        </section>
      </div>
    </div>
  );
}

export default Home;
