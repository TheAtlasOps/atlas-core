import { Sparkles, ArrowUpRight, Plus } from "lucide-react";
import KpiGrid from "../components/layout/KpiGrid";

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

export default function Dashboard() {
  return (
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

        <KpiGrid />

        <ProjectsBoard />
      </div>

      <div className="w-full xl:w-80 xl:shrink-0">
        <AiInsights />
      </div>
    </div>
  );
}
