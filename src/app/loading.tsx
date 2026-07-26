// Shown instantly on navigation to "/" while the server component fetches
// today's devotional — prevents the click-and-hang feeling on slower networks.
export default function HomeLoading() {
  return (
    <div className="mx-auto max-w-lg animate-pulse pb-10">
      <section className="px-5 pt-6 pb-2">
        <div className="h-7 w-40 rounded-lg bg-surface-card" />
        <div className="mt-2 h-4 w-64 rounded-lg bg-surface-card" />
      </section>

      <div className="mt-4">
        <div className="mx-5 mb-5 h-56 rounded-3xl border border-white/5 bg-surface-card" />
        <div className="mx-5 mb-6 h-20 rounded-3xl border border-white/5 bg-surface-card" />
        <div className="mx-5 h-16 rounded-2xl border border-white/5 bg-surface-card" />
      </div>
    </div>
  );
}
