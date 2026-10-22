import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import DispatchBoard from "./pages/DispatchBoard";
import WorkOrders from "./pages/WorkOrders";
import Technicians from "./pages/Technicians";
import SimInventory from "./pages/SimInventory";
import MagicLinks from "./pages/MagicLinks";
import Settings from "./pages/Settings";
import { WorkOrderProvider } from "./context/WorkOrderContext";

export default function AtlasDashboard() {
  return (
    <WorkOrderProvider>
      <div className="flex h-dvh overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#121212] dark:text-white">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <Routes>
              <Route path="/" element={<DispatchBoard />} />
              <Route path="/work-orders" element={<WorkOrders />} />
              <Route path="/technicians" element={<Technicians />} />
              <Route path="/sim-inventory" element={<SimInventory />} />
              <Route path="/magic-links" element={<MagicLinks />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
    </WorkOrderProvider>
  );
}
