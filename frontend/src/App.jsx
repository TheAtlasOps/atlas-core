import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import Dashboard from "./pages/Dashboard";
import Kanban from "./pages/Kanban";
import Settings from "./pages/Settings";

export default function AtlasDashboard() {
  return (
    <div className="flex h-dvh overflow-hidden text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/kanban" element={<Kanban />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
