import frappe
from frappe.model.document import Document


class CagesCommercialLayerAType(Document):
	def on_update(self):
		# ==== Server Script: "A Type - Feet To Meter Conversion" (After Save) ====
		rule = frappe.get_all(
			"Cages - Commercial Layer - A Type Pricing Rule",
			filters={"valid_from": ["<=", frappe.utils.today()], "valid_to": [">=", frappe.utils.today()]},
			fields=["feet_to_meter_conversion_factor"],
			limit=1,
		)
		factor = frappe.utils.flt(rule[0].feet_to_meter_conversion_factor) if rule else 0.0
		if not factor:
			factor = 0.3048
		flt = frappe.utils.flt
		self.db_set("shed_length_in_meter", flt(self.get("shed_lenght")) * factor)
		self.db_set("shed_width_in_meter", flt(self.get("shed_width")) * factor)
		self.db_set("side_height_meter", flt(self.get("side_height")) * factor)
		self.db_set("average_height_meter", flt(self.get("average_height")) * factor)
		self.db_set("centre_height_meter", flt(self.get("centre_height")) * factor)
		self.db_set("shed_size_length_meter", flt(self.get("shed_size_length")) * factor)
		self.db_set("shed_size_width_meter", flt(self.get("shed_size_width")) * factor)
		self.db_set("cage_length_meter", flt(self.get("cage_length")) * factor)
		self.db_set("row_width_meter", flt(self.get("row_width")) * factor)
		self.db_set("calculated_width_meter", flt(self.get("calculated_width")) * factor)
		self.db_set("reduce_from_shed_length_meter", flt(self.get("reduce_from_shed_length")) * factor)
		self.db_set("running_length_meter", flt(self.get("running_length_feet")) * factor)
		self.db_set("shed_size_scrapper_meter", flt(self.get("shed_size_scrapper")) * factor)
		self.db_set("shed_length_cws_meter", flt(self.get("shed_length_cws")) * factor)
		self.db_set("side_height_cws_meter", flt(self.get("side_height_cws")) * factor)
		self.db_set("shed_length_ech_meter", flt(self.get("shed_length_ech")) * factor)
		self.db_set("side_height_ech_meter", flt(self.get("side_height_ech")) * factor)
		self.db_set("shed_length_c_meter", flt(self.get("shed_length_c")) * factor)
		self.db_set("side_height_c_meter", flt(self.get("side_height_c")) * factor)
		self.db_set("shed_length_cc_meter", flt(self.get("shed_length_cc")) * factor)
		self.db_set("side_height_cc_meter", flt(self.get("side_height_cc")) * factor)
		self.db_set("height_of_cp_meter", flt(self.get("height_of_cp")) * factor)
		self.db_set("shed_size_wc_meter", flt(self.get("shed_size_wc")) * factor)
		self.db_set("height_of_wc_meter", flt(self.get("height_of_wc")) * factor)
		self.db_set("shed_length_cbp_meter", flt(self.get("shed_length_cbp")) * factor)
		self.db_set("shed_width_cpc_meter", flt(self.get("shed_width_cpc")) * factor)
