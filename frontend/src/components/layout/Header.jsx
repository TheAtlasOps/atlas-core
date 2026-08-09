import { Search, Bell } from "lucide-react";

export default function Header() {
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
