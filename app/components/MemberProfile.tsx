"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { PUBLIC_TOPIC_GROUPS } from "../lib/topics";
import { contentThumbnailUrl } from "../lib/content-thumbnail";
import { IconArrowRight, IconBell, IconBookmark, IconCalendar, IconCheck, IconFile, IconLayers, IconLogOut, IconMail, IconPlay, IconSliders, IconUser } from "./icons";
import TopicGlyph from "./TopicGlyph";
import { fill, type Dictionary } from "../lib/dictionaries";

type Member = { name: string; email: string } | null;
type SavedCase = { slug: string; title: string; summary: string; topic: string; kind: string; duration: string; videoUrl?: string; thumbnailSource?: "youtube" | "image"; thumbnailUrl?: string };
type ProfileSection = "overview" | "saved" | "events" | "preferences";

function SavedCaseArtwork({ savedCase }: { savedCase: SavedCase }) {
  const thumbnail = contentThumbnailUrl(savedCase);
  if (thumbnail) return <img src={thumbnail} alt="" />;
  const topic = PUBLIC_TOPIC_GROUPS.find((group) => group.name === savedCase.topic || group.subTopics.some((subTopic) => subTopic.name === savedCase.topic));
  return topic ? <TopicGlyph icon={topic.icon} imageIcon={topic.imageIcon} size={86} /> : <IconBookmark size={58} aria-hidden="true" />;
}

export default function MemberProfile({ locale, initialMember, t }: { locale: string; initialMember: Member; t: Dictionary["profile"] }) {
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
  const profileSections: { id: ProfileSection; label: string; icon: typeof IconUser }[] = [
    { id: "overview", label: t.overview, icon: IconUser }, { id: "saved", label: t.savedLearning, icon: IconBookmark },
    { id: "events", label: t.events, icon: IconCalendar }, { id: "preferences", label: t.preferences, icon: IconSliders },
  ];

  useEffect(() => {
    let active = true;
    const loadSavedCases = async () => {
      try {
        const client = getSupabaseBrowserClient();
        const [{ data: sessionData }, { data: userData }] = await Promise.all([client.auth.getSession(), client.auth.getUser()]);
        if (!active || !userData.user) return;
        if (userData.user.email) setMember({ name: String(userData.user.user_metadata.full_name ?? userData.user.email), email: userData.user.email });
        const token = sessionData.session?.access_token;
        if (!token) return;
        const response = await fetch("/api/library/saved", { headers: { Authorization: `Bearer ${token}` } });
        const result = await response.json() as { data?: unknown };
        if (!response.ok || !Array.isArray(result.data) || !active) return;
        setSavedCases(result.data.filter((item): item is SavedCase => Boolean(item && typeof item === "object" && ["slug", "title", "summary", "topic", "kind", "duration"].every((key) => typeof (item as Record<string, unknown>)[key] === "string"))));
      } catch { /* The profile remains usable if the catalogue is temporarily unavailable. */ }
    };
    const updateSavedCases = () => { void loadSavedCases(); };
    window.addEventListener("sst-saved-cases-changed", updateSavedCases);
    void loadSavedCases();
    return () => { active = false; window.removeEventListener("sst-saved-cases-changed", updateSavedCases); };
  }, [initialMember]);

  useEffect(() => {
    const syncActiveSection = () => {
      const section = window.location.hash.slice(1);
      if (["overview", "saved", "events", "preferences"].includes(section)) setActiveSection(section as ProfileSection);
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
      const client = getSupabaseBrowserClient();
      const { data } = await client.auth.getUser();
      const stored = Array.isArray(data.user?.user_metadata.saved_cases) ? data.user.user_metadata.saved_cases : [];
      const { error } = await client.auth.updateUser({ data: { saved_cases: stored.filter((item: unknown) => !item || typeof item !== "object" || (item as Record<string, unknown>).slug !== slug) } });
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
    return <section className="profile-empty"><div className="profile-empty-icon"><IconUser size={27} /></div><span className="auth-kicker">{t.accountKicker}</span><h1>{t.signedOutTitle}</h1><p>{t.signedOutBody}</p><Link className="btn btn-primary" href={`/${locale}/sign-in`}>{t.signInContinue}</Link></section>;
  }

  return (
    <div className="profile-layout">
      <aside className="profile-identity">
        <div className="profile-avatar" aria-label={fill(t.profileLabel, { name: member.name })}>{initials}</div>
        <div><span className="auth-kicker">{t.memberProfile}</span><h1>{member.name}</h1><p><IconMail size={16} />{member.email}</p></div>
        <nav className="profile-nav" aria-label={t.sections}>
          {profileSections.map(({ id, label, icon: Icon }) => {
            const isActive = activeSection === id;
            return <a href={`#${id}`} className={isActive ? "is-active" : undefined} aria-current={isActive ? "location" : undefined} onClick={() => setActiveSection(id)} key={id}><Icon size={18} />{label}</a>;
          })}
        </nav>
        <button className="profile-signout" type="button" onClick={signOut}><IconLogOut size={18} />{t.signOut}</button>
      </aside>

      <div className="profile-content">
        {activeSection !== "saved" && <>
        <section className="profile-welcome" id="overview"><div className="profile-welcome-orbit" aria-hidden="true"><i /><i /><i /></div><span className="auth-kicker">{t.learningSpace}</span><h2>{fill(t.welcome, { name: member.name.split(" ")[0] })}</h2><p>{t.welcomeBody}</p><div className="profile-metrics"><div><IconBookmark size={19} /><strong>{t.savedCases}</strong><span>{savedCases.length ? fill(savedCases.length === 1 ? t.savedCount : t.savedCountPlural, { count: savedCases.length }) : t.collectionReady}</span></div><div><IconLayers size={19} /><strong>{t.learningPath}</strong><span>{t.learningPathBody}</span></div><div><IconCalendar size={19} /><strong>{t.eventsMetric}</strong><span>{t.eventsMetricBody}</span></div></div></section>

        <section className="profile-panel profile-events" id="events"><div className="profile-panel-heading"><div><span className="auth-kicker">{t.eventsWebinars}</span><h2>{t.eventsTitle}</h2></div><Link href={`/${locale}/events`} className="text-link">{t.viewEvents}</Link></div><div className="profile-events-empty"><span className="profile-events-date">SST</span><div><h3>{t.upcomingTitle}</h3><p>{t.upcomingBody}</p></div><Link href={`/${locale}/events`} aria-label={t.exploreEvents}><IconArrowRight size={18} /></Link></div></section>

        <section className="profile-panel" id="preferences"><div className="profile-panel-heading"><div><span className="auth-kicker">{t.preferences}</span><h2>{t.preferencesTitle}</h2></div></div><label className="preference-toggle"><span><IconBell size={19} /><span><b>{t.learningUpdates}</b><small>{t.updatesBody}</small></span></span><input type="checkbox" checked={emailUpdates} onChange={(event) => setEmailUpdates(event.target.checked)} /><i aria-hidden="true" /></label><div className="profile-save-row"><button className="btn btn-primary" type="button" onClick={savePreferences}>{t.savePreferences}</button>{saved && <p role="status"><IconCheck size={17} />{t.preferencesSaved}</p>}</div></section>
        </>}
        {activeSection === "saved" && <section className="profile-saved-section" id="saved" aria-labelledby="saved-learning-title"><div className="profile-panel-heading"><div><span className="auth-kicker">{t.savedLearning}</span><h2 id="saved-learning-title">{t.referenceLibrary}</h2><p>{t.referenceBody}</p></div><Link href={`/${locale}/topics`} className="text-link">{t.browseTopics}</Link></div>{savedCases.length ? <div className="saved-content-grid">{savedCases.map((savedCase) => { const kindLabel = savedCase.kind === "webinar_recording" ? t.webinarRecording : savedCase.kind === "case_article" ? t.caseArticle : savedCase.kind === "poster" ? t.poster : t.video; return <article className="saved-content-card" key={savedCase.slug}><Link className="saved-content-open" href={`/${locale}/library/${savedCase.slug}`} aria-label={fill(t.openCase, { title: savedCase.title })}><div className="saved-content-art"><SavedCaseArtwork savedCase={savedCase} /><span className="saved-content-type">{savedCase.kind === "video" || savedCase.kind === "webinar_recording" ? <IconPlay size={12} /> : <IconFile size={12} />}{kindLabel}</span></div><div className="saved-content-copy"><p>{savedCase.topic}</p><h3>{savedCase.title}</h3><span>{savedCase.summary}</span><div><small /><IconArrowRight size={18} /></div></div></Link><button className="saved-content-remove" type="button" onClick={() => void removeSavedCase(savedCase.slug)} aria-label={fill(t.removeCase, { title: savedCase.title })}>{t.remove}</button></article>; })}</div> : <div className="saved-empty"><div className="saved-empty-icon"><IconBookmark size={22} /></div><div><h3>{t.nothingSaved}</h3><p>{t.nothingSavedBody}</p></div></div>}</section>}
      </div>
    </div>
  );
}
