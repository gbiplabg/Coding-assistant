"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Sidebar } from "./Sidebar";
import { ChatPanel } from "./ChatPanel";
import { SettingsModal } from "./SettingsModal";

export default function Workspace() {
  const { hydrated, anthropicKey, openaiKey } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // On first ever load with no key at all, nudge the user to Settings.
  useEffect(() => {
    if (hydrated && !anthropicKey && !openaiKey) setSettingsOpen(true);
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <ChatPanel
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
