import {
  LayoutDashboard,
  Columns3,
  BarChart3,
  Settings,
  Search,
  Bell,
  FolderKanban,
  ListTodo,
  Activity,
  Sparkles,
  ArrowUpRight,
  Plus,
  TrendingUp,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Kanban", icon: Columns3, active: false },
  { label: "Team Metrics", icon: BarChart3, active: false },
  { label: "Settings", icon: Settings, active: false },
];

const kpis = [
  {
    label: "Active Projects",
    value: "24",
    delta: "+3 this week",
    icon: FolderKanban,
  },
  {
    label: "Tasks Pending",
    value: "128",
    delta: "-12 vs last week",
    icon: ListTodo,
  },
  {
    label: "System Health",
    value: "99.8%",
    delta: "All systems operational",
    icon: Activity,
  },
];

const columns = [
  {
    title: "To Do",
    count: 4,
    cards: [
      {
        title: "Redesign onboarding flow",
        tag: "Design",
        tagColor: "text-sky-400",
      },
      {
        title: "API rate limiting",
        tag: "Backend",
        tagColor: "text-emerald-400",
      },
    ],
  },
  {
    title: "In Progress",
    count: 3,
    cards: [
      {
        title: "Q3 analytics dashboard",
        tag: "Data",
        tagColor: "text-violet-400",
      },
      {
        title: "Mobile push notifications",
        tag: "Mobile",
        tagColor: "text-amber-400",
      },
    ],
  },
  {
    title: "Review",
    count: 2,
    cards: [
      { title: "Billing migration", tag: "Finance", tagColor: "text-rose-400" },
    ],
  },
];

const insights = [
  {
    title: "Resource reallocation",
    body: "3 team members are over capacity this sprint. Consider redistributing 5 tasks to balance workload.",
  },
  {
    title: "Deadline risk detected",
    body: "The 'Billing migration' project is trending 2 days behind. Prioritize the review stage to stay on track.",
  },
  {
    title: "Efficiency win",
    body: "Automating status reports could save your team ~4 hours weekly based on recent activity patterns.",
  },
];

function Sidebar() {
  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex items-center gap-2 px-6 h-16 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
          <span className="text-primary-foreground font-bold text-lg leading-none">
            A
          </span>
        </div>
        <span className="text-lg font-semibold tracking-tight text-foreground">
          Atlas
        </span>
      </div>
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map((item) => (
          <a
            key={item.label}
            href="#"
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
              item.active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </a>
        ))}
      </nav>
      <div className="mt-auto p-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">Pro Plan</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Unlock advanced metrics and unlimited AI insights.
          </p>
          <button className="mt-3 w-full rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
            Upgrade
          </button>
        </div>
      </div>
    </aside>
  );
}

function Header() {
  return (
    <header className="flex items-center gap-4 h-16 shrink-0 border-b border-border px-4 md:px-6">
      <div className="lg:hidden flex h-8 w-8 items-center justify-center rounded-md bg-primary">
        <span className="text-primary-foreground font-bold leading-none">
          A
        </span>
      </div>
      <div className="relative flex-1 max-w-xl mx-auto">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search projects, tasks, or people..."
          aria-label="Search"
          className="w-full rounded-md border border-border bg-secondary py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
        </button>
        <img
          src="/professional-avatar.png"
          alt="Your profile"
          className="h-9 w-9 rounded-full border border-border object-cover"
        />
      </div>
    </header>
  );
}

function KpiCard({ kpi }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{kpi.label}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary">
          <kpi.icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
        {kpi.value}
      </p>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <TrendingUp className="h-3 w-3 text-primary" />
        {kpi.delta}
      </p>
    </div>
  );
}

function ProjectsBoard() {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Project Overview
          </h2>
          <p className="text-xs text-muted-foreground">
            Quick look at your active workflow
          </p>
        </div>
        <a
          href="#"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View board
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {columns.map((col) => (
          <div
            key={col.title}
            className="rounded-lg border border-border bg-background/40 p-3"
          >
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-medium text-foreground">
                {col.title}
              </span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                {col.count}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {col.cards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-md border border-border bg-card p-3 transition-colors hover:border-primary/50"
                >
                  <span className={`text-[11px] font-medium ${card.tagColor}`}>
                    {card.tag}
                  </span>
                  <p className="mt-1 text-sm text-foreground leading-snug">
                    {card.title}
                  </p>
                </div>
              ))}
              <button className="flex items-center justify-center gap-1 rounded-md border border-dashed border-border py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Plus className="h-3.5 w-3.5" />
                Add task
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AiInsights() {
  return (
    <aside className="rounded-xl border border-border border-t-2 border-t-primary bg-card p-5">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Atlas AI Insights
          </h2>
          <p className="text-[11px] text-muted-foreground">
            AI-generated optimizations
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {insights.map((insight) => (
          <div
            key={insight.title}
            className="rounded-lg border border-border bg-background/40 p-3"
          >
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <p className="text-sm font-medium text-foreground">
                {insight.title}
              </p>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              {insight.body}
            </p>
          </div>
        ))}
      </div>
      <button className="mt-4 w-full rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors">
        Generate more insights
      </button>
    </aside>
  );
}

export default function AtlasDashboard() {
  return (
    <div className="flex h-dvh overflow-hidden text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="flex flex-col gap-6 xl:flex-row">
            <div className="flex-1 flex flex-col gap-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-balance">
                    Welcome to Atlas
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Here&apos;s what&apos;s happening across your organization.
                  </p>
                </div>
                <button className="mt-3 sm:mt-0 flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
                  <Plus className="h-4 w-4" />
                  New Project
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {kpis.map((kpi) => (
                  <KpiCard key={kpi.label} kpi={kpi} />
                ))}
              </div>

              <ProjectsBoard />
            </div>

            <div className="w-full xl:w-80 xl:shrink-0">
              <AiInsights />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
