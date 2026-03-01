export default function Home() {
  return (
    <div className="min-h-screen bg-surface-primary p-8 font-sans md:p-12">
      <div className="mx-auto max-w-6xl space-y-16">
        {/* ── Header ── */}
        <header className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-text-title-primary">
            TMS Design System
          </h1>
          <p className="text-lg text-text-secondary">
            Design tokens preview — Colors, Typography, Spacing, Effects &amp;
            Animations
          </p>
        </header>

        {/* ════════════════════════════════
            1. COLOR PALETTE
        ════════════════════════════════ */}
        <section className="space-y-8">
          <h2 className="text-2xl font-semibold text-text-title-primary">
            1. Color Palette
          </h2>

          {/* Primary */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary">
              Primary
            </h3>
            <div className="grid grid-cols-5 gap-3 sm:grid-cols-10">
              {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map(
                (shade) => (
                  <div key={shade} className="space-y-1.5 text-center">
                    <div
                      className={`h-14 w-full rounded-lg bg-primary-${shade} shadow-sm`}
                      style={{
                        backgroundColor: `var(--color-primary-${shade})`,
                      }}
                    />
                    <span className="text-xs text-text-tertiary">{shade}</span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Secondary */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary">
              Secondary
            </h3>
            <div className="grid grid-cols-5 gap-3 sm:grid-cols-10">
              {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map(
                (shade) => (
                  <div key={shade} className="space-y-1.5 text-center">
                    <div
                      className="h-14 w-full rounded-lg shadow-sm"
                      style={{
                        backgroundColor: `var(--color-secondary-${shade})`,
                      }}
                    />
                    <span className="text-xs text-text-tertiary">{shade}</span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Accent */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary">
              Accent
            </h3>
            <div className="grid grid-cols-5 gap-3 sm:grid-cols-10">
              {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map(
                (shade) => (
                  <div key={shade} className="space-y-1.5 text-center">
                    <div
                      className="h-14 w-full rounded-lg shadow-sm"
                      style={{
                        backgroundColor: `var(--color-accent-${shade})`,
                      }}
                    />
                    <span className="text-xs text-text-tertiary">{shade}</span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Status Colors */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary">
              Status
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Success", token: "success" },
                { label: "Warning", token: "warning" },
                { label: "Error", token: "error" },
                { label: "Info", token: "info" },
              ].map(({ label, token }) => (
                <div key={token} className="space-y-2">
                  <p className="text-xs font-medium text-text-secondary">
                    {label}
                  </p>
                  <div className="flex gap-2">
                    <div
                      className="h-10 flex-1 rounded-md"
                      style={{
                        backgroundColor: `var(--color-${token}-light)`,
                      }}
                    />
                    <div
                      className="h-10 flex-1 rounded-md"
                      style={{ backgroundColor: `var(--color-${token})` }}
                    />
                    <div
                      className="h-10 flex-1 rounded-md"
                      style={{
                        backgroundColor: `var(--color-${token}-dark)`,
                      }}
                    />
                  </div>
                  <div className="flex gap-2 text-center text-[10px] text-text-muted">
                    <span className="flex-1">Light</span>
                    <span className="flex-1">Default</span>
                    <span className="flex-1">Dark</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Surfaces */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary">
              Surfaces
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              {[
                "surface-primary",
                "surface-secondary",
                "surface-tertiary",
                "surface-elevated",
                "surface-contrast",
              ].map((token) => (
                <div key={token} className="space-y-1.5 text-center">
                  <div
                    className="h-14 w-full rounded-lg border border-border-default shadow-sm"
                    style={{ backgroundColor: `var(--color-${token})` }}
                  />
                  <span className="text-xs text-text-tertiary">{token}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════
            2. TYPOGRAPHY
        ════════════════════════════════ */}
        <section className="space-y-8">
          <h2 className="text-2xl font-semibold text-text-title-primary">
            2. Typography
          </h2>

          <div className="space-y-6 rounded-xl border border-border-default bg-surface-secondary p-6">
            {[
              { label: "Display / 5xl", size: "text-5xl", weight: "font-bold" },
              { label: "H1 / 4xl", size: "text-4xl", weight: "font-bold" },
              { label: "H2 / 3xl", size: "text-3xl", weight: "font-semibold" },
              { label: "H3 / 2xl", size: "text-2xl", weight: "font-semibold" },
              { label: "H4 / xl", size: "text-xl", weight: "font-medium" },
              { label: "H5 / lg", size: "text-lg", weight: "font-medium" },
              { label: "Body / base", size: "text-base", weight: "font-normal" },
              { label: "Small / sm", size: "text-sm", weight: "font-normal" },
              { label: "Caption / xs", size: "text-xs", weight: "font-normal" },
            ].map(({ label, size, weight }) => (
              <div
                key={label}
                className="flex flex-col gap-1 border-b border-border-subtle pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-6"
              >
                <span className="w-40 shrink-0 text-xs font-medium uppercase tracking-wider text-text-tertiary">
                  {label}
                </span>
                <p className={`${size} ${weight} text-text-primary`}>
                  The quick brown fox jumps
                </p>
              </div>
            ))}
          </div>

          {/* Font weights */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary">
              Font Weights
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Light", weight: "font-light" },
                { label: "Regular", weight: "font-normal" },
                { label: "Medium", weight: "font-medium" },
                { label: "Semibold", weight: "font-semibold" },
                { label: "Bold", weight: "font-bold" },
                { label: "Extrabold", weight: "font-extrabold" },
              ].map(({ label, weight }) => (
                <div
                  key={label}
                  className="rounded-lg border border-border-default bg-surface-elevated p-4"
                >
                  <p className={`text-lg ${weight} text-text-primary`}>
                    {label}
                  </p>
                  <span className="text-xs text-text-muted">{weight}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════
            3. SPACING & RADIUS
        ════════════════════════════════ */}
        <section className="space-y-8">
          <h2 className="text-2xl font-semibold text-text-title-primary">
            3. Spacing &amp; Border Radius
          </h2>

          {/* Spacing scale */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary">
              Spacing Scale (8px grid)
            </h3>
            <div className="space-y-2">
              {[
                { label: "4px", token: "--space-1" },
                { label: "8px", token: "--space-2" },
                { label: "12px", token: "--space-3" },
                { label: "16px", token: "--space-4" },
                { label: "24px", token: "--space-6" },
                { label: "32px", token: "--space-8" },
                { label: "48px", token: "--space-12" },
                { label: "64px", token: "--space-16" },
              ].map(({ label, token }) => (
                <div key={token} className="flex items-center gap-4">
                  <span className="w-16 text-right text-xs text-text-tertiary">
                    {label}
                  </span>
                  <div
                    className="h-4 rounded-sm bg-primary-400"
                    style={{ width: `var(${token})` }}
                  />
                  <span className="text-xs text-text-muted">{token}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Border radius */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary">
              Border Radius
            </h3>
            <div className="flex flex-wrap gap-4">
              {[
                { label: "sm", token: "--radius-sm" },
                { label: "md", token: "--radius-md" },
                { label: "lg", token: "--radius-lg" },
                { label: "xl", token: "--radius-xl" },
                { label: "2xl", token: "--radius-2xl" },
                { label: "full", token: "--radius-full" },
              ].map(({ label, token }) => (
                <div key={token} className="space-y-1.5 text-center">
                  <div
                    className="flex h-16 w-16 items-center justify-center border-2 border-primary-400 bg-primary-50"
                    style={{ borderRadius: `var(${token})` }}
                  >
                    <span className="text-[10px] font-medium text-primary-700">
                      {label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════
            4. SHADOWS
        ════════════════════════════════ */}
        <section className="space-y-8">
          <h2 className="text-2xl font-semibold text-text-title-primary">
            4. Shadows
          </h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            {["xs", "sm", "md", "lg", "xl", "2xl"].map((size) => (
              <div
                key={size}
                className="flex h-24 items-center justify-center rounded-xl bg-surface-elevated"
                style={{ boxShadow: `var(--shadow-${size})` }}
              >
                <span className="text-sm font-medium text-text-secondary">
                  {size}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ════════════════════════════════
            5. ANIMATIONS
        ════════════════════════════════ */}
        <section className="space-y-8">
          <h2 className="text-2xl font-semibold text-text-title-primary">
            5. Animations
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[
              { label: "Fade In", cls: "animate-fade-in" },
              { label: "Slide Up", cls: "animate-slide-in-up" },
              { label: "Slide Down", cls: "animate-slide-in-down" },
              { label: "Scale In", cls: "animate-scale-in" },
              { label: "Spin Slow", cls: "animate-spin-slow" },
              { label: "Pulse Soft", cls: "animate-pulse-soft" },
              { label: "Shimmer", cls: "skeleton" },
            ].map(({ label, cls }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-3 rounded-xl border border-border-default bg-surface-secondary p-4"
              >
                <div
                  className={`h-12 w-12 rounded-lg bg-primary-500 ${cls}`}
                />
                <span className="text-xs font-medium text-text-secondary">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ════════════════════════════════
            6. BORDERS
        ════════════════════════════════ */}
        <section className="space-y-8">
          <h2 className="text-2xl font-semibold text-text-title-primary">
            6. Borders
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {[
              { label: "Default", token: "border-default" },
              { label: "Subtle", token: "border-subtle" },
              { label: "Brand", token: "border-brand" },
              { label: "Focused", token: "border-focused" },
              { label: "Hovered", token: "border-hovered" },
            ].map(({ label, token }) => (
              <div
                key={token}
                className="flex h-16 items-center justify-center rounded-lg border-2"
                style={{ borderColor: `var(--color-${token})` }}
              >
                <span className="text-xs font-medium text-text-secondary">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-border-default pt-8 pb-4">
          <p className="text-center text-sm text-text-muted">
            TMS Design System — All tokens synchronized with Tailwind CSS v4
          </p>
        </footer>
      </div>
    </div>
  );
}
