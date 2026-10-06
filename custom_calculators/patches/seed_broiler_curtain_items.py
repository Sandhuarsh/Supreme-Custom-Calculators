import frappe

PARENT_DOCTYPE = "Broiler EC House Pricing Rule"

# single default item field on the Pricing Rule -> new item table field
CURTAIN_TABLES = {
	"side_curtain_vinching_system": "side_curtain_winching_items",
	"ceiling_curtain": "ceiling_curtain_items",
	"cooling_pad_curtain": "cooling_pad_curtain_items",
	"white_curtain": "white_curtain_items",
}


def execute():
	"""Copy each Pricing Rule's existing single curtain item into its new item table (idempotent)."""
	if not frappe.db.exists("DocType", PARENT_DOCTYPE) or not frappe.db.exists("DocType", "Curtain Item"):
		return

	for parent in frappe.get_all(PARENT_DOCTYPE, pluck="name"):
		for source_field, table_field in CURTAIN_TABLES.items():
			try:
				item = frappe.db.get_value(PARENT_DOCTYPE, parent, source_field)
				if not item:
					continue

				filters = {"parent": parent, "parentfield": table_field}
				if frappe.db.exists("Curtain Item", {**filters, "item": item}):
					continue

				frappe.get_doc({
					"doctype": "Curtain Item",
					"parent": parent,
					"parenttype": PARENT_DOCTYPE,
					"parentfield": table_field,
					"idx": frappe.db.count("Curtain Item", filters) + 1,
					"item": item,
				}).insert(ignore_permissions=True, ignore_links=True)
			except Exception:
				# never block bench migrate over seed data; the item can be added by hand
				frappe.log_error(
					title=f"seed_broiler_curtain_items failed for {parent} / {table_field}",
					message=frappe.get_traceback(),
				)
