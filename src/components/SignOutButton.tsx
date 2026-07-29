export function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="text-sm font-medium text-slate-500 underline-offset-2 hover:text-navy hover:underline"
      >
        Sign out
      </button>
    </form>
  );
}
