"use client";

import { useState } from "react";
import AdminMdtInquiries from "./AdminMdtInquiries";
import AdminQuestions from "./AdminQuestions";

/**
 * Admin → Inbox: everything the public sends the team, one tab per form.
 * Both lists stay mounted (one hidden), so switching tabs never loses a draft
 * and both waiting counts stay current. Owner and Contributors only.
 */

export type InboxTab = "questions" | "mdt";

const TABS: { id: InboxTab; label: string }[] = [
  { id: "questions", label: "Patient questions" },
  { id: "mdt", label: "MDT inquiries" },
];

export default function AdminInbox({ authHeaders, tab, setTab, initialCounts }: {
  authHeaders: () => Promise<Record<string, string>>;
  tab: InboxTab;
  setTab: (tab: InboxTab) => void;
  /** From the overview metrics, until each list has loaded its own. */
  initialCounts: Partial<Record<InboxTab, number>>;
}) {
  const [counts, setCounts] = useState(initialCounts);

  return (
    <div className="ainbox">
      <div className="ainbox-tabs" role="tablist" aria-label="Inbox">
        {TABS.map(({ id, label }) => {
          const count = counts[id];
          return (
            <button
              key={id} id={`ainbox-tab-${id}`} type="button" role="tab"
              aria-selected={tab === id} aria-controls={`ainbox-panel-${id}`}
              onClick={() => setTab(id)}
            >
              {label}
              {typeof count === "number" && <span className={count > 0 ? "is-waiting" : ""} aria-label={`${count} waiting`}>{count}</span>}
            </button>
          );
        })}
      </div>
      <div className="ainbox-panel" id="ainbox-panel-questions" role="tabpanel" aria-labelledby="ainbox-tab-questions" hidden={tab !== "questions"}>
        <AdminQuestions authHeaders={authHeaders} onCountChange={(waiting) => setCounts((current) => ({ ...current, questions: waiting }))} />
      </div>
      <div className="ainbox-panel" id="ainbox-panel-mdt" role="tabpanel" aria-labelledby="ainbox-tab-mdt" hidden={tab !== "mdt"}>
        <AdminMdtInquiries authHeaders={authHeaders} onCountChange={(waiting) => setCounts((current) => ({ ...current, mdt: waiting }))} />
      </div>
    </div>
  );
}
