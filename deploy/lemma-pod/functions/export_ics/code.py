#input_type_name: ExportIcsInput
#output_type_name: ExportIcsResult
#function_name: export_ics

"""export_ics — ported from packages/core/src/export.ts (toICS).
Renders action items that have a deadline as an iCalendar (.ics) VEVENT list."""

from datetime import datetime, timezone

from pydantic import BaseModel

from lemma_sdk import FunctionContext, Pod


class ExportIcsInput(BaseModel):
    meeting_id: str


class ExportIcsResult(BaseModel):
    ics: str


def _ics_escape(s: str) -> str:
    return (
        s.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
    )


def _ics_date(iso: str) -> str:
    return iso.replace("-", "")


async def export_ics(ctx: FunctionContext, data: ExportIcsInput) -> ExportIcsResult:
    pod = Pod.from_env()
    meeting = pod.table("meetings").get(data.meeting_id)
    items = (
        pod.records.list(
            "action_items",
            limit=500,
            filter=[{"field": "meeting_id", "op": "eq", "value": data.meeting_id}],
        )
        .to_dict()
        .get("items", [])
    )
    dated = [i for i in items if i.get("due_date")]

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Signal Meetings//Execution Operator//EN",
        "CALSCALE:GREGORIAN",
    ]
    title = meeting.get("title", "")
    for i in dated:
        follow_up = i.get("follow_up")
        desc = f"Owner: {i.get('owner', 'Unassigned')}. From meeting: {title}."
        if follow_up:
            desc += f" Next: {follow_up}"
        lines.append("BEGIN:VEVENT")
        lines.append(f"UID:{i['id']}@signal-meetings")
        lines.append(f"DTSTAMP:{stamp}")
        lines.append(f"DTSTART;VALUE=DATE:{_ics_date(i['due_date'])}")
        lines.append(f"SUMMARY:{_ics_escape(i.get('title', ''))}")
        lines.append(f"DESCRIPTION:{_ics_escape(desc)}")
        lines.append("END:VEVENT")
    lines.append("END:VCALENDAR")

    return ExportIcsResult(ics="\r\n".join(lines) + "\r\n")
