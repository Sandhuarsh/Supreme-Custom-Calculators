import math

import frappe
from frappe.model.document import Document


class CagesBroilerBreederHTypeLayerStage(Document):
	def before_save(self):
		# ==== Server Script: "CBB - H Type" (Before Save) ====
		if self.calculation_method == "Bird To Shed":

			def flt(val):
				try:
					return float(val or 0)
				except:
					return 0.0

			def ceil_safe(val):
				try:
					return math.ceil(val or 0)
				except:
					return 0

			def get_row_by_bird(rows, bird_name):
				for row in rows or []:
					if (row.get("bird") or "").strip().lower() == bird_name.strip().lower():
						return row
				return None

			male_row = get_row_by_bird(self.get("table_qxwc"), "Male")
			female_row = get_row_by_bird(self.get("table_qxwc"), "Female")

			male_front = flt(male_row.get("front")) if male_row else 0
			male_depth = flt(male_row.get("depth")) if male_row else 0
			male_birdsbox = flt(male_row.get("birdsbox")) if male_row else 0

			female_birdsbox = flt(female_row.get("birdsbox")) if female_row else 0

			female_front = flt(female_row.get("front")) if female_row else 0
			female_depth = flt(female_row.get("depth")) if female_row else 0

			male = flt(self.get("male"))
			female = flt(self.get("female"))
			rows = flt(self.get("rows"))
			tiers = flt(self.get("tiers"))

			if rows <= 0:
				frappe.throw("Rows must be greater than 0")

			safe_male_birdsbox = male_birdsbox or 1
			safe_rows = rows or 1

			self.birds_per_male_topmost_tier = male_birdsbox * 4

			self.no_of_birds_in_female_section_below_male_birds = (female_birdsbox * 4) * (tiers - 1)

			self.total_female_birds_in_female_section_all_tiers = (female_birdsbox * 4) * tiers

			val = male / safe_rows / (safe_male_birdsbox * 4)
			self.male_sec = int(val + 0.999999)

			self.section_width_male = male_front * 2 + 0.5

			self.section_width_female = female_front * 2 + 0.5

			self.total_no_of_male_birds_per_row = self.male_sec * self.birds_per_male_topmost_tier

			self.total_male_birds = self.total_no_of_male_birds_per_row * rows

			self.total_length_of_male_section = self.male_sec * self.section_width_male

			val2 = self.total_length_of_male_section / (self.section_width_female or 1)
			self.f_sec_below_the_m_sec = int(val2 + 0.999999)

			self.female_birds_below_male_sections_each_row = (
				self.f_sec_below_the_m_sec * self.no_of_birds_in_female_section_below_male_birds
			)

			self.total_female_birds_below_male_sections_all_rows = (
				self.female_birds_below_male_sections_each_row * rows
			)

			self.total_female_bird_in_female_tier = (
				female - self.total_female_birds_below_male_sections_all_rows
			)

			if self.total_female_bird_in_female_tier < 0:
				self.total_female_bird_in_female_tier = 0

			self.total_female_birds_in_each_row = self.total_female_bird_in_female_tier / safe_rows

			safe_female_capacity = self.total_female_birds_in_female_section_all_tiers or 1

			val3 = self.total_female_bird_in_female_tier / (safe_female_capacity * safe_rows)
			self.no_of_sections_with_all_female_birds_in_all_three_tiers = int(val3 + 0.999999)

			self.total_female_birds = (
				self.total_female_birds_below_male_sections_all_rows
				+ (
					self.no_of_sections_with_all_female_birds_in_all_three_tiers
					* self.total_female_birds_in_female_section_all_tiers
					* rows
				)
			)

			val6 = (self.male_sec * self.section_width_male) / self.section_width_female

			self.length_of_female_bird_sections_below_the_male_birds_sections = int(val6 + 0.999999)

			self.male_section_cage_length_per_row = self.male_sec * self.section_width_male

			self.full_female_section_cage_length_per_row = (
				self.no_of_sections_with_all_female_birds_in_all_three_tiers
				* self.section_width_female
			)

			self.total_cage_length_inch = (
				(
					self.length_of_female_bird_sections_below_the_male_birds_sections
					+ self.no_of_sections_with_all_female_birds_in_all_three_tiers
				)
				* self.section_width_female
			)

			val4 = self.total_cage_length_inch / 12
			self.final_cage_length_for_quotation_feet = round(val4)

			self.width_of_one_row = ((female_depth * 2) + 14) / 12

			self.total_space_for_all_rows = self.width_of_one_row * rows

			self.gap_between_two_rows = flt(self.get("gap_between_two_rows")) or 3.5

			self.no_of_gaps = rows + 1

			self.total_space_for_gaps = self.gap_between_two_rows * self.no_of_gaps

			val5 = self.total_space_for_all_rows + self.total_space_for_gaps
			self.final_shed_width = int(val5 + 0.999999)

			self.final_shed_lenght_for_quotation = (
				(self.final_cage_length_for_quotation_feet or 0)
				+ (self.added_length or 0)
			)

			if not male_row or not female_row:
				frappe.throw(
					"Please add both Male and Female rows in the Bird Configuration table before saving."
				)

		# ==== Server Script: "Shed To Bird" (Before Save) ====
		if self.calculation_method == "Shed To Bird":

			def flt(val):
				try:
					return float(val or 0)
				except:
					return 0.0

			def ceil_safe(val):
				try:
					return math.ceil(val or 0)
				except:
					return 0

			def get_row_by_bird(rows, bird_name):
				for row in rows or []:
					if (row.get("bird") or "").strip().lower() == bird_name.strip().lower():
						return row
				return None

			male_row = get_row_by_bird(self.get("table_qxwc"), "Male")
			female_row = get_row_by_bird(self.get("table_qxwc"), "Female")

			male_front = flt(male_row.get("front")) if male_row else 0
			male_depth = flt(male_row.get("depth")) if male_row else 0
			male_birdsbox = flt(male_row.get("birdsbox")) if male_row else 0

			female_birdsbox = flt(female_row.get("birdsbox")) if female_row else 0

			female_front = flt(female_row.get("front")) if female_row else 0
			female_depth = flt(female_row.get("depth")) if female_row else 0

			male = flt(self.get("male"))
			female = flt(self.get("female"))
			rows = flt(self.get("rows"))
			tiers = flt(self.get("tiers"))

			if rows <= 0:
				frappe.throw("Rows must be greater than 0")

			safe_male_birdsbox = male_birdsbox or 1
			safe_rows = rows or 1

			self.birds_per_male_topmost_tier = male_birdsbox * 4

			self.no_of_birds_in_female_section_below_male_birds = (
				(female_birdsbox * 4) * (tiers - 1)
			)

			self.total_female_birds_in_female_section_all_tiers = (
				(female_birdsbox * 4) * tiers
			)

			val = male / safe_rows / (safe_male_birdsbox * 4)
			self.male_sec = int(val + 0.999999)

			self.final_cage_length_for_quotation_feet = (
				flt(self.final_shed_lenght_for_quotation)
				- flt(self.added_length)
			)

			self.two_tier_female_section_feet = round(
				(self.final_cage_length_for_quotation_feet or 0) * 0.36
			)

			self.three_tier_female_section_feet = (
				(self.final_cage_length_for_quotation_feet or 0)
				- (self.two_tier_female_section_feet or 0)
			)

			self.three_tier_female_section_inch = (
				(self.three_tier_female_section_feet or 0) * 12
			)

			self.two_tier_female_section_inch = (
				(self.two_tier_female_section_feet or 0) * 12
			)

			section_width_male = (
				((male_front * 2) + 0.5) if male_front else 1
			)
			self.section_width_male = section_width_male

			section_width_female = (
				((female_front * 2) + 0.5) if female_front else 1
			)

			self.section_width_female = section_width_female

			self.no_of_sections_with_all_female_birds_in_all_three_tiers = round(
				(self.three_tier_female_section_inch or 0)
				/ section_width_female
			)

			self.total_female_birds_in_full_female_sections_in_all_rows = (
				(self.no_of_sections_with_all_female_birds_in_all_three_tiers or 0)
				* (self.total_female_birds_in_female_section_all_tiers or 0)
			)

			conv = (self.two_tier_female_sections_134_ft or 0) * 12

			self.f_sec_below_the_m_sec = round(
				(conv)
				/ section_width_female
			)

			self.total_female_birds_below_the_male_sections_in_all_rows = (
				(self.f_sec_below_the_m_sec or 0)
				* (self.no_of_birds_in_female_section_below_male_birds or 0)
			)

			self.total_female_bird_per_row = (
				(self.total_female_birds_in_full_female_sections_in_all_rows or 0)
				+ (self.total_female_birds_below_the_male_sections_in_all_rows or 0)
			)

			self.total_female_birds = (
				(self.total_female_bird_per_row or 0)
				* (rows or 0)
			)

			self.one_tier_male_sections_inch = (
				(self.two_tier_female_section_feet or 0) * 12
			)

			self.male_sec = round(
				(self.one_tier_male_sections_inch or 0)
				/ section_width_male
			)

			self.total_no_of_male_birds_per_row = (
				(self.male_sec or 0)
				* (self.birds_per_male_topmost_tier or 0)
			)

			self.total_male_birds = (
				(self.total_no_of_male_birds_per_row or 0)
				* (rows or 0)
			)

			if not male_row or not female_row:
				frappe.throw(
					"Please add both Male and Female rows in the Bird Configuration table before saving."
				)

	def on_update(self):
		# ==== Server Script: "Automatic feeding Price Calculation" (After Save) ====
		shed_length = self.final_shed_lenght_for_quotation or 0
		date = self.date or frappe.utils.today()

		self.shed_length_aft = shed_length

		pricing_rules = frappe.get_all(
			"Cage H Type Item Pricing Rule",
			filters={
				"valid_from": ["<=", date],
				"valid_to": [">=", date]
			},
			fields=["name"],
			limit=1
		)

		if pricing_rules:
			pr = frappe.get_doc("Cage H Type Item Pricing Rule", pricing_rules[0].name)

			per_row_cost = 0

			for row in pr.automatic_feeding_trolley_price_table:
				if shed_length >= row.shed_length_start and shed_length <= row.shed_length_end:
					per_row_cost = row.cost_per_row
					break

			rows = self.rows or 0
			total_cost = per_row_cost * rows

			if self.display_currency and self.display_currency != "INR":
				exchange_rate = self.exchange_rate or 1
				per_row_cost = per_row_cost / exchange_rate
				total_cost = total_cost / exchange_rate

			self.per_row_cost_2 = per_row_cost
			self.no_of_rows_in_1_shed_aft = rows
			self.cost_for_all_rows_aft = total_cost

		else:
			frappe.msgprint("No Pricing Rule found for selected date")

		# ==== Server Script: "Egg Collection Pricing Logic" (After Save) ====
		shed_length = self.final_shed_lenght_for_quotation or 0
		date = self.date or frappe.utils.today()

		self.shed_length_ec = shed_length

		pricing_rules = frappe.get_all(
			"Cage H Type Item Pricing Rule",
			filters={
				"valid_from": ["<=", date],
				"valid_to": [">=", date]
			},
			fields=["name"],
			limit=1
		)

		if pricing_rules:
			pr = frappe.get_doc("Cage H Type Item Pricing Rule", pricing_rules[0].name)

			per_row_cost = 0

			for row in pr.egg_collection_pricing_logic:
				if shed_length >= row.shed_length_start and shed_length <= row.shed_length_end:
					per_row_cost = row.cost_per_row
					break

			rows = self.rows or 0
			total_cost = per_row_cost * rows

			if self.display_currency and self.display_currency != "INR":
				exchange_rate = self.exchange_rate or 1
				per_row_cost = per_row_cost / exchange_rate
				total_cost = total_cost / exchange_rate

			self.per_row_cost_ec = per_row_cost
			self.no_of_rows_in_1_shed_ec = rows
			self.cost_for_all_rows_ec = total_cost

		else:
			frappe.msgprint("No Pricing Rule found for selected date")

		# ==== Server Script: "Cage Mat Pricing logic" (After Save) ====
		female_bird_count = self.total_female_birds or 0
		self.db_set('female_bird_count_cm', female_bird_count)

		total_no_mats = female_bird_count / 2
		self.db_set('total_no_mats', total_no_mats)

		date = self.date or frappe.utils.today()
		pricing_rules = frappe.get_all(
			"Cage H Type Item Pricing Rule",
			filters={
				"valid_from": ["<=", date],
				"valid_to": [">=", date]
			},
			fields=["name"],
			limit=1
		)

		if pricing_rules:
			pr = frappe.get_doc("Cage H Type Item Pricing Rule", pricing_rules[0].name)
			price = 0
			for row in pr.cage_mat_pricing_logic:
				if self.item_4 == row.cage_mat_item:
					price = row.price
					break

			total_price = (self.total_no_mats or 0) * (price or 0)

			if self.display_currency and self.display_currency != "INR":
				exchange_rate = self.exchange_rate or 1
				price = price / exchange_rate
				total_price = total_price / exchange_rate

			self.db_set('price_cage_mat', price)
			self.db_set('total_price_of_cage_mat', total_price)
		else:
			frappe.msgprint("No Pricing Rule found for selected date")

		# ==== Server Script: "Cages - Broiler Breeder - H Type - Layer Stage" (After Save) ====
		female_qty = self.total_female_birds or 0
		female_rate = self.rate_per_female_bird or 0

		male_qty = self.total_male_birds or 0
		male_rate = self.rate_per_female_bird_copy or 0

		female_total = female_rate * female_qty
		male_total = male_rate * male_qty

		if self.display_currency and self.display_currency != "INR":
			exchange_rate = self.exchange_rate or 1
			female_total = female_total / exchange_rate
			male_total = male_total / exchange_rate

		self.db_set('total_rate_of_female_battery_cages_for_one_shed', female_total)
		self.db_set('total_rate_of_male_battery_cages_for_1_shed', male_total)

		# ==== Server Script: "feet to Mtr Conversion - BBL H Type" (After Save) ====
		rule = frappe.get_all(
			"Cage H Type Item Pricing Rule",
			filters={
				"valid_from": ["<=", frappe.utils.today()],
				"valid_to": [">=", frappe.utils.today()]
			},
			fields=["feet_to_meter_conversion_factor"],
			limit=1
		)

		if rule:
			factor = frappe.utils.flt(rule[0].feet_to_meter_conversion_factor)

			self.db_set("final_cage_length_for_quotation_in_meter", frappe.utils.flt(self.final_cage_length_for_quotation_feet) * factor)
			self.db_set("additional_length_in_meter", frappe.utils.flt(self.added_length) * factor)

			self.db_set("final_shed_width_in_meter", frappe.utils.flt(self.final_shed_width) * factor)
			self.db_set("final_shed_length_for_quotation_in_meter", frappe.utils.flt(self.final_shed_lenght_for_quotation) * factor)
			# self.db_set("shed_auto_mtr", frappe.utils.flt(self.shed_length_aft) * factor)

			self.db_set("shed_auto_mtr", frappe.utils.flt(self.shed_length_aft) * factor)
			self.db_set("shed_lc_egg_mtr", frappe.utils.flt(self.shed_length_ec) * factor)

			self.db_set("shed_lc_ec", frappe.utils.flt(self.shed_lenght) * factor)
			self.db_set("shed_wc_ec", frappe.utils.flt(self.shed_width) * factor)

			self.db_set("avg_hc_ec", frappe.utils.flt(self.average_height) * factor)

			self.db_set("centre_hc_ec", frappe.utils.flt(self.centre_height) * factor)
			self.db_set("side_hc_ec", frappe.utils.flt(self.side_height) * factor)
			# self.db_set("avg_hc_ec", frappe.utils.flt(self.average_height) * factor)

			self.db_set("total_area_in_cubic_meter", frappe.utils.flt(self.total_area_in_cu_ft) * factor * factor * factor)
			self.db_set("total_cfm_cubic_meter_per_minute", frappe.utils.flt(self.total_cfm) * factor * factor * factor)

			self.db_set("total_square_meter", frappe.utils.flt(self.total_sqft) * factor * factor)
			self.db_set("pad_area_in_square_meter", frappe.utils.flt(self.pad_area_in_sqft) * factor * factor)

			self.db_set("two_tier_female_section_meter", frappe.utils.flt(self.two_tier_female_section_feet) * factor)
			self.db_set("three_tier_female_section_meter", frappe.utils.flt(self.three_tier_female_section_feet) * factor)

			# self.db_set("shed_cc", frappe.utils.flt(self.shed_length_cc) * factor)
			# self.db_set("side_cc", frappe.utils.flt(self.side_height_cc) * factor)

			# self.db_set("shed_white", frappe.utils.flt(self.shed_size_wc) * factor)

			# self.db_set("shed_below", frappe.utils.flt(self.shed_length_cbp) * factor)
			# self.db_set("side_below", frappe.utils.flt(self.shed_width_cpc) * factor)

			self.db_set("gutter_system_set_for_cooling_padsin_meter", frappe.utils.flt(self.gutter_system_set_for_cooling_pads) * factor)

		else:
			pass
