"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { IconArrowRight, IconBell, IconBookmark, IconCheck, IconLogOut, IconMail, IconSliders, IconUser } from "./icons";

type Member = { name: string; email: string } | null;
type SavedCase = { slug: string; title: string; summary: string; topic: string; format: string; duration: string };
type ProfileSection = "overview" | "saved" | "preferences";

const profileSections: { id: ProfileSection; label: string; icon: typeof IconUser }[] = [
  { id: "overview", label: "Overview", icon: IconUser },
  { id: "saved", label: "Saved learning", icon: IconBookmark },
  { id: "preferences", label: "Preferences", icon: IconSliders },
];

function savedCasesFrom(value: unknown): SavedCase[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Record<string, unknown>;
    if (!["slug", "title", "summary", "topic", "format", "duration"].every((key) => typeof candidate[key] === "string")) return [];
    return [{ slug: candidate.slug as string, title: candidate.title as string, summary: candidate.summary as string, topic: candidate.topic as string, format: candidate.format as string, duration: candidate.duration as string }];
  });
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
        <section className="profile-welcome" id="overview"><span className="auth-kicker">Your learning space</span><h2>Good to have you here, {member.name.split(" ")[0]}.</h2><p>Keep the topics you care about close, and return to the library whenever you are ready to explore.</p><div className="profile-metrics"><div><IconBookmark size={19} /><strong>Saved cases</strong><span>{savedCases.length ? `${savedCases.length} case${savedCases.length === 1 ? "" : "s"} saved for later.` : "Your personal collection is ready."}</span></div></div></section>

        <section className="profile-panel" id="saved"><div className="profile-panel-heading"><div><span className="auth-kicker">Saved learning</span><h2>Build a reference library.</h2></div><Link href={`/${locale}/topics`} className="text-link">Browse topics</Link></div>{savedCases.length ? <div className="saved-case-list">{savedCases.map((savedCase) => <Link className="saved-case" href={`/${locale}/library/${savedCase.slug}`} key={savedCase.slug}><span className="saved-case-icon"><IconBookmark size={20} /></span><span><b>{savedCase.title}</b><small>{savedCase.topic} · {savedCase.format} · {savedCase.duration}</small><em>{savedCase.summary}</em></span><IconArrowRight size={18} /></Link>)}</div> : <div className="saved-empty"><div className="saved-empty-icon"><IconBookmark size={22} /></div><div><h3>Nothing saved yet</h3><p>When a case or topic is useful for your next study session, save it here for easy return.</p></div></div>}</section>

        <section className="profile-panel" id="preferences"><div className="profile-panel-heading"><div><span className="auth-kicker">Preferences</span><h2>Shape your updates.</h2></div></div><label className="preference-toggle"><span><IconBell size={19} /><span><b>Learning updates</b><small>Occasional event and library updates from Smart Surgical Team.</small></span></span><input type="checkbox" checked={emailUpdates} onChange={(event) => setEmailUpdates(event.target.checked)} /><i aria-hidden="true" /></label><div className="profile-save-row"><button className="btn btn-primary" type="button" onClick={savePreferences}>Save preferences</button>{saved && <p role="status"><IconCheck size={17} />Preferences saved in this browser.</p>}</div></section>
      </div>
    </div>
  );
}
