import SectionHeading from "../components/ui/SectionHeading";
import AnonymousConcernForm from "../features/forum/AnonymousConcernForm";
import PublicConcernBoard from "../features/forum/PublicConcernBoard";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Linkedin, Mail } from "lucide-react";
import { getAppSettings } from "../services/appSettingsService";
import { isSupabaseConfigured, supabase } from "../services/supabaseClient";

const aboutCards = [
  {
    title: "Past Themes",
    description:
      "This page can archive previous league motifs, branding direction, and milestone moments to preserve institutional memory.",
  },
  {
    title: "Season 3 Goal",
    description:
      "For ADNLS3, aims to becomes the central public channel for transparent schedules, standings, official notices, and published documentation.",
  },
];

function getDeveloperInitials(name) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return "??";
  }

  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${first}${last}`.toUpperCase();
}

function About() {
  const location = useLocation();
  const [developers, setDevelopers] = useState([]);
  const [isForumsVisible, setIsForumsVisible] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkForumsVisibility() {
      try {
        const settings = await getAppSettings();
        const visible = settings?.is_forums_visible !== false;
        if (!cancelled) {
          setIsForumsVisible(visible);
        }
      } catch (error) {
        console.warn("Failed to fetch app settings:", error);
        if (!cancelled) {
          setIsForumsVisible(true);
        }
      }
    }

    checkForumsVisibility();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (location.hash !== "#anonymous-concern-form") {
      return;
    }

    const section = document.getElementById("anonymous-concern-form");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash]);

  useEffect(() => {
    let cancelled = false;

    async function fetchDevelopers() {
      if (!isSupabaseConfigured) {
        return;
      }

      const { data, error } = await supabase
        .from("developers")
        .select("id, name, role, academic_info, gbox, linked_in, photo_url")
        .order("name", { ascending: true });

      if (cancelled) {
        return;
      }

      if (error) {
        console.warn("Failed to fetch developers:", error.message);
        return;
      }

      setDevelopers(Array.isArray(data) ? data : []);
    }

    fetchDevelopers();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="w-full px-4 py-8 md:mx-auto md:max-w-3xl md:px-6 lg:max-w-7xl lg:px-8 lg:py-12">
      <SectionHeading
        eyebrow="More"
        title="About Ateneo De Naga League"
        descriptionClassName="max-w-none"
        description={
          <div className="space-y-4 text-justify">
            <p>
              Since its debut in 2024, the Ateneo de Naga League (ADNL) has stood
              as a flagship celebration of athletic spirit, unity, and holistic
              formation. Following the transformative journey of Season 2’s
              &apos;Turning the Tides&apos;, we now enter a new chapter of excellence
              and community pride.
            </p>
            <p>
              This year, under the theme &apos;One Ateneo, One League, we celebrate
              the shared identity that binds us. While the students represent
              different colleges and teams, we compete as one community. Beyond
              the scores and medals, ADNL S3 is about the grit, resilience, and
              character displayed on the path to greatness.
            </p>
            <p>
              From March 18–23, 2026, the Ateneo de Naga University - Bagumbayan
              Campus and the Pacol Sports Complex will become the stage for a
              convergence of talent and the indomitable Atenean spirit. We invite
              you to move with purpose, cheer with pride, and witness our fellow
              Ateneans as they come together as one community to celebrate our
              shared identity and the enduring values that define the Atenean
              spirit.
            </p>
          </div>
        }
      />
      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        {aboutCards.map((card) => (
          <article
            key={card.title}
            className="rounded-2xl border border-theme-border bg-theme-surface-soft p-4 shadow-panel sm:p-5"
          >
            <h3 className="text-base font-semibold text-theme-text sm:text-lg">
              {card.title}
            </h3>
            <p className="mt-2 text-sm leading-5 text-theme-muted sm:mt-3 sm:leading-6">
              {card.description}
            </p>
          </article>
        ))}
      </div>

           {isForumsVisible ? (
        <>
          <section id="anonymous-concern-form" className="mt-6 lg:mt-8">
            <AnonymousConcernForm />
          </section>

          <section className="mt-6 lg:mt-8">
            <PublicConcernBoard />
          </section>
        </>
      ) : (
        <section id="anonymous-concern-form" className="mt-6 lg:mt-8">
          <div className="rounded-3xl border border-theme-border bg-theme-surface p-4 shadow-panel sm:p-6 lg:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-blue">
              Concerns and Queries
            </p>
            <h2 className="mt-2 text-2xl font-bold text-theme-text sm:text-3xl">
              Forums are temporarily closed
            </h2>
            <p className="mt-2 text-sm leading-5 text-theme-muted sm:text-base sm:leading-6">
              Forums are temporarily closed, check back later.
            </p>
          </div>
        </section>
      )}

      <section className="mt-8 rounded-3xl bg-slate-50 px-4 py-10 sm:px-6 lg:mt-12 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
            Meet the Developers
          </h2>

          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
            {developers.map((developer) => (
              <article
                key={developer.id ?? developer.name}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  {developer.photo_url ? (
                    <img
                      src={developer.photo_url}
                      alt={developer.name}
                      className="h-16 w-16 rounded-full border border-slate-200 bg-slate-100 object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-bold uppercase tracking-[0.14em] text-slate-700">
                      {getDeveloperInitials(developer.name)}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold text-slate-900">
                      {developer.name}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-indigo-600">
                      {developer.role}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {developer.academic_info}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <a
                    href={developer.gbox ? `mailto:${developer.gbox}` : "#"}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                    aria-label={`Email ${developer.name}`}
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                  <a
                    href={developer.linked_in || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                    aria-label={`LinkedIn profile for ${developer.name}`}
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-16 w-full flex flex-col items-center px-4 md:mt-24">
            <h2 className="mb-4 text-center text-2xl font-bold text-slate-800">
              Acknowledgments
            </h2>
          
            <p className="max-w-3xl text-center text-sm leading-relaxed text-slate-600 md:text-base">
              We extend our deepest gratitude to{" "}
              <span className="font-medium text-slate-800">
                Sir Ian Peter L. Lastimosa
              </span>{" "}
              &{" "}
              <span className="font-medium text-slate-800">
                Sir Paul Angelo S. Silvestre
              </span>{" "}
              for their guidance, mentorship, and support throughout the development of
              this platform.
            </p>
          </div>

        </div>
      </section>
    </div>
  );
}

export default About;
