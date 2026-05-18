"""
Load Nexus agent DocType fixtures and build Frappe seed scripts for provisioning.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

# Custom fields added when Agent Action Log already exists (older tenants).
AGENT_ACTION_LOG_CUSTOM_FIELDS: list[dict[str, Any]] = [
    {"fieldname": "tool_name", "label": "Tool Name", "fieldtype": "Data", "insert_after": "tenant"},
    {"fieldname": "action", "label": "Action", "fieldtype": "Data", "insert_after": "tool_name"},
    {"fieldname": "created_by", "label": "Created By", "fieldtype": "Data", "insert_after": "triggered_by"},
    {"fieldname": "dry_run", "label": "Dry Run Preview", "fieldtype": "Long Text", "insert_after": "payload"},
    {"fieldname": "idempotency_key", "label": "Idempotency Key", "fieldtype": "Data", "insert_after": "result"},
    {"fieldname": "approved_at", "label": "Approved At", "fieldtype": "Datetime", "insert_after": "approved_by"},
    {"fieldname": "rejected_reason", "label": "Reject Reason", "fieldtype": "Small Text", "insert_after": "approved_at"},
    {"fieldname": "rejected_at", "label": "Rejected At", "fieldtype": "Datetime", "insert_after": "rejected_reason"},
    {"fieldname": "executed_at", "label": "Executed At", "fieldtype": "Datetime", "insert_after": "rejected_at"},
]

AGENT_DOCTYPE_FILES = ("agent_action_log.json", "agent_audit_log.json")


def frappe_config_dir() -> Path:
    here = Path(__file__).resolve().parent
    for candidate in (here / "frappe-config", here.parent / "frappe-config"):
        if (candidate / "agent_action_log.json").is_file():
            return candidate
    raise FileNotFoundError(
        "frappe-config directory not found (expected agent_action_log.json next to provisioning service)"
    )


def load_agent_doctype_fixtures() -> list[dict[str, Any]]:
    config_dir = frappe_config_dir()
    fixtures: list[dict[str, Any]] = []
    for filename in AGENT_DOCTYPE_FILES:
        path = config_dir / filename
        with path.open(encoding="utf-8") as handle:
            fixtures.append(json.load(handle))
    return fixtures


def build_seed_agent_doctypes_frappe_code(
    doctype_specs: list[dict[str, Any]],
    extra_custom_fields: list[dict[str, Any]],
) -> str:
    """Idempotent: import DocTypes if missing; upsert Custom Fields on Agent Action Log."""
    return f"""
import json
import frappe

doctype_specs = {json.dumps(doctype_specs)}
extra_fields = {json.dumps(extra_custom_fields)}
result = {{"imported": [], "skipped": [], "errors": [], "custom_fields": {{"created": [], "skipped": [], "errors": []}}}}

def upsert_custom_field(dt, spec):
    try:
        if frappe.db.exists("Custom Field", {{"dt": dt, "fieldname": spec["fieldname"]}}):
            result["custom_fields"]["skipped"].append(f"{{dt}}:{{spec['fieldname']}}")
            return
        doc = frappe.get_doc({{
            "doctype": "Custom Field",
            "dt": dt,
            "fieldname": spec["fieldname"],
            "label": spec.get("label") or spec["fieldname"],
            "fieldtype": spec.get("fieldtype") or "Data",
            "insert_after": spec.get("insert_after") or "status",
            "reqd": 0,
        }})
        doc.insert(ignore_permissions=True)
        result["custom_fields"]["created"].append(f"{{dt}}:{{spec['fieldname']}}")
    except Exception as exc:
        result["custom_fields"]["errors"].append(f"{{dt}}:{{spec.get('fieldname')}}: {{exc}}")

for spec in doctype_specs:
    name = spec.get("name")
    if not name:
        continue
    try:
        if frappe.db.exists("DocType", name):
            result["skipped"].append(name)
            if name == "Agent Action Log":
                for field_spec in extra_fields:
                    upsert_custom_field(name, field_spec)
            continue
        doc = frappe.get_doc(spec)
        doc.insert(ignore_permissions=True)
        result["imported"].append(name)
    except Exception as exc:
        result["errors"].append(f"{{name}}: {{exc}}")

frappe.db.commit()
for spec in doctype_specs:
    name = spec.get("name")
    if name and frappe.db.exists("DocType", name):
        frappe.clear_cache(doctype=name)

print(json.dumps(result, default=str))
"""
