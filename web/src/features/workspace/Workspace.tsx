import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  LayoutGrid,
  ListChecks,
  Send,
  FileDown,
  Calendar,
  Moon,
  LayoutDashboard,
} from "lucide-react";
import type { MeetingWithItems } from "../../lib/types";
import { useHealth, useMeetings } from "../../lib/hooks";
import { useBoard } from "../board/useBoard";
import { useDashboard } from "../dashboard/useDashboard";
import { api } from "../../lib/api";
import { useTheme } from "../../lib/theme";
import { navigate, useRoute } from "../../lib/router";
import { AppBar } from "../../components/layout/AppBar";
import { HistorySidebar } from "../history/HistorySidebar";
import { SubmitView } from "../submit/SubmitView";
import { ReviewView } from "../review/ReviewView";
import { BoardView } from "../board/BoardView";
import { DashboardView } from "../dashboard/DashboardView";
import {
  CommandPalette,
  type CommandAction,
} from "../../components/ui/CommandPalette";

type View = "board" | "submit" | "review" | "dashboard";

export function Workspace() {
  const route = useRoute();
  const health = useHealth();
  const { toggle } = useTheme();
  const { meetings, loading: meetingsLoading, refresh } = useMeetings();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<View>(route === "/dashboard" ? "dashboard" : route === "/new" ? "submit" : "board");
  const [paletteOpen, setPaletteOpen] = useState(false);

  const board = useBoard(selectedId);
  const dashboard = useDashboard();

  // Route → view. Transient states (review) are set directly and not overridden
  // because this effect only fires when the hash route actually changes.
  useEffect(() => {
    if (route === "/dashboard") setView("dashboard");
    else if (route === "/new") setView("submit");
    else if (route === "/app") setView("board");
  }, [route]);

  // Auto-select the most recent meeting once history loads.
  const firstMeetingId = meetings[0]?.id ?? null;
  useEffect(() => {
    if (!selectedId && firstMeetingId) setSelectedId(firstMeetingId);
  }, [selectedId, firstMeetingId]);

  // Keep the dashboard fresh whenever it's opened.
  const refreshDashboard = dashboard.refresh;
  useEffect(() => {
    if (view === "dashboard") void refreshDashboard();
  }, [view, refreshDashboard]);

  const onCreated = async (meeting: MeetingWithItems) => {
    await refresh();
    void dashboard.refresh();
    setSelectedId(meeting.id);
    const needsReview = meeting.actionItems.some((i) => !i.confirmed);
    // Stay on /new hash; set the transient review view directly.
    setView(needsReview ? "review" : "board");
    if (!needsReview) navigate("/app");
  };

  const onSelectMeeting = (id: string) => {
    setSelectedId(id);
    setView("board");
    navigate("/app");
  };

  const goBoard = () => {
    setView("board");
    navigate("/app");
  };

  const actions: CommandAction[] = useMemo(() => {
    const base: CommandAction[] = [
      { id: "new", label: "New meeting", icon: Plus, group: "Navigate", perform: () => navigate("/new") },
      { id: "board", label: "Go to board", icon: LayoutGrid, group: "Navigate", perform: goBoard },
      { id: "dash", label: "Go to dashboard", icon: LayoutDashboard, group: "Navigate", perform: () => navigate("/dashboard") },
      { id: "home", label: "Back to home", icon: LayoutGrid, group: "Navigate", perform: () => navigate("/") },
      { id: "theme", label: "Toggle theme", icon: Moon, group: "General", perform: toggle },
    ];
    if (board.meeting) {
      base.push(
        { id: "review", label: "Review items", icon: ListChecks, group: "Meeting", perform: () => setView("review") },
        { id: "followup", label: "Draft follow-up", icon: Send, group: "Meeting", perform: () => window.dispatchEvent(new CustomEvent("signal:followup")) },
        { id: "md", label: "Export as Markdown", icon: FileDown, group: "Meeting", perform: () => window.open(api.exportMarkdownUrl(board.meeting!.id), "_blank") },
        { id: "ics", label: "Export calendar (.ics)", icon: Calendar, group: "Meeting", perform: () => window.open(api.exportIcsUrl(board.meeting!.id), "_blank") }
      );
    }
    return base;
  }, [board.meeting, toggle]);

  const activeSection = view === "dashboard" ? "dashboard" : "board";

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-text">
      <HistorySidebar
        meetings={meetings}
        loading={meetingsLoading}
        selectedId={selectedId}
        activeSection={activeSection}
        onSelect={onSelectMeeting}
        onNew={() => navigate("/new")}
        onDashboard={() => navigate("/dashboard")}
        onBoard={goBoard}
        onHome={() => navigate("/")}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppBar health={health} onOpenPalette={() => setPaletteOpen(true)} />

        <main className="min-h-0 flex-1 overflow-hidden">
          {view === "submit" && <SubmitView onCreated={onCreated} />}
          {view === "review" && <ReviewView board={board} onDone={goBoard} />}
          {view === "dashboard" && (
            <DashboardView
              data={dashboard}
              onOpenMeeting={onSelectMeeting}
              onNew={() => navigate("/new")}
            />
          )}
          {view === "board" && (
            <BoardView
              board={board}
              githubEnabled={!!health?.githubEnabled}
              onReview={() => setView("review")}
            />
          )}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} actions={actions} />
    </div>
  );
}
