import { useEffect, useMemo, useRef, useState } from "react";
import {
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    closestCorners,
    useSensor,
    useSensors,
    type Announcements,
    type DragEndEvent,
    type DragOverEvent,
    type DragStartEvent,
    type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { ActionItem, Status } from "../../../lib/types";
import { STATUS_LABELS, STATUS_ORDER } from "../../../lib/types";

type Containers = Record<Status, string[]>;

function group(items: ActionItem[]): Containers {
    const g: Containers = { open: [], in_progress: [], done: [] };
    for (const i of items) g[i.status].push(i.id);
    return g;
}

const isStatus = (id: UniqueIdentifier | undefined): id is Status =>
    id === "open" || id === "in_progress" || id === "done";

/**
 * Encapsulates multi-column kanban drag-and-drop:
 *  - live cross-column preview (cards reflow as you drag),
 *  - keyboard + mouse + touch sensors,
 *  - screen-reader announcements,
 *  - persists status changes via `onCommitStatus` on drop.
 */
export function useKanbanDnd(
    items: ActionItem[],
    onCommitStatus: (id: string, status: Status) => void
) {
    const [containers, setContainers] = useState<Containers>(() => group(items));
    const [activeId, setActiveId] = useState<string | null>(null);
    const [overColumn, setOverColumn] = useState<Status | null>(null);
    const [overId, setOverId] = useState<string | null>(null);
    const activeRef = useRef<string | null>(null);

    const itemsById = useMemo(() => {
        const m = new Map<string, ActionItem>();
        for (const i of items) m.set(i.id, i);
        return m;
    }, [items]);

    // Rebuild containers from source items whenever the data changes and we are
    // not mid-drag (keeps optimistic status updates in sync).
    const signature = items.map((i) => `${i.id}:${i.status}`).join(",");
    useEffect(() => {
        if (!activeRef.current) setContainers(group(items));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signature]);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const findContainer = (id: UniqueIdentifier | null): Status | null => {
        if (id == null) return null;
        if (isStatus(id)) return id;
        return (Object.keys(containers) as Status[]).find((s) =>
            containers[s].includes(String(id))
        ) ?? null;
    };

    const onDragStart = (e: DragStartEvent) => {
        activeRef.current = String(e.active.id);
        setActiveId(String(e.active.id));
        setOverColumn(findContainer(e.active.id));
    };

    const onDragOver = (e: DragOverEvent) => {
        const active = String(e.active.id);
        const over = e.over?.id;
        if (over == null) return;
        setOverId(isStatus(over) ? null : String(over));
        const from = findContainer(active);
        const to = findContainer(over);
        if (!from || !to) return;
        setOverColumn(to);
        if (from === to) return;

        setContainers((prev) => {
            const next: Containers = { ...prev, [from]: [...prev[from]], [to]: [...prev[to]] };
            next[from] = next[from].filter((x) => x !== active);
            const overIndex = isStatus(over)
                ? next[to].length
                : Math.max(0, next[to].indexOf(String(over)));
            next[to].splice(overIndex, 0, active);
            return next;
        });
    };

    const onDragEnd = (e: DragEndEvent) => {
        const active = String(e.active.id);
        const over = e.over?.id;
        const originalStatus = itemsById.get(active)?.status ?? null;
        const target = findContainer(active); // active already moved into target during dragOver

        if (over != null && target) {
            setContainers((prev) => {
                if (isStatus(over)) return prev;
                const list = prev[target];
                const oldIndex = list.indexOf(active);
                const newIndex = list.indexOf(String(over));
                if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return prev;
                return { ...prev, [target]: arrayMove(list, oldIndex, newIndex) };
            });
        }

        activeRef.current = null;
        setActiveId(null);
        setOverColumn(null);
        setOverId(null);

        if (target && originalStatus && target !== originalStatus) {
            onCommitStatus(active, target);
        }
    };

    const onDragCancel = () => {
        activeRef.current = null;
        setActiveId(null);
        setOverColumn(null);
        setOverId(null);
        setContainers(group(items)); // revert preview
    };

    const activeItem = activeId ? itemsById.get(activeId) ?? null : null;

    const announcements: Announcements = {
        onDragStart: ({ active }) =>
            `Picked up task ${itemsById.get(String(active.id))?.title ?? ""}.`,
        onDragOver: ({ over }) =>
            over && isStatus(over.id)
                ? `Over ${STATUS_LABELS[over.id]} column.`
                : "",
        onDragEnd: ({ active }) => {
            const s = findContainer(active.id);
            return s
                ? `Dropped ${itemsById.get(String(active.id))?.title ?? ""} in ${STATUS_LABELS[s]}.`
                : "Dropped.";
        },
        onDragCancel: () => "Drag cancelled.",
    };

    return {
        sensors,
        collisionDetection: closestCorners,
        containers,
        itemsById,
        activeId,
        activeItem,
        overColumn,
        overId,
        onDragStart,
        onDragOver,
        onDragEnd,
        onDragCancel,
        announcements,
        columns: STATUS_ORDER,
    };
}
