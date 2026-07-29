"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { IconBell, IconBookmark, IconCheck, IconLayers, IconLogOut, IconMail, IconSliders, IconUser } from "./icons";

type Member = { name: string; email: string } | null;

const interests = ["Thyroid & Parathyroid", "Salivary Glands", "Neck & Lymphatic Surgery"];

export default function MemberProfile({ locale, initialMember, chatGPTSignOutPath }: { locale: string; initialMember: Member; chatGPTSignOutPath: string }) {
  const [member, setMember] = useState<Member>(initialMember);
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
  const initials = useMemo(() => (member?.name ?? "SST").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(), [member]);

  useEffect(() => {
    if (initialMember) return;
    try {
      const client = getSupabaseBrowserClient();
      client.auth.getUser().then(({ data }) => {
        if (data.user?.email) setMember({ name: String(data.user.user_metadata.full_name ?? data.user.email), email: data.user.email });
      });
    } catch { /* ChatGPT sign-in remains available when Supabase is not configured. */ }
  }, [initialMember]);

  function savePreferences() {
    try { localStorage.setItem("sst-profile-preferences", JSON.stringify({ emailUpdates })); } catch { /* no persistent browser storage */ }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3200);
  }

  async function signOut() {
    try {
      await getSupabaseBrowserClient().auth.signOut();
    } catch {
      /* The platform-managed session is cleared by the destination below. */
    }
    window.location.assign(chatGPTSignOutPath);
  }

  if (!member) {
    return <section className="profile-empty"><div className="profile-empty-icon"><IconUser size={27} /></div><span className="auth-kicker">Your account</span><h1>Your learning profile is ready when you are.</h1><p>Sign in to save cases, keep track of your learning interests, and receive considered updates from the team.</p><Link className="btn btn-primary" href={`/${locale}/sign-in`}>Sign in to continue</Link></section>;
  }

  return (
    <div className="profile-layout">
      <aside className="profile-identity">
        <div className="profile-avatar" aria-label={`${member.name} profile`}>{initials}</div>
        <div><span className="auth-kicker">Member profile</span><h1>{member.name}</h1><p><IconMail size={16} />{member.email}</p></div>
        <div className="profile-completion"><div><b>Profile complete</b><span>Learning preferences saved</span></div><strong>100%</strong></div>
        <nav className="profile-nav" aria-label="Profile sections"><a href="#overview" className="is-active"><IconUser size={18} />Overview</a><a href="#saved"><IconBookmark size={18} />Saved learning</a><a href="#preferences"><IconSliders size={18} />Preferences</a></nav>
        <button className="profile-signout" type="button" onClick={signOut}><IconLogOut size={18} />Sign out</button>
      </aside>

      <div className="profile-content">
        <section className="profile-welcome" id="overview"><span className="auth-kicker">Your learning space</span><h2>Good to have you here, {member.name.split(" ")[0]}.</h2><p>Keep the topics you care about close, and return to the library whenever you are ready to explore.</p><div className="profile-metrics"><div><IconBookmark size={19} /><strong>Saved cases</strong><span>Your personal collection is ready.</span></div><div><IconLayers size={19} /><strong>Focus areas</strong><span>{interests.length} topics selected for you.</span></div></div></section>

        <section className="profile-panel" id="saved"><div className="profile-panel-heading"><div><span className="auth-kicker">Saved learning</span><h2>Build a reference library.</h2></div><Link href={`/${locale}/topics`} className="text-link">Browse topics</Link></div><div className="saved-empty"><div className="saved-empty-icon"><IconBookmark size={22} /></div><div><h3>Nothing saved yet</h3><p>When a case or topic is useful for your next study session, save it here for easy return.</p></div></div></section>

        <section className="profile-panel" id="preferences"><div className="profile-panel-heading"><div><span className="auth-kicker">Preferences</span><h2>Shape your updates.</h2></div></div><div className="interest-list"><p>Focus areas</p><div>{interests.map((interest) => <span key={interest}><IconCheck size={15} />{interest}</span>)}</div></div><label className="preference-toggle"><span><IconBell size={19} /><span><b>Learning updates</b><small>Occasional event and library updates from Smart Surgical Team.</small></span></span><input type="checkbox" checked={emailUpdates} onChange={(event) => setEmailUpdates(event.target.checked)} /><i aria-hidden="true" /></label><div className="profile-save-row"><button className="btn btn-primary" type="button" onClick={savePreferences}>Save preferences</button>{saved && <p role="status"><IconCheck size={17} />Preferences saved in this browser.</p>}</div></section>
      </div>
    </div>
  );
}
