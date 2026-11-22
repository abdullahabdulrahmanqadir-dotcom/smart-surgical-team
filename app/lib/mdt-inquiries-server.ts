/**
 * MDT inquiries — server-only pieces: where the team alert goes and what it
 * says. Transport, bot check and hashing are shared (`inbox-server.ts`).
 *
 *   MDT_TEAM_EMAIL   Receives the "new MDT inquiry" alert. Falls back to
 *                    QUESTIONS_TEAM_EMAIL, so one address covers both forms
 *                    until the team names an MDT coordinator.
 */
import { config, emailLayout, type Email } from "./inbox-server";

export function mdtTeamAlertAddress(): string {
  return config("MDT_TEAM_EMAIL") || config("QUESTIONS_ALERT_EMAILS") || config("QUESTIONS_TEAM_EMAIL");
}

/**
 * The alert carries no name, institution or message: mail is less private
 * than Admin, and the inbox holds the details.
 */
export function mdtTeamAlertEmail(adminLink: string, waiting: number | null): Omit<Email, "to"> {
  const lines = [
    "A new MDT inquiry from an outside doctor or institute has arrived on the website.",
    ...(waiting && waiting > 1 ? [`${waiting} MDT inquiries are now waiting for a reply.`] : []),
    "Open Admin → Inbox → MDT inquiries to read it and reply from the team mailbox.",
  ];
  return {
    subject: "New MDT inquiry — open Admin",
    html: emailLayout("en", { paragraphs: lines, action: { label: "Open Admin", href: adminLink } }),
    text: [...lines, "", adminLink].join("\n"),
  };
}
