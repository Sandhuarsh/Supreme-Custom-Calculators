import frappe
from frappe.model.document import Document


class BroilerECHouse(Document):
	def before_save(self):
		# ==== Server Script: "Nipple Drinking" (Before Save) ====
		shed_length = self.shed_length or 0
		no_nipple_lines = self.no_nipple_lines or 0

		date = self.date or frappe.utils.today()

		pricing_rules = frappe.get_all(
			"Broiler EC House Pricing Rule",
			filters={
				"valid_from": ["<=", date],
				"valid_to": [">=", date]
			},
			fields=["name"],
			limit=1
		)

		rate_per_feet_nds = 0

		if pricing_rules:

			pr = frappe.get_doc(
				"Broiler EC House Pricing Rule",
				pricing_rules[0].name
			)

			for row in pr.nipple_drinking:

				if (
					shed_length >= (row.shed_length_start or 0)
					and shed_length <= (row.shed_length_end or 0)
				):

					rate_per_feet_nds = row.rate
					break

		self.rate_per_feet_nds = rate_per_feet_nds

		total_cost_of_nipple_drinkking_system = (
			rate_per_feet_nds * shed_length * no_nipple_lines
		)

		self.total_cost_of_nipple_drinkking_system = total_cost_of_nipple_drinkking_system

		if self.display_currency and self.display_currency != "INR":
			exchange_rate = self.exchange_rate or 1

			self.rate_per_feet_nds = rate_per_feet_nds / exchange_rate

			self.total_cost_of_nipple_drinkking_system = (
				total_cost_of_nipple_drinkking_system / exchange_rate
			)

		# ==== Server Script: "Pan Feeding" (Before Save) ====
		shed_length = self.shed_length or 0
		no_of_pan_feeding_lines_pfs = self.no_of_pan_feeding_lines_pfs or 0

		date = self.date or frappe.utils.today()

		pricing_rules = frappe.get_all(
			"Broiler EC House Pricing Rule",
			filters={
				"valid_from": ["<=", date],
				"valid_to": [">=", date]
			},
			fields=["name"],
			limit=1
		)

		rate_per_feet_pfs = 0

		if pricing_rules:

			pr = frappe.get_doc(
				"Broiler EC House Pricing Rule",
				pricing_rules[0].name
			)

			for row in pr.pan_feeding:

				if (
					shed_length >= (row.shed_length_start or 0)
					and shed_length <= (row.shed_length_end or 0)
				):

					rate_per_feet_pfs = row.rate
					break

		self.rate_per_feet_pfs = rate_per_feet_pfs

		total_cost_of_pan_feeding_system_pfs = rate_per_feet_pfs * shed_length * no_of_pan_feeding_lines_pfs
		self.total_cost_of_pan_feeding_system_pfs = total_cost_of_pan_feeding_system_pfs

		if self.display_currency and self.display_currency != "INR":
			exchange_rate = self.exchange_rate or 1

			self.rate_per_feet_pfs = rate_per_feet_pfs / exchange_rate

			self.total_cost_of_pan_feeding_system_pfs = (
				total_cost_of_pan_feeding_system_pfs / exchange_rate
			)

	def on_update(self):
		# ==== Server Script: "Feet To Mter Conversion" (After Save) ====
		rule = frappe.get_all(
			"Broiler EC House Pricing Rule",
			filters={
				"valid_from": ["<=", frappe.utils.today()],
				"valid_to": [">=", frappe.utils.today()]
			},
			fields=["feet_to_meter_conversion_factor"],
			limit=1
		)

		if rule:
			factor = frappe.utils.flt(rule[0].feet_to_meter_conversion_factor)

			self.db_set("shed_width_in_meter_copy", frappe.utils.flt(self.shed_width_in_feet) * factor)
			self.db_set("shed_length_in_meter_copy", frappe.utils.flt(self.shed_lengthin_feet) * factor)

			self.db_set("shed_length_meter_nps", frappe.utils.flt(self.shed_length_nps) * factor)
			self.db_set("shed_width_meter_nds", frappe.utils.flt(self.shed_width_nds) * factor)

			self.db_set("total_area_in_cubic_meter", frappe.utils.flt(self.total_area_in_cu_ft) * factor * factor * factor)

			self.db_set("shed_length_meter_ec", frappe.utils.flt(self.shed_lenght) * factor)
			self.db_set("shed_width_meter_ec", frappe.utils.flt(self.shed_widthq) * factor)
			self.db_set("total_area_square_meter", frappe.utils.flt(self.total_area) * factor * factor)

			self.db_set("system_length_meter", frappe.utils.flt(self.system_length) * factor)

			self.db_set("shedlength_meter", frappe.utils.flt(self.shed_length_cws) * factor)
			self.db_set("sideheight_meter", frappe.utils.flt(self.side_height_cws) * factor)

			self.db_set("shedmeter", frappe.utils.flt(self.shed_length_ech) * factor)
			self.db_set("shedheight_meetr", frappe.utils.flt(self.side_height_ech) * factor)

			self.db_set("shed_c_meter", frappe.utils.flt(self.shed_length_c) * factor)
			self.db_set("side_c_meter", frappe.utils.flt(self.side_height_c) * factor)

			self.db_set("shed_cc", frappe.utils.flt(self.shed_length_cc) * factor)
			self.db_set("side_cc", frappe.utils.flt(self.side_height_cc) * factor)

			self.db_set("shed_white", frappe.utils.flt(self.shed_size_wc) * factor)

			self.db_set("gutter_system_set_for_cooling_pads_in_meter", frappe.utils.flt(self.gutter_system_set_for_cooling_pads) * factor)

		else:
			pass
