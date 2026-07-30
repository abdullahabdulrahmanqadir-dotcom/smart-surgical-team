import { notFound } from "next/navigation";
import AdminWorkspace from "../../components/AdminWorkspace";

export const metadata = { title: "Admin | Smart Surgical Team", robots: { index: false, follow: false } };

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();
  return <AdminWorkspace />;
}
