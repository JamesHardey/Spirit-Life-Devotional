import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 text-4xl">📖</div>
      <h1 className="font-serif text-2xl font-bold text-content-primary">Not found</h1>
      <p className="mt-2 text-sm text-content-secondary">
        This devotional isn’t available.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-brand-amber-700 px-5 py-3 text-sm font-semibold text-white"
      >
        Back home
      </Link>
    </div>
  );
}
