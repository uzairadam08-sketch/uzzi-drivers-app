import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";

export default async function DriverLayout({
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

  if (profile?.role === "manager") redirect("/manager");

  return (
    <div className="py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Driver
          </p>
          <h1 className="text-lg font-bold text-navy">
            {profile?.display_name ?? "Driver"}
          </h1>
        </div>
        <SignOutButton />
      </header>

      <nav className="mb-6 grid grid-cols-3 gap-2 rounded-lg bg-slate-200 p-1 text-sm font-medium">
        <Link
          href="/driver"
          className="rounded-md py-2 text-center text-navy hover:bg-white"
        >
          Today
        </Link>
        <Link
          href="/driver/jobs"
          className="rounded-md py-2 text-center text-navy hover:bg-white"
        >
          Jobs
        </Link>
        <Link
          href="/driver/expenses"
          className="rounded-md py-2 text-center text-navy hover:bg-white"
        >
          Expenses
        </Link>
      </nav>

      {children}
    </div>
  );
}
