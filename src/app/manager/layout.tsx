import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .single();

  // Only managers belong here; drivers get bounced to their own area.
  if (profile?.role !== "manager") redirect("/driver");

  return (
    <div className="py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Manager
          </p>
          <h1 className="text-lg font-bold text-navy">
            {profile?.display_name ?? "Manager"}
          </h1>
        </div>
        <SignOutButton />
      </header>

      <nav className="mb-6 grid grid-cols-3 gap-2 rounded-lg bg-slate-200 p-1 text-sm font-medium">
        <Link
          href="/manager"
          className="rounded-md py-2 text-center text-navy hover:bg-white"
        >
          Daily
        </Link>
        <Link
          href="/manager/summary"
          className="rounded-md py-2 text-center text-navy hover:bg-white"
        >
          Summary
        </Link>
        <Link
          href="/manager/my-record"
          className="rounded-md py-2 text-center text-navy hover:bg-white"
        >
          My Record
        </Link>
      </nav>

      {children}
    </div>
  );
}
