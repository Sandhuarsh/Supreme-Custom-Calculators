import frappe
from frappe.model.document import Document


class CagesCommercialLayerHTypeBroodingCumGrowing(Document):
	def on_update(self):
		# ==== Server Script: "Feet to Meter -BCG" (After Save) ====
		rule = frappe.get_all(
			"Commercial Layer BCG Pricing Rule",
			filters={
				"valid_from": ["<=", frappe.utils.today()],
				"valid_to": [">=", frappe.utils.today()]
			},
			fields=["feet_to_meter_conversion_factor"],
			limit=1
		)

		if rule:
			factor = frappe.utils.flt(rule[0].feet_to_meter_conversion_factor)

			self.db_set("shed_lc_ec", frappe.utils.flt(self.shed_lenght) * factor)
			self.db_set("shed_wc_ec", frappe.utils.flt(self.shed_widthf) * factor)

			self.db_set("avg_hc_ec", frappe.utils.flt(self.average_height) * factor)

			self.db_set("centre_hc_ec", frappe.utils.flt(self.centre_height) * factor)
			self.db_set("side_hc_ec", frappe.utils.flt(self.side_height) * factor)
			self.db_set("avg_hc_ec", frappe.utils.flt(self.average_height) * factor)

			self.db_set("total_area_in_cubic_meter", frappe.utils.flt(self.total_area_in_cu_ft) * factor * factor * factor)
			self.db_set("total_cfm_cubic_meter_per_minute", frappe.utils.flt(self.total_cfm) * factor * factor * factor)

			self.db_set("total_square_meter", frappe.utils.flt(self.total_sqft) * factor * factor)
			self.db_set("pad_area_in_square_meter", frappe.utils.flt(self.pad_area_in_sqft) * factor * factor)

			# self.db_set("two_tier_female_section_meter", frappe.utils.flt(self.two_tier_female_section_feet) * factor)
			# self.db_set("three_tier_female_section_meter", frappe.utils.flt(self.three_tier_female_section_feet) * factor)

			# self.db_set("shed_cc", frappe.utils.flt(self.shed_length_cc) * factor)
			# self.db_set("side_cc", frappe.utils.flt(self.side_height_cc) * factor)

			# self.db_set("shed_white", frappe.utils.flt(self.shed_size_wc) * factor)

			# self.db_set("shed_below", frappe.utils.flt(self.shed_length_cbp) * factor)
			# self.db_set("side_below", frappe.utils.flt(self.shed_width_cpc) * factor)

			self.db_set("gutter_system_set_for_cooling_padsin_meter", frappe.utils.flt(self.gutter_system_set_for_cooling_pads) * factor)

		else:
			pass
