export default function AdminLoading() {
  return (
    <main className="min-h-screen bg-pitch-950 px-4 py-6 text-foreground md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] animate-pulse space-y-6">
        <div className="h-32 rounded-2xl border border-mist-700/20 bg-pitch-900" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-40 rounded-2xl border border-mist-700/20 bg-pitch-900" />
          ))}
        </div>
        <div className="h-[420px] rounded-2xl border border-mist-700/20 bg-pitch-900" />
      </div>
    </main>
  );
}
