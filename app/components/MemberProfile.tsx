"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { PUBLIC_TOPIC_GROUPS } from "../lib/topics";
import { IconArrowRight, IconBell, IconBookmark, IconCalendar, IconCheck, IconClock, IconFile, IconLayers, IconLogOut, IconMail, IconPlay, IconSliders, IconUser } from "./icons";
import TopicGlyph from "./TopicGlyph";

type Member = { name: string; email: string } | null;
type SavedCase = { slug: string; title: string; summary: string; topic: string; format: string; duration: string; posterUrl?: string };
type ProfileSection = "overview" | "saved" | "events" | "preferences";

const profileSections: { id: ProfileSection; label: string; icon: typeof IconUser }[] = [
  { id: "overview", label: "Overview", icon: IconUser },
  { id: "saved", label: "Saved learning", icon: IconBookmark },
  { id: "events", label: "Events", icon: IconCalendar },
  { id: "preferences", label: "Preferences", icon: IconSliders },
];

function savedCasesFrom(value: unknown): SavedCase[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Record<string, unknown>;
    if (!["slug", "title", "summary", "topic", "format", "duration"].every((key) => typeof candidate[key] === "string")) return [];
    return [{ slug: candidate.slug as string, title: candidate.title as string, summary: candidate.summary as string, topic: candidate.topic as string, format: candidate.format as string, duration: candidate.duration as string, ...(typeof candidate.posterUrl === "string" ? { posterUrl: candidate.posterUrl } : {}) }];
  });
}

function SavedCaseArtwork({ savedCase }: { savedCase: SavedCase }) {
  if (savedCase.posterUrl) return <img src={savedCase.posterUrl} alt="" />;
  const topic = PUBLIC_TOPIC_GROUPS.find((group) => group.name === savedCase.topic || group.subTopics.some((subTopic) => subTopic.name === savedCase.topic));
  return topic ? <TopicGlyph icon={topic.icon} imageIcon={topic.imageIcon} size={86} /> : <IconBookmark size={58} aria-hidden="true" />;
}

export default function MemberProfile({ locale, initialMember }: { locale: string; initialMember: Member }) {
  const [member, setMember] = useState<Member>(initialMember);
  const [activeSection, setActiveSection] = useState<ProfileSection>("overview");
  const [emailUpdates, setEmailUpdates] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = window.localStorage.getItem("sst-profile-preferences");
      return stored ? JSON.parse(stored).emailUpdates ?? true : true;
    } catch {
      return true;
    }
  });
  const [saved, setSaved] = useState(false);
  const [savedCases, setSavedCases] = useState<SavedCase[]>([]);
  const initials = useMemo(() => (member?.name ?? "SST").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(), [member]);

  useEffect(() => {
    let active = true;
    const updateSavedCases = (event: Event) => {
      if (active) setSavedCases(savedCasesFrom((event as CustomEvent<unknown>).detail));
    };
    window.addEventListener("sst-saved-cases-changed", updateSavedCases);
    try {
      const client = getSupabaseBrowserClient();
      client.auth.getUser().then(({ data }) => {
        if (!active || !data.user) return;
        if (data.user.email) setMember({ name: String(data.user.user_metadata.full_name ?? data.user.email), email: data.user.email });
        setSavedCases(savedCasesFrom(data.user.user_metadata.saved_cases));
      });
    } catch { /* No active Supabase session. */ }
    return () => { active = false; window.removeEventListener("sst-saved-cases-changed", updateSavedCases); };
  }, [initialMember]);

  useEffect(() => {
    const syncActiveSection = () => {
      const section = window.location.hash.slice(1);
      if (profileSections.some(({ id }) => id === section)) setActiveSection(section as ProfileSection);
    };

    syncActiveSection();
    window.addEventListener("hashchange", syncActiveSection);
    return () => window.removeEventListener("hashchange", syncActiveSection);
  }, []);

  function savePreferences() {
    try { localStorage.setItem("sst-profile-preferences", JSON.stringify({ emailUpdates })); } catch { /* no persistent browser storage */ }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3200);
  }

  async function removeSavedCase(slug: string) {
    const nextSavedCases = savedCases.filter((savedCase) => savedCase.slug !== slug);
    setSavedCases(nextSavedCases);
    try {
      const { error } = await getSupabaseBrowserClient().auth.updateUser({ data: { saved_cases: nextSavedCases } });
      if (error) throw error;
      window.dispatchEvent(new CustomEvent("sst-saved-cases-changed", { detail: nextSavedCases }));
    } catch {
      setSavedCases(savedCases);
    }
  }

  async function signOut() {
    try {
      await getSupabaseBrowserClient().auth.signOut();
    } catch {
      /* No active session to clear. */
    }
    window.location.assign(`/${locale}/sign-in`);
  }

  if (!member) {
    return <section className="profile-empty"><div className="profile-empty-icon"><IconUser size={27} /></div><span className="auth-kicker">Your account</span><h1>Your learning profile is ready when you are.</h1><p>Sign in to save cases, keep track of your learning interests, and receive considered updates from the team.</p><Link className="btn btn-primary" href={`/${locale}/sign-in`}>Sign in to continue</Link></section>;
  }

  return (
    <div className="profile-layout">
      <aside className="profile-identity">
        <div className="profile-avatar" aria-label={`${member.name} profile`}>{initials}</div>
        <div><span className="auth-kicker">Member profile</span><h1>{member.name}</h1><p><IconMail size={16} />{member.email}</p></div>
        <nav className="profile-nav" aria-label="Profile sections">
          {profileSections.map(({ id, label, icon: Icon }) => {
            const isActive = activeSection === id;
            return <a href={`#${id}`} className={isActive ? "is-active" : undefined} aria-current={isActive ? "location" : undefined} onClick={() => setActiveSection(id)} key={id}><Icon size={18} />{label}</a>;
          })}
        </nav>
        <button className="profile-signout" type="button" onClick={signOut}><IconLogOut size={18} />Sign out</button>
      </aside>

      <div className="profile-content">
        {activeSection !== "saved" && <>
        <section className="profile-welcome" id="overview"><div className="profile-welcome-orbit" aria-hidden="true"><i /><i /><i /></div><span className="auth-kicker">Your learning space</span><h2>Good to have you here, {member.name.split(" ")[0]}.</h2><p>Keep the topics you care about close, and return to the library whenever you are ready to explore.</p><div className="profile-metrics"><div><IconBookmark size={19} /><strong>Saved cases</strong><span>{savedCases.length ? `${savedCases.length} case${savedCases.length === 1 ? "" : "s"} saved for later.` : "Your personal collection is ready."}</span></div><div><IconLayers size={19} /><strong>Learning path</strong><span>Explore focused teaching across four published specialties.</span></div><div><IconCalendar size={19} /><strong>Events</strong><span>Keep upcoming lectures and team events close by.</span></div></div></section>

        <section className="profile-panel profile-recommendations"><div className="profile-panel-heading"><div><span className="auth-kicker">Continue exploring</span><h2>Find your next area of focus.</h2></div><Link href={`/${locale}/topics`} className="text-link">All specialties</Link></div><div className="recommendation-grid"><Link href={`/${locale}/topics/thyroid-parathyroid`}><span>01</span><strong>Thyroid &amp; Parathyroid</strong><small>Technique, anatomy and case learning.</small><IconArrowRight size={17} /></Link><Link href={`/${locale}/topics/salivary-glands`}><span>02</span><strong>Salivary Glands</strong><small>Focused approaches and facial nerve dissection.</small><IconArrowRight size={17} /></Link></div></section>

        <section className="profile-panel profile-events" id="events"><div className="profile-panel-heading"><div><span className="auth-kicker">Events &amp; webinars</span><h2>Stay close to what is next.</h2></div><Link href={`/${locale}/events`} className="text-link">View events</Link></div><div className="profile-events-empty"><span className="profile-events-date">SST</span><div><h3>Upcoming learning, in one place.</h3><p>Explore the events programme for current registration details, practical sessions and on-demand learning.</p></div><Link href={`/${locale}/events`} aria-label="Explore Smart Surgical Team events"><IconArrowRight size={18} /></Link></div></section>

        <section className="profile-panel" id="preferences"><div className="profile-panel-heading"><div><span className="auth-kicker">Preferences</span><h2>Shape your updates.</h2></div></div><label className="preference-toggle"><span><IconBell size={19} /><span><b>Learning updates</b><small>Occasional event and library updates from Smart Surgical Team.</small></span></span><input type="checkbox" checked={emailUpdates} onChange={(event) => setEmailUpdates(event.target.checked)} /><i aria-hidden="true" /></label><div className="profile-save-row"><button className="btn btn-primary" type="button" onClick={savePreferences}>Save preferences</button>{saved && <p role="status"><IconCheck size={17} />Preferences saved in this browser.</p>}</div></section>
        </>}
        {activeSection === "saved" && <section className="profile-saved-section" id="saved" aria-labelledby="saved-learning-title"><div className="profile-panel-heading"><div><span className="auth-kicker">Saved learning</span><h2 id="saved-learning-title">Your reference library</h2><p>Keep the cases and lessons you want to return to in one focused place.</p></div><Link href={`/${locale}/topics`} className="text-link">Browse topics</Link></div>{savedCases.length ? <div className="saved-content-grid">{savedCases.map((savedCase) => <article className="saved-content-card" key={savedCase.slug}><Link className="saved-content-open" href={`/${locale}/library/${savedCase.slug}`} aria-label={`Open ${savedCase.title}`}><div className="saved-content-art"><SavedCaseArtwork savedCase={savedCase} /><span className="saved-content-type">{savedCase.format.toLowerCase().includes("video") ? <IconPlay size={12} /> : <IconFile size={12} />}{savedCase.format}</span></div><div className="saved-content-copy"><p>{savedCase.topic}</p><h3>{savedCase.title}</h3><span>{savedCase.summary}</span><div><small>{savedCase.duration ? <><IconClock size={14} />{savedCase.duration}</> : null}</small><IconArrowRight size={18} /></div></div></Link><button className="saved-content-remove" type="button" onClick={() => void removeSavedCase(savedCase.slug)} aria-label={`Remove ${savedCase.title} from saved learning`}>Remove</button></article>)}</div> : <div className="saved-empty"><div className="saved-empty-icon"><IconBookmark size={22} /></div><div><h3>Nothing saved yet</h3><p>When a case or topic is useful for your next study session, save it here for easy return.</p></div></div>}</section>}
      </div>
    </div>
  );
}
