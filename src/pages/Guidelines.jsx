import {
  ArrowDownToLine,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";
import { useCallback } from "react";
import SectionHeading from "../components/ui/SectionHeading";
import { useAsyncData } from "../hooks/useAsyncData";
import {
  getGuidelines,
  getGuidelinesBucketName,
} from "../services/guidelinesService";

function GuidelineActions({ fileUrl, downloadUrl, title }) {
  if (!fileUrl) {
    return (
      <p className="text-xs font-medium text-theme-subtle">
        PDF file not uploaded yet.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-3 text-sm font-semibold">
      <a
        href={fileUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 text-theme-text transition hover:text-brand-gold"
      >
        <ExternalLink className="h-4 w-4" />
        View PDF
      </a>
      <a
        href={downloadUrl || fileUrl}
        download={title}
        className="inline-flex items-center gap-2 text-theme-text transition hover:text-brand-gold"
      >
        <ArrowDownToLine className="h-4 w-4" />
        Download PDF
      </a>
    </div>
  );
}

function GuidelineImage({ title, imageUrl, featured = false }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={title}
        loading="lazy"
        className={`w-full object-cover ${
          featured ? "aspect-[16/9] lg:h-full lg:min-h-[22rem]" : "aspect-[16/9]"
        }`}
      />
    );
  }

  return (
    <div
      className={`flex w-full items-center justify-center bg-gradient-to-br from-brand-blue/15 via-theme-overlay to-brand-gold-soft text-theme-subtle ${
        featured ? "aspect-[16/9] lg:h-full lg:min-h-[22rem]" : "aspect-[16/9]"
      }`}
    >
      <ImageIcon className="h-12 w-12" />
    </div>
  );
}

function Guidelines() {
  const loadGuidelines = useCallback(() => getGuidelines(), []);
  const { data: guidelines, loading, error } = useAsyncData(loadGuidelines, []);
  const [featuredGuideline, ...otherGuidelines] = guidelines;

  return (
    <div className="w-full px-4 py-10 md:mx-auto md:max-w-3xl md:px-6 lg:max-w-7xl lg:px-8 lg:py-14">
      <SectionHeading
        eyebrow="More"
        title="Guidelines and Event Requirements"
        description="Browse official PDFs for general rules, event mechanics, and participation requirements. Files are served from the ADN League guidelines storage bucket."
      />

      {loading ? (
        <div className="rounded-3xl border border-theme-border bg-theme-surface p-6 text-sm text-theme-muted shadow-panel">
          Loading guideline files...
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-[#F43F5E4D] bg-[#F43F5E14] p-6 text-sm text-[#FDA4AF] shadow-panel">
          {error.message ||
            "Unable to load the guidelines right now. Please check the storage bucket and public policies."}
        </div>
      ) : !guidelines.length ? (
        <div className="rounded-3xl border border-dashed border-theme-border-soft bg-theme-surface-soft p-6 text-sm text-theme-muted shadow-panel">
          No guideline files have been published yet in the{" "}
          <span className="font-semibold text-theme-text">
            {getGuidelinesBucketName()}
          </span>{" "}
          bucket.
        </div>
      ) : (
        <div className="space-y-6">
          {featuredGuideline ? (
            <article className="overflow-hidden rounded-[2rem] border border-theme-border bg-theme-surface shadow-panel">
              <div className="grid gap-0 lg:grid-cols-[1.25fr_0.95fr]">
                <GuidelineImage
                  title={featuredGuideline.title}
                  imageUrl={featuredGuideline.image_url}
                  featured={true}
                />
                <div className="p-6">
                  <div className="flex flex-col rounded-2xl border border-theme-border-soft bg-theme-surface-soft p-5 sm:p-6 lg:h-full lg:min-h-[22rem] lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-theme-subtle">
                        General Guidelines
                      </p>
                      <h3 className="mt-3 text-2xl font-black uppercase leading-tight text-theme-text">
                        {featuredGuideline.title}
                      </h3>
                      <p className="mt-4 max-w-4xl text-sm leading-6 text-theme-muted">
                        Review the core rules, eligibility requirements, and code
                        of conduct for all participating students and departments.
                      </p>
                    </div>
                    <div className="mt-6">
                      <GuidelineActions
                        fileUrl={featuredGuideline.file_url}
                        downloadUrl={featuredGuideline.download_url}
                        title={featuredGuideline.title}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ) : null}

          {otherGuidelines.length ? (
            <div className="grid gap-5 md:grid-cols-2">
              {otherGuidelines.map((guideline) => (
                <article
                  key={guideline.id}
                  className="overflow-hidden rounded-[2rem] border border-theme-border bg-theme-surface shadow-panel transition hover:-translate-y-0.5"
                >
                  <div className="grid gap-0 sm:grid-cols-[0.95fr_1.05fr]">
                    <GuidelineImage
                      title={guideline.title}
                      imageUrl={guideline.image_url}
                    />
                    <div className="flex flex-col justify-between p-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-theme-subtle">
                          Event Guidelines
                        </p>
                        <h3 className="mt-3 text-xl font-black uppercase leading-tight text-theme-text">
                          {guideline.title}
                        </h3>
                      </div>
                      <div className="mt-5">
                        <GuidelineActions
                          fileUrl={guideline.file_url}
                          downloadUrl={guideline.download_url}
                          title={guideline.title}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default Guidelines;
