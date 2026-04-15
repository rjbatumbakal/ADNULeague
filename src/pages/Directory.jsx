import { Facebook, Mail, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import SectionHeading from "../components/ui/SectionHeading";
import { supabase } from "../services/supabaseClient";

function getFacebookProfileUrl(member) {
  const rawValue = member.fb_link || "";
  const trimmedValue = String(rawValue).trim();

  if (!trimmedValue) {
    return null;
  }

  if (
    trimmedValue.startsWith("http://") ||
    trimmedValue.startsWith("https://")
  ) {
    return trimmedValue;
  }

  return `https://${trimmedValue}`;
}

function getMemberEmail(member) {
  return String(member.gbox || "").trim();
}

function Directory() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedMemberId, setCopiedMemberId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCommittee, setSelectedCommittee] = useState("");

  useEffect(() => {
    async function loadDirectoryMembers() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("league_directory")
        .select("id, name, committee, photo_url, fb_link, gbox")
        .order("committee", { ascending: true })
        .order("name", { ascending: true });

      if (fetchError) {
        setError(fetchError);
        setMembers([]);
        setLoading(false);
        return;
      }

      setMembers(data ?? []);
      setLoading(false);
    }

    loadDirectoryMembers();
  }, []);

  const committeeOptions = useMemo(() => {
    return Array.from(
      new Set(
        members
          .map((member) => String(member.committee || "").trim())
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right));
  }, [members]);

  const filteredMembers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const normalizedCommittee = selectedCommittee.trim().toLowerCase();

    return members.filter((member) => {
      const committeeText = String(member.committee || "").toLowerCase();

      if (normalizedCommittee && committeeText !== normalizedCommittee) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const nameText = String(member.name || "").toLowerCase();

      return (
        nameText.includes(normalizedQuery) ||
        committeeText.includes(normalizedQuery)
      );
    });
  }, [members, searchQuery, selectedCommittee]);

  async function handleCopyEmail(memberId, email) {
    const trimmedEmail = String(email || "").trim();
    if (!trimmedEmail) {
      return;
    }

    try {
      await navigator.clipboard.writeText(trimmedEmail);
      setCopiedMemberId(memberId);
      setTimeout(() => {
        setCopiedMemberId((currentId) =>
          currentId === memberId ? null : currentId,
        );
      }, 1400);
    } catch {
      setCopiedMemberId(null);
    }
  }

  return (
    <div className="w-full px-4 py-10 md:mx-auto md:max-w-3xl md:px-6 lg:max-w-7xl lg:px-8 lg:py-14">
      <SectionHeading
        eyebrow="More"
        title="Team Manager Directory"
        description="Make team manager information searchable and easy to verify for students, officers, and event coordinators."
        action={
          <div className="flex w-full flex-col gap-6 md:w-[640px] md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-theme-text opacity-70" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by member or committee"
                className="w-full min-h-[44px] rounded-2xl border border-theme-border-soft bg-theme-bg py-3 pl-11 pr-4 text-base text-theme-text outline-none transition placeholder:text-theme-subtle focus:border-brand-blue"
              />
            </div>
            <select
              value={selectedCommittee}
              onChange={(event) => setSelectedCommittee(event.target.value)}
              className="min-h-[44px] rounded-2xl border border-theme-border bg-white/10 px-4 py-3 text-base text-theme-text backdrop-blur-md outline-none transition focus:border-brand-blue md:w-[240px]"
            >
              <option value="">All committees</option>
              {committeeOptions.map((committee) => (
                <option key={committee} value={committee}>
                  {committee}
                </option>
              ))}
            </select>
          </div>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-theme-muted">
        <span>
          Showing {filteredMembers.length} of {members.length} members
        </span>
        {selectedCommittee ? (
          <span className="rounded-full bg-brand-blue/10 px-3 py-1 font-semibold uppercase tracking-wide text-brand-blue">
            {selectedCommittee}
          </span>
        ) : null}
        {searchQuery.trim() ? (
          <span className="rounded-full bg-theme-surface px-3 py-1 font-semibold text-theme-text">
            "{searchQuery.trim()}"
          </span>
        ) : null}
      </div>

      <div className="mt-8">
        {loading ? (
          <p className="text-sm text-theme-muted">Loading directory...</p>
        ) : null}

        {error ? (
          <p className="text-sm text-[#FDA4AF]">
            Unable to load directory entries right now.
          </p>
        ) : null}

        {!loading && !error ? (
          filteredMembers.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-16 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredMembers.map((member, index) => {
                const facebookProfileUrl = getFacebookProfileUrl(member);
                const memberEmail = getMemberEmail(member);

                return (
                  <article
                    key={member.id}
                    className="group animate-in fade-in slide-in-from-bottom-5 flex flex-col items-center rounded-3xl bg-theme-surface/50 p-6 text-center transition-all duration-300 hover:-translate-y-2 hover:bg-theme-surface hover:shadow-xl"
                    style={{ animationDelay: `${index * 45}ms` }}
                  >
                    <div className="rounded-full bg-brand-blue p-[3px]">
                      <div className="rounded-full bg-theme-bg p-[2px]">
                        <div className="h-32 w-32 overflow-hidden rounded-full md:h-40 md:w-40">
                          <img
                            src={member.photo_url || "/adnul_logo.PNG"}
                            alt={member.name || "Directory member"}
                            loading="lazy"
                            decoding="async"
                            fetchPriority={index < 6 ? "high" : "low"}
                            width="160"
                            height="160"
                            className="h-full w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                        </div>
                      </div>
                    </div>

                    <h3 className="mt-4 text-lg font-black tracking-tighter text-theme-text">
                      {member.name || "Unnamed Member"}
                    </h3>
                    <p className="mt-2 rounded-full bg-brand-blue/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-blue">
                      {member.committee || "Unassigned Committee"}
                    </p>

                    <div className="mt-4 flex items-center gap-3">
                      {memberEmail ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyEmail(member.id, memberEmail)
                          }
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-theme-border bg-white/10 text-theme-text backdrop-blur-md transition hover:bg-brand-blue hover:text-white"
                          aria-label={`Copy ${member.name || "Member"} email`}
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                      ) : null}
                      {facebookProfileUrl ? (
                        <a
                          href={facebookProfileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-theme-border bg-white/10 text-theme-text backdrop-blur-md transition hover:border-[#1877F2] hover:bg-[#1877F2] hover:text-white"
                          aria-label={`${member.name || "Member"} Facebook`}
                        >
                          <Facebook className="h-4 w-4" />
                        </a>
                      ) : null}
                    </div>
                    {copiedMemberId === member.id ? (
                      <p className="mt-2 text-xs font-semibold text-brand-blue">
                        Copied
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-theme-muted">
              No members found for the current search and committee filter.
            </p>
          )
        ) : null}
      </div>
    </div>
  );
}

export default Directory;
