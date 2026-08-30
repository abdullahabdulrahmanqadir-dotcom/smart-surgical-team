"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { PUBLIC_TOPIC_GROUPS } from "../lib/topics";
import { contentThumbnailUrl } from "../lib/content-thumbnail";
import { ACCOUNT_DETAIL_FIELDS, EMPTY_ACCOUNT_DETAILS, accountMetadataPatch, isAccountComplete, readAccountDetails, type AccountDetailField, type AccountDetails } from "../lib/account";
import { IconArrowRight, IconBookmark, IconCheck, IconFile, IconLock, IconLogOut, IconMail, IconPlay, IconSparkle, IconTrash, IconUser } from "./icons";
import TopicGlyph from "./TopicGlyph";
import { fill, type Dictionary } from "../lib/dictionaries";

type Member = { name: string; email: string; createdAt?: string; emailVerified?: boolean } | null;
type SavedCase = { slug: string; title: string; summary: string; topic: string; kind: string; duration: string; videoUrl?: string; thumbnailSource?: "youtube" | "image" | "before_after"; thumbnailUrl?: string; beforeUrl?: string; afterUrl?: string };
type ProfileSection = "overview" | "saved";

function SavedCaseArtwork({ savedCase }: { savedCase: SavedCase }) {
  const thumbnail = contentThumbnailUrl(savedCase);
  if (thumbnail) return <img src={thumbnail} alt="" />;
  const topic = PUBLIC_TOPIC_GROUPS.find((group) => group.name === savedCase.topic || group.subTopics.some((subTopic) => subTopic.name === savedCase.topic));
  return topic ? <TopicGlyph icon={topic.icon} imageIcon={topic.imageIcon} size={86} /> : <IconBookmark size={58} aria-hidden="true" />;
}

/** The practice details, in the order the form lays them out. */
const DETAIL_LAYOUT: { field: AccountDetailField; span: boolean; autoComplete: string }[] = [
  { field: "first_name", span: false, autoComplete: "given-name" },
  { field: "last_name", span: false, autoComplete: "family-name" },
  { field: "organisation", span: true, autoComplete: "organization" },
  { field: "job_title", span: true, autoComplete: "organization-title" },
  { field: "city", span: false, autoComplete: "address-level2" },
  { field: "country", span: false, autoComplete: "country-name" },
];

export default function MemberProfile({ locale, initialMember, t, signUpT }: { locale: string; initialMember: Member; t: Dictionary["profile"]; signUpT: Dictionary["signUp"] }) {
  const [member, setMember] = useState<Member>(initialMember);
  const [activeSection, setActiveSection] = useState<ProfileSection>("overview");
  const [savedCases, setSavedCases] = useState<SavedCase[]>([]);
  // The same six fields registration collects, so a member can correct what
  // they typed at sign-up — or what Google guessed — without support.
  const [details, setDetails] = useState<AccountDetails>(EMPTY_ACCOUNT_DETAILS);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileStatus, setProfileStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  // Google supplies a name and an email address only, so an account created
  // that way reaches the profile without the practice details the email wizard
  // collects. Nothing here is blocked by it — the prompt just stays visible
  // until /complete-profile has been through.
  const [detailsMissing, setDetailsMissing] = useState(false);
  const initials = useMemo(() => (member?.name ?? "SST").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(), [member]);
  const memberSince = member?.createdAt ? new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(new Date(member.createdAt)) : t.activeMember;
  const profileSections: { id: ProfileSection; label: string; icon: typeof IconUser }[] = [
    { id: "overview", label: t.overview, icon: IconUser },
    { id: "saved", label: t.savedLearning, icon: IconBookmark },
  ];

  useEffect(() => {
    let active = true;
    const loadSavedCases = async () => {
      try {
        const client = getSupabaseBrowserClient();
        const [{ data: sessionData }, { data: userData }] = await Promise.all([client.auth.getSession(), client.auth.getUser()]);
        if (!active || !userData.user) return;
        const metadata = userData.user.user_metadata as Record<string, unknown> | null;
        setDetailsMissing(!isAccountComplete(metadata));
        setDetails(readAccountDetails(metadata));
        if (userData.user.email) {
          const name = String(userData.user.user_metadata.full_name ?? userData.user.email);
          setMember({ name, email: userData.user.email, createdAt: userData.user.created_at, emailVerified: Boolean(userData.user.email_confirmed_at) });
        }
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
      if (["overview", "saved"].includes(section)) setActiveSection(section as ProfileSection);
    };

    syncActiveSection();
    window.addEventListener("hashchange", syncActiveSection);
    return () => window.removeEventListener("hashchange", syncActiveSection);
  }, []);

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

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!details.first_name.trim() || !details.last_name.trim()) {
      setProfileStatus({ tone: "error", message: t.nameRequired });
      return;
    }
    if (!ACCOUNT_DETAIL_FIELDS.every((field) => details[field].trim())) {
      setProfileStatus({ tone: "error", message: signUpT.detailsRequired });
      return;
    }

    setProfileSaving(true);
    setProfileStatus(null);
    try {
      const client = getSupabaseBrowserClient();
      // Consent is not re-stamped here: editing a practice detail is not a new
      // acceptance of the terms. The patch derives full_name from the two name
      // fields, and the metadata trigger mirrors the lot into public.profiles.
      const patch = accountMetadataPatch(details, { acceptLegal: false });
      const { data, error } = await client.auth.updateUser({ data: patch });
      if (error) throw error;
      // Read completeness back off the saved user rather than assuming it:
      // an account that never recorded consent stays incomplete even with all
      // six fields filled, and the prompt has to keep saying so.
      const saved = (data.user?.user_metadata ?? patch) as Record<string, unknown>;
      setDetails(readAccountDetails(saved));
      setDetailsMissing(!isAccountComplete(saved));
      setMember((current) => current ? { ...current, name: patch.full_name } : current);
      setProfileStatus({ tone: "success", message: t.profileSaved });
    } catch {
      setProfileStatus({ tone: "error", message: t.profileSaveError });
    } finally {
      setProfileSaving(false);
    }
  }

  function closeDeleteDialog() {
    if (deleting) return;
    setDeleteOpen(false);
    setDeleteConfirmation("");
    setDeleteError("");
  }

  async function deleteAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deleteConfirmation !== "DELETE") return;
    setDeleting(true);
    setDeleteError("");
    try {
      const client = getSupabaseBrowserClient();
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("session");
      const response = await fetch("/api/profile", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deleteConfirmation }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || t.deleteAccountError);
      await client.auth.signOut({ scope: "local" });
      window.location.assign(`/${locale}`);
    } catch (error) {
      setDeleteError(error instanceof Error && error.message !== "session" ? error.message : t.deleteAccountError);
      setDeleting(false);
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
        {detailsMissing && <div className="profile-completion"><div><b>{t.completeProfile}</b><span>{t.completeProfileBody}</span></div><Link className="text-link" href={`/${locale}/complete-profile`}>{t.completeProfileAction}</Link></div>}
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
        <section className="profile-welcome" id="overview"><div className="profile-welcome-orbit" aria-hidden="true"><i /><i /><i /></div><span className="auth-kicker">{t.learningSpace}</span><h2>{fill(t.welcome, { name: member.name.split(" ")[0] })}</h2><p>{t.welcomeBody}</p></section>
        <div className="profile-account-grid">
        <section className="profile-panel profile-details" aria-labelledby="profile-details-title">
          <div className="profile-panel-heading"><div><span className="auth-kicker">{t.accountDetails}</span><h2 id="profile-details-title">{t.profileChanges}</h2><p>{t.profileChangesBody}</p></div></div>
          <form className="profile-details-form" onSubmit={saveProfile} noValidate>
            {DETAIL_LAYOUT.map(({ field, span, autoComplete }) => {
              const label: Record<AccountDetailField, string> = { first_name: signUpT.firstName, last_name: signUpT.lastName, organisation: signUpT.organisation, job_title: signUpT.jobTitle, city: signUpT.city, country: signUpT.country };
              const placeholder: Partial<Record<AccountDetailField, string>> = { organisation: signUpT.organisationPlaceholder, job_title: signUpT.jobPlaceholder };
              return <div className={span ? "form-field field-span-2" : "form-field"} key={field}>
                <label htmlFor={`profile-${field}`}>{label[field]}</label>
                <div className="field-control">{field === "first_name" && <IconUser size={18} />}<input id={`profile-${field}`} autoComplete={autoComplete} placeholder={placeholder[field]} value={details[field]} onChange={(event) => { setDetails((current) => ({ ...current, [field]: event.target.value })); setProfileStatus(null); }} required /></div>
              </div>;
            })}
            <div className="form-field field-span-2"><label htmlFor="profile-email">{t.emailAddress}</label><div className="field-control is-readonly"><IconMail size={18} /><input id="profile-email" type="email" value={member.email} readOnly aria-describedby="profile-email-help" /></div><small id="profile-email-help">{t.emailReadOnly}</small></div>
            <div className="profile-details-actions"><button className="btn btn-primary" type="submit" disabled={profileSaving}>{profileSaving ? t.savingProfile : t.saveProfile}</button>{profileStatus && <p className={`form-message is-${profileStatus.tone}`} role="status">{profileStatus.tone === "success" && <IconCheck size={17} />}{profileStatus.message}</p>}</div>
          </form>
        </section>
        <section className="profile-panel profile-summary" aria-labelledby="profile-summary-title">
          <div className="profile-summary-head"><span><IconSparkle size={18} /></span><div><span className="auth-kicker">{t.accountOverview}</span><h2 id="profile-summary-title">{t.yourAccount}</h2></div></div>
          <div className="profile-summary-list">
            <div><span><IconBookmark size={18} /></span><div><b>{t.savedLearning}</b><small>{savedCases.length ? fill(t.savedCountPlural, { count: savedCases.length }) : t.noSavedCases}</small></div><strong>{savedCases.length}</strong></div>
            <div><span><IconMail size={18} /></span><div><b>{t.emailStatus}</b><small>{member.emailVerified ? t.emailVerified : t.emailConnected}</small></div><strong className="profile-status-pill">{member.emailVerified ? t.verified : t.active}</strong></div>
            <div><span><IconLock size={18} /></span><div><b>{t.memberSince}</b><small>{t.memberAccessBody}</small></div><strong>{memberSince}</strong></div>
          </div>
        </section>
        </div>
        <section className="profile-danger" aria-labelledby="danger-zone-title">
          <div className="profile-danger-icon"><IconTrash size={20} /></div><div><span className="auth-kicker">{t.dangerZone}</span><h2 id="danger-zone-title">{t.deleteAccount}</h2><p>{t.deleteAccountBody}</p></div><button className="btn profile-delete-button" type="button" onClick={() => setDeleteOpen(true)}>{t.deleteAccount}</button>
        </section>
        </>}
        {activeSection === "saved" && <section className="profile-saved-section" id="saved" aria-labelledby="saved-learning-title"><div className="profile-panel-heading"><div><span className="auth-kicker">{t.savedLearning}</span><h2 id="saved-learning-title">{t.referenceLibrary}</h2><p>{t.referenceBody}</p></div><Link href={`/${locale}/topics`} className="text-link">{t.browseTopics}</Link></div>{savedCases.length ? <div className="saved-content-grid">{savedCases.map((savedCase) => { const kindLabel = savedCase.kind === "webinar_recording" ? t.webinarRecording : savedCase.kind === "case_article" ? t.caseArticle : savedCase.kind === "poster" ? t.poster : t.video; return <article className="saved-content-card" key={savedCase.slug}><Link className="saved-content-open" href={`/${locale}/library/${savedCase.slug}`} aria-label={fill(t.openCase, { title: savedCase.title })}><div className="saved-content-art"><SavedCaseArtwork savedCase={savedCase} /><span className="saved-content-type">{savedCase.kind === "video" || savedCase.kind === "webinar_recording" ? <IconPlay size={12} /> : <IconFile size={12} />}{kindLabel}</span></div><div className="saved-content-copy"><p>{savedCase.topic}</p><h3>{savedCase.title}</h3><span>{savedCase.summary}</span><div><small /><IconArrowRight size={18} /></div></div></Link><button className="saved-content-remove" type="button" onClick={() => void removeSavedCase(savedCase.slug)} aria-label={fill(t.removeCase, { title: savedCase.title })}>{t.remove}</button></article>; })}</div> : <div className="saved-empty"><div className="saved-empty-icon"><IconBookmark size={22} /></div><div><h3>{t.nothingSaved}</h3><p>{t.nothingSavedBody}</p></div></div>}</section>}
      </div>
      {deleteOpen && <div className="profile-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDeleteDialog(); }}>
        <section className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
          <div className="profile-dialog-icon"><IconTrash size={24} /></div><span className="auth-kicker">{t.permanentAction}</span><h2 id="delete-dialog-title">{t.deleteAccountConfirmTitle}</h2><p>{t.deleteAccountConfirmBody}</p>
          <form onSubmit={deleteAccount}>
            <div className="form-field"><label htmlFor="delete-confirmation">{t.typeDelete}</label><div className="field-control"><input id="delete-confirmation" value={deleteConfirmation} onChange={(event) => { setDeleteConfirmation(event.target.value); setDeleteError(""); }} autoComplete="off" autoFocus /></div></div>
            {deleteError && <p className="form-message is-error" role="alert">{deleteError}</p>}
            <div className="profile-dialog-actions"><button className="btn btn-outline" type="button" onClick={closeDeleteDialog} disabled={deleting}>{t.cancel}</button><button className="btn profile-delete-button" type="submit" disabled={deleteConfirmation !== "DELETE" || deleting}>{deleting ? t.deletingAccount : t.deletePermanently}</button></div>
          </form>
        </section>
      </div>}
    </div>
  );
}
