"use client";

interface DatabaseSetupViewProps {
  dbPath: string;
  error: string | null;
  importResult: string | null;
  isImporting: boolean;
  mdbPath: string;
  onBrowse: () => void;
  onImport: () => void;
}

export function DatabaseSetupView({
  dbPath,
  error,
  importResult,
  isImporting,
  mdbPath,
  onBrowse,
  onImport,
}: DatabaseSetupViewProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#162033_0%,#0b1020_42%,#06080f_100%)] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="w-full max-w-4xl rounded-[36px] border border-cyan-400/15 bg-[#0b1322]/90 p-8 shadow-[0_35px_120px_rgba(0,0,0,0.5)] backdrop-blur-xl md:p-12">
          <div className="mb-10">
            <div className="mb-4 text-[12px] font-black uppercase tracking-[0.34em] text-cyan-300/70">
              First Run Setup
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">
              Build Your GB64 Database
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-white/68">
              64Box needs the original <span className="font-bold text-white">GameBase64 v19</span>{' '}
              MDB file to build the local SQLite database for search, filters, favorites, and BigBox browsing.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.9fr]">
            <section className="rounded-[28px] border border-white/8 bg-white/[0.035] p-6">
              <div className="mb-4 text-[11px] font-black uppercase tracking-[0.24em] text-cyan-300/80">
                Source File
              </div>
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-white/38">Selected MDB</div>
                <div className="mt-2 break-all text-sm leading-7 text-white/80">
                  {mdbPath || 'No MDB selected yet'}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onBrowse}
                  disabled={isImporting}
                  className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-cyan-100 transition-all hover:border-cyan-200/45 hover:bg-cyan-400/18 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Choose MDB
                </button>
                <button
                  type="button"
                  onClick={onImport}
                  disabled={isImporting || !mdbPath}
                  className="rounded-full border border-emerald-300/25 bg-emerald-400/15 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-emerald-100 transition-all hover:border-emerald-200/45 hover:bg-emerald-400/22 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {isImporting ? 'Importing…' : 'Build Database'}
                </button>
              </div>

              {error ? (
                <div className="mt-5 rounded-[22px] border border-red-400/25 bg-red-500/10 p-4 text-sm leading-7 text-red-100/90">
                  {error}
                </div>
              ) : null}

              {importResult ? (
                <div className="mt-5 rounded-[22px] border border-emerald-300/25 bg-emerald-400/10 p-4 text-sm leading-7 text-emerald-100/90">
                  {importResult}
                </div>
              ) : null}
            </section>

            <section className="rounded-[28px] border border-white/8 bg-white/[0.035] p-6">
              <div className="mb-4 text-[11px] font-black uppercase tracking-[0.24em] text-cyan-300/80">
                What Happens
              </div>
              <ol className="space-y-4 text-sm leading-7 text-white/72">
                <li>1. 64Box exports the MDB tables to CSV on this machine.</li>
                <li>2. The app imports those CSVs into a local optimized SQLite database.</li>
                <li>3. Search indexes, cover lookup, and support tables are created automatically.</li>
                <li>4. The normal library UI starts once the database is ready.</li>
              </ol>

              <div className="mt-6 rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-white/38">Target SQLite Path</div>
                <div className="mt-2 break-all text-sm leading-7 text-white/76">{dbPath}</div>
              </div>

              <p className="mt-6 text-sm leading-7 text-white/55">
                If export fails, install the Microsoft Access Database Engine and try again.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
