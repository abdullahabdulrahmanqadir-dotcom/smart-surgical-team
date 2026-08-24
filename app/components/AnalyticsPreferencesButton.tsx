"use client";

import { openAnalyticsPreferences } from "./AnalyticsConsent";

export default function AnalyticsPreferencesButton({ label }: { label: string }) {
  return <button type="button" className="footer-preferences" onClick={openAnalyticsPreferences}>{label}</button>;
}
