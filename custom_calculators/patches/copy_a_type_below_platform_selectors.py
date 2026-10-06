import frappe

DOCTYPE = "Cages - Commercial Layer - A Type"


def execute():
	"""Curtain Below Platform used to read the Side Curtain tab's Curtain Type and GSM.

	It now has its own selectors, so copy the old values into them for existing records
	that have Below Platform ticked (idempotent: only fills blanks).
	"""
	try:
		if not frappe.db.exists("DocType", DOCTYPE):
			return

		if not (frappe.db.has_column(DOCTYPE, "curtain_type_cbp") and frappe.db.has_column(DOCTYPE, "gsm_cbp")):
			return

		frappe.db.sql(
			"""
			UPDATE `tabCages - Commercial Layer - A Type`
			SET
				curtain_type_cbp = IFNULL(NULLIF(curtain_type, ''), 'HDPE'),
				gsm_cbp = gsm
			WHERE curtain_below_platform = 1
				AND IFNULL(gsm_cbp, '') = ''
				AND IFNULL(gsm, '') != ''
			"""
		)
	except Exception:
		# never block bench migrate over data copy; the values can be chosen by hand
		frappe.log_error(
			title="copy_a_type_below_platform_selectors failed",
			message=frappe.get_traceback(),
		)
