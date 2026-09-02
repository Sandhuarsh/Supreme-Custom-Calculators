// ==== Commercial Layer BCG - Item Updation ====
// Commercial Layer BCG — Item Updation (mirrors "Item Updation -A type").
// Pushes each enabled system's total into the linked Opportunity as a line item
// (item_code = Pricing Rule item, rate = that system's total). Removes deselected systems.

const BCG_IU_DT = "Cages - Commercial Layer - H Type - Brooding Cum Growing";
const BCG_IU_PR = "Commercial Layer BCG Pricing Rule";

async function bcg_get_rule(frm) {
    let date = frm.doc.date || frappe.datetime.get_today();
    let res = await frappe.call({
        method: "frappe.client.get_list",
        args: { doctype: BCG_IU_PR, filters: [["valid_from", "<=", date], ["valid_to", ">=", date]],
                fields: ["name"], limit_page_length: 1 }
    });
    if (!res.message.length) return null;
    return await frappe.db.get_doc(BCG_IU_PR, res.message[0].name);
}

frappe.ui.form.on(BCG_IU_DT, {

    // Non-blocking: items are only needed to sync an Opportunity. Warn, never block the save.
    validate: async function(frm) {
        if (!frm.doc.opportunity_id) return;
        let pr = await bcg_get_rule(frm);
        if (!pr) return;
        let missing = [];
        if (!pr.battery_cage_item) missing.push("Battery Cages");
        if (frm.doc.automatic_feeding_trolley && !pr.automatic_feeding_trolley_item) missing.push("Automatic Feeding Trolley");
        if (frm.doc.environment_control_system_ec && !pr.environment_control_ec_item) missing.push("Environment Cooling (EC)");
        if (frm.doc.silo_with_fill_system && !pr.silo_item) missing.push("Silo with Fill System & Loader");
        if (frm.doc.one_ton_hopper_with_fill_system && !pr.one_ton_hopper_item) missing.push("1 Ton Hopper with Fill System");
        if (frm.doc.shed_lighting && !pr.shed_lighting_item) missing.push("Shed Lighting");
        if (missing.length) {
            frappe.msgprint({
                title: __("Pricing Rule items not set"),
                message: __("These items are not set in the Pricing Rule, so they won't sync to the Opportunity: {0}", [missing.join(", ")]),
                indicator: "orange"
            });
        }
    },

    after_save: async function(frm) {
        if (!frm.doc.opportunity_id) return;

        let pr = await bcg_get_rule(frm);
        if (!pr) return;

        // item -> rate mapping (qty always 1; battery cage total folds in inspection + SS kits)
        const map = [
            { item: pr.battery_cage_item,                always: true,                              qty: frm.doc.bird_capacity,rate: frm.doc.per_bird_rate },
            { item: pr.automatic_feeding_trolley_item,   on: frm.doc.automatic_feeding_trolley,      rate: frm.doc.total_feeding_trolley_cost },
            { item: pr.environment_control_ec_item,      on: frm.doc.environment_control_system_ec, rate: frm.doc.total_cost_of_ec_system },
            { item: pr.silo_item,                        on: frm.doc.silo_with_fill_system,         rate: frm.doc.total_silo_cost },
            { item: pr.one_ton_hopper_item,              on: frm.doc.one_ton_hopper_with_fill_system, rate: frm.doc.total_1_ton_hopper_with_fill_system },
            { item: pr.shed_lighting_item,               on: frm.doc.shed_lighting,                 rate: frm.doc.total_shed_lighting_cost },
        ];

        let required = map.filter(m => m.item && (m.always || m.on));
        let controlled = map.map(m => m.item).filter(Boolean);

        let r = await frappe.call({ method: "frappe.client.get", args: { doctype: "Opportunity", name: frm.doc.opportunity_id } });
        if (!r.message) return;
        let doc = r.message;
        let existing = doc.items || [];

        for (let m of required) {
            let qty = m.qty || 1;
            let row = existing.find(d => d.item_code === m.item);
            if (row) {
                row.qty = qty;
                row.rate = m.rate || 0;
            } else {
                doc.items.push({ item_code: m.item, qty: qty, rate: m.rate || 0 });
            }
        }

        await frappe.call({ method: "frappe.client.save", args: { doc: doc } });

        // remove rows for systems we control but are no longer selected
        let req_codes = required.map(m => m.item);
        for (let row of existing) {
            if (controlled.includes(row.item_code) && !req_codes.includes(row.item_code)) {
                await frappe.call({ method: "frappe.client.delete", args: { doctype: "Opportunity Item", name: row.name } });
            }
        }

        frappe.show_alert({ message: "Opportunity synced (Commercial Layer BCG)", indicator: "green" });
    }
});

// Calculator Selector linkage (mirrors A-Type)
frappe.ui.form.on(BCG_IU_DT, {
    onload(frm) {
        if (!frm.is_new()) return;
        let ctx = null;
        try { ctx = JSON.parse(sessionStorage.getItem("calculator_context")); } catch (e) {}
        if (!ctx) return;
        if (ctx.opportunity_id && frm.fields_dict.opportunity_id) frm.set_value("opportunity_id", ctx.opportunity_id);
    },
    after_save(frm) {
        let ctx = null;
        try { ctx = JSON.parse(sessionStorage.getItem("calculator_context")); } catch (e) {}
        if (!ctx) return;
        frappe.db.set_value("Calculator Selector", ctx.rowname, "calculator_id", frm.doc.name).then(() => {
            frappe.show_alert({ message: __("Calculator {0} linked", [frm.doc.name]), indicator: "green" });
            if (typeof load_opportunity_summary === "function") load_opportunity_summary(frm);
            try { sessionStorage.removeItem("calculator_context"); } catch (e) {}
        });
    }
});

// ==== Commercial Layer BCG - Exchange Rate Popup ====
frappe.ui.form.on("Cages - Commercial Layer - H Type - Brooding Cum Growing", {
    before_save(frm) { frm._bcg_first_save = frm.is_new(); },
    after_save(frm) {
        if (!frm._bcg_first_save) return;
        const rate = frm.doc.exchange_rate;
        frappe.msgprint({
            title: __("Check Exchange Rate"),
            indicator: rate ? "blue" : "orange",
            message: rate
                ? __("Current <b>Exchange Rate</b>: <b>{0}</b><br>Please verify before processing the calculator.", [rate])
                : __("<b>Exchange Rate</b> is not set. Please set it before processing the calculator.")
        });
    }
});

// ==== Commercial Layer BCG - Currency Fetch ====
frappe.ui.form.on("Cages - Commercial Layer - H Type - Brooding Cum Growing", {
    onload(frm) {
        if (frm.is_new() && frm.doc.opportunity_id) {
            set_display_currency(frm);
        }
    },

    opportunity_id(frm) {
        set_display_currency(frm);
    }
});

function set_display_currency(frm) {
    frappe.db.get_value(
        "Opportunity",
        frm.doc.opportunity_id,
        ["opportunity_from", "party_name", "currency"]
    ).then(r => {
        const o = r.message || {};

        if (o.opportunity_from === "Customer" && o.party_name) {
            frappe.db.get_value("Customer", o.party_name, "default_currency")
                .then(c => {
                    frm.set_value(
                        "display_currency",
                        (c.message && c.message.default_currency) || o.currency
                    );
                });
        } else {
            frm.set_value("display_currency", o.currency);
        }
    });
}




frappe.ui.form.on("Cages - Commercial Layer - H Type - Brooding Cum Growing", {
    display_currency(frm) {
        if (!frm.doc.display_currency || frm.doc.display_currency === "INR") {
            frm.set_value("exchange_rate", 1);
            return;
        }

        let transaction_date = frm.doc.date || frappe.datetime.get_today();

        fetch(
            `https://api.frankfurter.dev/v1/${transaction_date}?base=${frm.doc.display_currency}&symbols=INR`
        )
        .then(response => response.json())
        .then(data => {
            console.log(data);

            if (data.rates && data.rates.INR) {
                frm.set_value("exchange_rate", flt(data.rates.INR));
            } else {
                frappe.msgprint(__(
                    `Unable to fetch exchange rate for ${frm.doc.display_currency}`
                ));
            }
        })
        .catch(err => {
            console.error(err);
            frappe.msgprint(__("Error fetching exchange rate."));
        });
    }
});

// ==== Updated Calculations ====
// Commercial Layer BCG (Brooding Cum Growing) — calculator.
// Battery Cages / Feeding Trolley / Silo / Hopper -> "Commercial Layer BCG Pricing Rule".
// EC tab/fields removed — will be replaced by a fresh copy (fields + code) from
// Cages - Broiler Breeder - H Type - Layer Stage. tunnel_fan_count/air_inlet/tdl_check
// stay wired into bcg_lighting() below since Shed Lighting reads those same field names.

const BCG_DT = "Cages - Commercial Layer - H Type - Brooding Cum Growing";

frappe.ui.form.on(BCG_DT, {
    // refresh:  bcg_calc,
    validate: bcg_calc,
    date: bcg_calc, bird_capacity: bcg_calc, shed_length: bcg_calc, no_of_rows: bcg_calc,
    tiers: bcg_calc, trough_type: bcg_calc, shed_width: bcg_calc, side_height: bcg_calc,
    centre_height: bcg_calc, automatic_feeding_trolley: bcg_calc, silo_with_fill_system: bcg_calc,
    one_ton_hopper_with_fill_system: bcg_calc,
    silo_loader: bcg_calc, air_inlet: bcg_calc, tdl_check: bcg_calc,
    measurement_unit: bcg_calc, display_currency: bcg_calc, exchange_rate: bcg_calc,
    calculation_method: bcg_calc, target_no_of_birds: bcg_calc, front_in: bcg_calc, depth_in: bcg_calc,
    front_height_in: bcg_calc, back_height_in: bcg_calc, birds_per_box: bcg_calc, boxes_per_tier: bcg_calc,
    shed_lighting: bcg_calc, construction_type: bcg_calc, filter: bcg_calc, heater_qty: bcg_calc,
    conveyor_qty: bcg_calc, emergency_stop_qty: bcg_calc, alarm_qty: bcg_calc,
    lighting_temp_sensor_qty: bcg_calc, lighting_humidity_sensor_qty: bcg_calc,
    // Silo + 1-ton hopper (ported from Broiler Breeder Layer Stage)
    silo: bcg_calc, silo_capacity_ton: bcg_calc, fill_system: bcg_calc, silo_w_system: bcg_calc,
    loader: bcg_calc, one_ton_hopper_with_boot: bcg_calc,
    cost_upto_3_rows: bcg_calc, additional_row_value_to_add: bcg_calc,
    cost_3_rows: bcg_calc, add_row_value: bcg_calc,
    days: bcg_calc, feed_capacity: bcg_calc,
});

// Reference mirror: selecting a silo also marks the fill system "Needed".
frappe.ui.form.on(BCG_DT, {
    silo(frm) { if (frm.doc.silo) frm.set_value("fill_system", frm.doc.silo); },
});

function bcg_active_rule(doctype, date) {
    return frappe.call({
        method: "frappe.client.get_list",
        args: { doctype: doctype, filters: [["valid_from", "<=", date], ["valid_to", ">=", date]],
                fields: ["name"], limit_page_length: 1 }
    }).then(r => (r.message && r.message.length) ? frappe.db.get_doc(doctype, r.message[0].name) : null);
}

function bcg_calc(frm) {
    let date = frm.doc.date || frappe.datetime.get_today();
    // return the promise so `validate` waits for the full compute (incl. the lighting BOM)
    // BEFORE the save payload is built — otherwise the async child-table writes re-dirty the
    // form after save and the entry looks "not saved".
    return bcg_active_rule("Commercial Layer BCG Pricing Rule", date).then(pr => {
        if (!pr) {
            frappe.show_alert({ message: __("No active Commercial Layer BCG Pricing Rule for {0}", [date]), indicator: "orange" });
            return;
        }
        try {
            const factor = flt(pr.feet_to_meter_conversion_factor) || 0.3048;
            bcg_geometry(frm, pr);
            bcg_compute_core(frm, pr);
            bcg_lighting(frm, pr);
            bcg_finalize(frm, factor);
        } catch (e) {
            // never hard-block the save on a calc error
            console.error("BCG calculator error:", e);
            frappe.show_alert({ message: __("Calculator error: {0}", [e.message]), indicator: "red" });
        }
    });
}

// Cage geometry — Calculation Method (Shed<->Bird). Rounding = Math.round (round-half),
// matching the existing calculators. bird_capacity = actual cage capacity (used for pricing).
function bcg_geometry(frm, pr) {
    const front = flt(frm.doc.front_in), depth = flt(frm.doc.depth_in);
    const bpb = flt(frm.doc.birds_per_box), boxesPerTier = cint(frm.doc.boxes_per_tier) || 4;
    const tiers = cint(frm.doc.tiers), rows = flt(frm.doc.no_of_rows);
    const slAdd = flt(pr.section_length_add) || 0.5;
    const swAdd = flt(pr.section_width_add) || 18;
    const rowClear = flt(pr.row_width_clearance) || 16;
    const gap = flt(pr.gap_between_rows_ft) || 3.5;
    const sub = frm.doc.automatic_feeding_trolley
        ? (flt(pr.length_subtract_with_trolley) || 37)
        : (flt(pr.length_subtract_without_trolley) || 30);

    const sectionLen = front * 2 + slAdd;          // inches
    const sectionWid = depth * 2 + swAdd;          // inches
    const birdsPerTier = bpb * boxesPerTier;
    const birdsPerSection = birdsPerTier * tiers;
    frm.set_value("section_length_in", sectionLen);
    frm.set_value("section_width_in", sectionWid);
    frm.set_value("birds_per_tier", birdsPerTier);
    frm.set_value("birds_per_section", birdsPerSection);
    frm.set_value("area_per_bird_sqin", bpb ? (front * depth / bpb) : 0);

    if ((frm.doc.calculation_method || "Shed To Bird") === "Bird To Shed") {
        const target = flt(frm.doc.target_no_of_birds);
        const sectionsPerRow = (birdsPerSection && rows) ? Math.ceil(target / rows / birdsPerSection) : 0;  // ceil: never below target capacity
        const totalSections = sectionsPerRow * rows;
        const cageLen = sectionLen ? Math.round(sectionsPerRow * sectionLen / 12) : 0;
        frm.set_value("sections_per_row", sectionsPerRow);
        frm.set_value("total_sections", totalSections);
        frm.set_value("cage_length_ft", cageLen);
        frm.set_value("shed_length", cageLen + sub);
        frm.set_value("shed_width", Math.round((depth * 2 + rowClear) * rows / 12 + gap * (rows + 1)));
        frm.set_value("bird_capacity", totalSections * birdsPerSection);
        frm.set_df_property("shed_length", "read_only", 1);
        frm.set_df_property("shed_width", "read_only", 1);
    } else {
        const cageLen = flt(frm.doc.shed_length) - sub;
        const sectionsPerRow = sectionLen ? Math.round(cageLen * 12 / sectionLen) : 0;
        const totalSections = sectionsPerRow * rows;
        frm.set_value("cage_length_ft", cageLen);
        frm.set_value("sections_per_row", sectionsPerRow);
        frm.set_value("total_sections", totalSections);
        frm.set_value("bird_capacity", totalSections * birdsPerSection);
        frm.set_df_property("shed_length", "read_only", 0);
        frm.set_df_property("shed_width", "read_only", 0);
    }
}

function next_even(v) {
    if (Number.isInteger(v) && v % 2 === 0) return v;
    let x = Math.ceil(v);
    return (x % 2 !== 0) ? x + 1 : x;
}

// ---------- core systems (synchronous) ----------
function bcg_compute_core(frm, pr) {
    const cap = flt(frm.doc.bird_capacity), rows = flt(frm.doc.no_of_rows),
          tiers = cint(frm.doc.tiers), sl = flt(frm.doc.shed_length);

    let rate = 0, tier_label = "";
    (pr.cage_rates || []).forEach(r => {
        if (cap >= flt(r.capacity_from) && cap < flt(r.capacity_to)) {
            tier_label = r.capacity_label;
            if (frm.doc.trough_type === "G.I. Trough") rate = flt(r.gi_trough);
            else if (frm.doc.trough_type === "Galvalume Trough") rate = flt(r.galvalume_trough);
            else if (frm.doc.trough_type === "Chain Feeding (GI Trough)") rate = flt(r.chain_feeding);
        }
    });
    frm.set_value("capacity_tier", tier_label);
    frm.set_value("per_bird_rate", rate);
    const cage_cost = cap * rate;
    frm.set_value("cage_cost", cage_cost);

    const inspection = flt(pr.inspection_base_cost) + Math.max(0, tiers - cint(pr.inspection_base_tier)) * flt(pr.inspection_per_additional_tier);
    frm.set_value("inspection_trolley_cost", inspection);
    const ss_extra = Math.max(0, tiers - cint(pr.ss_kit_base_tier));
    const ss_start = (flt(pr.ss_start_kit_base) + ss_extra * flt(pr.ss_start_kit_per_additional_tier)) * rows;
    const ss_end = (flt(pr.ss_end_kit_base) + ss_extra * flt(pr.ss_end_kit_per_additional_tier)) * rows;
    frm.set_value("ss_start_kit_cost", ss_start);
    frm.set_value("ss_end_kit_cost", ss_end);
    const total_cage = cage_cost + inspection + ss_start + ss_end;
    frm.set_value("total_battery_cage_cost", total_cage);

    let ft_per_row = 0;
    (pr.feeding_trolley_rates || []).some(r => {
        if (sl >= flt(r.shed_length_from) && sl <= flt(r.shed_length_to)) { ft_per_row = flt(r.per_row_cost); return true; }
        return false;
    });
    const ft_extra = Math.max(0, tiers - cint(pr.feeding_base_tier)) * flt(pr.feeding_additional_tier_rate);
    frm.set_value("feeding_per_row_cost", ft_per_row);
    frm.set_value("feeding_extra_tier_cost_per_row", ft_extra);
    frm.set_value("feeding_rows", rows);
    const total_ft = (ft_per_row + ft_extra) * rows;
    frm.set_value("total_feeding_trolley_cost", total_ft);

    // ============ Silo + fill system (ported from Broiler Breeder Layer Stage) ============
    // All amounts kept in INR; bcg_finalize() converts every Currency field by exchange_rate,
    // so DO NOT divide by fx here (would double-convert).

    // Estimated silo capacity — guidance only; user selects silo_capacity_ton.
    const birds = flt(frm.doc.bird_capacity) || 1;
    const days  = flt(frm.doc.days) || 1;
    const feed  = flt(frm.doc.feed_capacity) || 1;
    const est = birds * days * feed;
    frm.set_value("silo__capacity_estimated", est);

    // Silo price: match user-selected capacity in pr.silo_price_logic_table (field: silo_capactity).
    const siloCap = frm.doc.silo_capacity_ton || "";
    let silo_price = 0;
    if (siloCap) {
        const srow = (pr.silo_price_logic_table || []).find(r => r.silo_capactity == siloCap);
        silo_price = srow ? flt(srow.price) : 0;
    }
    frm.set_value("silo_rate", silo_price);
    frm.set_value("silo_amount", silo_price);
    frm.set_value("no_of_rowss", rows);

    // Silo-side fill system: base up to 3 rows + per additional row.
    const fs_base  = flt(frm.doc.cost_upto_3_rows) || 113000;
    const fs_extra = flt(frm.doc.additional_row_value_to_add) || 4000;
    const fill_silo = rows <= 3 ? fs_base : fs_base + (rows - 3) * fs_extra;
    frm.set_value("rate_per_running_feet", fill_silo);
    frm.set_value("fill_system_amount", fill_silo);

    // Loader / weighing flat defaults (INR) — mirrors update_silo_defaults.
    const loader_amount = 110000, weighing_amount = 106582;
    frm.set_value("loader_rate", loader_amount);
    frm.set_value("loader_amount", loader_amount);
    frm.set_value("weighing_system_cost", weighing_amount);

    // total_silo_cost = silo + (loader) + (fill "Needed") + (weighing).
    let total_silo = silo_price;
    if (frm.doc.loader)                   total_silo += loader_amount;
    if (frm.doc.fill_system === "Needed") total_silo += fill_silo;
    if (frm.doc.silo_w_system)            total_silo += weighing_amount;
    frm.set_value("total_silo_cost", total_silo);

    // ============ 1-ton hopper + fill system ============
    frm.set_value("no_of_rows_fill", rows);
    const hf_base  = flt(frm.doc.cost_3_rows) || 113000;
    const hf_extra = flt(frm.doc.add_row_value) || 4000;
    const fill_hopper = rows <= 3 ? hf_base : hf_base + (rows - 3) * hf_extra;
    frm.set_value("rate_per_running_feet_fill", fill_hopper);
    frm.set_value("fill_system_amounts", fill_hopper);

    const hopper_amount = 25000;
    frm.set_value("hopper_rate", hopper_amount);
    frm.set_value("hopper_amount", hopper_amount);
    frm.set_value("no_of_hoppers", rows);

    // total_1_ton_hopper = fill_amounts + (hopper "Needed").
    let total_hopper = fill_hopper;
    if (frm.doc.one_ton_hopper_with_boot === "Needed") total_hopper += hopper_amount;
    frm.set_value("total_1_ton_hopper_with_fill_system", total_hopper);

    // ============ Grand-total refs (gated by BCG opt-in checkboxes, INR) ============
    // frm.set_value("total_battery_cage_cost_ref", total_cage);
    // frm.set_value("total_feeding_trolley_cost_ref", frm.doc.automatic_feeding_trolley ? total_ft : 0);
    // frm.set_value("total_silo_cost_ref", frm.doc.silo_with_fill_system ? total_silo : 0);
    // frm.set_value("total_1_ton_hopper_ref", frm.doc.one_ton_hopper_with_fill_system ? total_hopper : 0);
}

// ---------- Shed Lighting (Non-Dimmable) — 36-line electrical BOM ----------
// All unit rates + the cable->meter divisor & LED spacing come from the Pricing Rule.
// Equipment counts link to the other systems per the agreed mapping. tunnel_fan_count,
// air_inlet and tdl_check are populated by the EC tab's own script (kept in sync by field name).
function bcg_lighting(frm, pr) {
    if (!frm.doc.shed_lighting) {
        frm.set_value("total_shed_lighting_cost", 0);
        frm.set_value("total_shed_lighting_ref", 0);
        return;
    }
    const L = flt(frm.doc.shed_length), W = flt(frm.doc.shed_width), H = flt(frm.doc.side_height);
    const rows = flt(frm.doc.no_of_rows);
    const div = flt(pr.lighting_cable_to_meter) || 3.28;
    const ledSpacing = flt(pr.lighting_led_line_spacing) || 7;
    const peb = (frm.doc.construction_type !== "Curtain") ? 1 : 0;
    const curtain = (frm.doc.construction_type === "Curtain") ? 1 : 0;

    // equipment quantities (mapped to other systems / inputs)
    const exhaust = flt(frm.doc.tunnel_fan_count);
    const drive = rows;
    const conveyor = flt(frm.doc.conveyor_qty);
    const estop = flt(frm.doc.emergency_stop_qty);
    const pump = cint(frm.doc.filter);
    const heater = flt(frm.doc.heater_qty);
    const hopper = frm.doc.one_ton_hopper_with_fill_system ? rows : 0;
    const silo = frm.doc.silo_with_fill_system ? rows : 0;
    const loader = frm.doc.silo_loader ? 1 : 0;
    const airinlet = frm.doc.air_inlet ? flt(pr.ec_air_inlet_winch_qty) : 0;
    const tunneldoor = frm.doc.tdl_check ? pump : 0;
    const alarm = flt(frm.doc.alarm_qty);
    const temp = flt(frm.doc.lighting_temp_sensor_qty);
    const humidity = flt(frm.doc.lighting_humidity_sensor_qty);

    const ledLinesL = ledSpacing ? L / ledSpacing : 0;     // I14
    const ledCount = ledLinesL * (rows + 1);               // I15 -> D20

    // intermediate cable lengths
    const E_exhaust = (L + W + W + H) * exhaust;
    const E_drive = (W + H + H) * drive;
    const E_conveyor = (W + H + H) + conveyor;
    const E_estop = (L + W + H + H) * estop;
    const E_pump = (W + W + H + H) * pump;
    const I9 = (L / 4) * 3, J9 = H * heater, I10 = W + H + I9 + J9;
    const E_heater = I10;                 // sheet E14 = I10 × (no_of_shed=1)
    const E_hopper = (W + H + H) * hopper, F_hopper = (W + H + H + 5) * hopper;
    const E_silo = (W + H + H) * silo, F_silo = (W + H + H + 5) * silo;
    const E_loader = (W + 50) * loader;
    const E_airinlet = (W + H + H) * airinlet, F_airinlet = (W + H + H + 5) * airinlet;
    const E_tunneldoor = (W + H + H) * tunneldoor, F_tunneldoor = (W + H + H + 5) * tunneldoor;
    const E_led = (L + W + H + 20);
    const F_led = (W * ledLinesL) + (H * ledLinesL / 2);
    const E_alarm = (W + H) * alarm;
    const I5 = (L / 5) * 10 + 4 * (W + H + 10);
    const F_temp = I5;                    // sheet F22 = I5 × (no_of_shed=1)
    const F_humidity = (L / 2) + (W + H + H);  // sheet F23 × (no_of_shed=1)
    const I20 = 3 * ledCount;
    const I30 = (W * temp) + (W * humidity);
    const I35 = (exhaust + drive + conveyor + estop + heater) * 10;
    const I25 = (L + W + W + H + 20) + (W + H + H + 20);
    const sumL = exhaust + drive * 2 + conveyor * 5 + estop * 2 + 7 * pump + heater +
                 hopper * 5 + silo * 5 + loader * 5 + airinlet * 5 + tunneldoor * 5 +
                 ledLinesL + alarm * 3 + temp + humidity;
    const sumM = 7 + 7;

    // BOM quantity by Sr (rows 26-61 of the sheet)
    const Q = {};
    Q[1] = E_exhaust + E_drive + E_conveyor + E_pump + E_hopper + E_silo + E_loader + E_airinlet + E_tunneldoor;
    Q[2] = E_heater;
    Q[3] = E_estop + F_hopper + F_silo + E_alarm + I20;
    Q[4] = F_airinlet + F_tunneldoor;
    Q[5] = 4 * H;
    Q[6] = F_temp;
    Q[7] = F_humidity;
    Q[8] = E_led;
    Q[9] = (L / 2) + (W + H + 20);
    Q[10] = Q[8] + Q[9];
    Q[11] = F_led;
    Q[12] = F_led;
    Q[13] = ledCount;
    Q[14] = ledCount;
    Q[15] = E_pump + E_hopper + E_silo + E_loader + E_airinlet + E_tunneldoor + E_alarm + F_led + I30 + I35;
    Q[16] = sumL;
    Q[17] = (Q[15] / 2.5) * peb;
    Q[18] = H * (2 * drive + pump + hopper + silo + loader + airinlet + tunneldoor);
    Q[19] = ledLinesL;
    Q[20] = drive + heater + temp;
    Q[21] = ledCount - ledLinesL;
    Q[22] = ledLinesL;
    Q[23] = heater;
    Q[24] = heater;
    Q[25] = 1;
    Q[26] = ledLinesL;
    Q[27] = ledLinesL;
    Q[28] = I25;
    Q[29] = sumM;
    Q[30] = exhaust + drive;
    Q[31] = exhaust + drive;
    Q[32] = (Q[28] / 2.5) * peb;
    Q[33] = ((Q[17] + Q[32]) * 2) * peb;
    Q[34] = (ledLinesL / 3) / 3;
    Q[35] = (Q[15] + Q[28]) / 2.5 * curtain;
    Q[36] = exhaust + pump + airinlet + tunneldoor;

    // Sum the BOM to a single total (no child table on the calculator).
    let total = 0;
    (pr.lighting_rates || []).forEach(r => {
        const qty = flt(Q[r.sr_no]);
        const rate = flt(r.rate);
        total += r.is_cable ? (qty / div) * rate : qty * rate;
    });
    frm.set_value("total_shed_lighting_cost", total);
    frm.set_value("total_shed_lighting_ref", total);
}

// ---------- Feet->Meter + multi-currency + grand total ----------
function bcg_finalize(frm, factor) {
    // Feet -> Meter twins (display)
    frm.set_value("shed_length_meter", flt(frm.doc.shed_length) * factor);
    frm.set_value("shed_width_meter",  flt(frm.doc.shed_width)  * factor);
    // frm.set_value("side_height_meter", flt(frm.doc.side_height) * factor);
    // frm.set_value("centre_height_meter", flt(frm.doc.centre_height) * factor);

    // Multi-currency: all amounts computed in INR; divide by exchange_rate
    // (exchange_rate is foreign->INR; base currency is INR) — mirrors Broiler EC House.
    const fx = flt(frm.doc.exchange_rate) || 1;
    if (fx !== 1) {
        (frm.meta.fields || []).forEach(df => {
            if (df.fieldtype === "Currency" && df.fieldname !== "grand_total") {
                frm.set_value(df.fieldname, flt(frm.doc[df.fieldname]) / fx);
            }
        });
    }

    // grand total = sum of the (already converted) addon refs. total_cost_of_ec_system_ref
    // is populated by the EC tab's own script — kept here so EC still rolls into the total.
    // const gt = flt(frm.doc.total_battery_cage_cost_ref) + flt(frm.doc.total_feeding_trolley_cost_ref) +
    //           flt(frm.doc.total_cost_of_ec_system_ref) + flt(frm.doc.total_silo_cost_ref) +
    //           flt(frm.doc.total_1_ton_hopper_ref) + flt(frm.doc.total_shed_lighting_ref);
    // frm.set_value("grand_total", gt);
}

// ==== EC System Logic -BCG ====
frappe.ui.form.on("Cages - Commercial Layer - H Type - Brooding Cum Growing", {
    validate(frm) {
        // Return the promise so Frappe waits for it to complete before saving
        return calculate_values(frm);
    },
    side_height: calculate_values,
    centre_height: calculate_values,
    shed_lenght: calculate_values,
    shed_widthf: calculate_values,
});

// NOTE: duplicate next_even() definition (identical to the one in "Updated
// Calculations") removed here - see that script's definition above.

// ─── Helper: safe float parse ───
function flt(v) {
    return parseFloat(v) || 0;
}

// ─── Helper: fetch active Commercial Layer BCG Pricing Rule (Optimized) ───
function get_active_pricing_rule() {
    return frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Commercial Layer BCG Pricing Rule",
            filters: [
                ["valid_from", "<=", frappe.datetime.get_today()],
                ["valid_to", ">=", frappe.datetime.get_today()],
            ],
            fields: ["name"],
            limit_page_length: 1,
        },
    }).then((res) => {
        if (!res || !res.message || !res.message.length) return null;

        return frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Commercial Layer BCG Pricing Rule",
                name: res.message[0].name,
            },
        }).then((r) => r ? r.message : null);
    });
}

// ═══════════════════════════════════════════════
//  Main calculation function
// ═══════════════════════════════════════════════
async function calculate_values(frm) {

    // ── Shed dimensions ──
    let shed_lenght = flt(frm.doc.shed_length);
    let shed_width = flt(frm.doc.shed_width);
    frm.set_value("shed_lenght", shed_lenght);
    frm.set_value("shed_widthf", shed_width);

    // ── Average height ──
    let side_height = flt(frm.doc.side_height);
    let centre_height = flt(frm.doc.centre_height);
    let average_height = (side_height + centre_height) / 2;
    frm.set_value("average_height", average_height);

    // ── Pump type based on gutter system ──
    let pump_type = "";
    if (frm.doc.gutter_system_type === "Aluminium") {
        pump_type = "Submersible pump";
    } else if (frm.doc.gutter_system_type === "PVC") {
        pump_type = "Centrifugal pump";
    }
    frm.set_value("pump_type", pump_type);

    // ── Volume & airflow ──
    let total_area_in_cu_ft = shed_lenght * shed_width * average_height;
    frm.set_value("total_area_in_cu_ft", total_area_in_cu_ft);

    let air_exchange = flt(frm.doc.air_exchange);
    let total_cfm = total_area_in_cu_ft * air_exchange;
    frm.set_value("total_cfm", total_cfm);

    // ── Fan capacity by type ──
    // ── Fan capacity by type (Pricing Rule) ──
let fan_capacity_cfm = 0;
let fan_capacity_cmh_vsf = 0;
let fan_capacity_cmh_vai = 0;

let doc = await get_active_pricing_rule();

if (doc) {
    let fan_rows = doc.table_wkqn || [];

    fan_rows.forEach(function(row) {
        if (frm.doc.fan_type === row.fan_type) {
            fan_capacity_cfm = flt(row.fan_capacity_cfm);
            fan_capacity_cmh_vsf = flt(row.fan_capacity_cmh_vsf);
            fan_capacity_cmh_vai = flt(row.fan_capacity_cmh_vai);
        }
    });
}

frm.set_value("fan_capacity_cfm", fan_capacity_cfm);
frm.set_value("fan_capacity_cmh_vsf", fan_capacity_cmh_vsf);
frm.set_value("fan_capacity_cmh_vai", fan_capacity_cmh_vai);

    // ── Tunnel fans ──
    let no_of_fan = fan_capacity_cfm ? (total_cfm / fan_capacity_cfm) : 0;
    frm.set_value("no_of_fan", no_of_fan);

    let tunnel_fan_count = Math.round(no_of_fan);
    frm.set_value("tunnel_fan_count", tunnel_fan_count);

    // ── Cooling pads ──
    let cooling_pad_cfmsqft = flt(frm.doc.cooling_pad_cfmsqft);
    let total_sqft = cooling_pad_cfmsqft ? (total_cfm / cooling_pad_cfmsqft) : 0;
    frm.set_value("total_sqft", total_sqft);

    let pad_area_in_sqft = flt(frm.doc.pad_area_in_sqft);
    let total_pads = pad_area_in_sqft ? (total_sqft / pad_area_in_sqft) : 0;
    frm.set_value("total_pads", total_pads);

    let cooling_pad_count = next_even(total_pads);
    frm.set_value("cooling_pad_count", cooling_pad_count);

    // ── Side fans (VSF) ──
    let total_cmh_vsf = tunnel_fan_count * fan_capacity_cmh_vsf;
    frm.set_value("total_cmh_vsf", total_cmh_vsf);

    let fifteen_of_total_cmh = total_cmh_vsf * 0.15;
    frm.set_value("fifteen_of_total_cmh", fifteen_of_total_cmh);

    let fan_cmh_vsf = flt(frm.doc.fan_cmh_vsf);
    let total_36_fan = fan_cmh_vsf ? (fifteen_of_total_cmh / fan_cmh_vsf) : 0;
    frm.set_value("total_36_fan", total_36_fan);

    let side_fan_count = next_even(total_36_fan);
    frm.set_value("side_fan_count", side_fan_count);

    // ── Air inlets (VAI) ──
    let total_cmh_vai = tunnel_fan_count * fan_capacity_cmh_vai;
    frm.set_value("total_cmh_vai", total_cmh_vai);

    let tewntyfive_of_total_cmh = total_cmh_vai * 0.25;
    frm.set_value("tewntyfive_of_total_cmh", tewntyfive_of_total_cmh);

    let air_inlet_cmh = flt(frm.doc.air_inlet_cmh);
    let total_air_inlet = air_inlet_cmh ? (tewntyfive_of_total_cmh / air_inlet_cmh) : 0;
    frm.set_value("total_air_inlet", total_air_inlet);

    let air__inlet_count = next_even(total_air_inlet);
    frm.set_value("air__inlet_count", air__inlet_count);

    // ── Gutter system sets ──
    let gutter_system_set_for_cooling_pads = 0;
    if (frm.doc.gutter_system == 1) {
        gutter_system_set_for_cooling_pads = cooling_pad_count * 2;
    }
    frm.set_value("gutter_system_set_for_cooling_pads", gutter_system_set_for_cooling_pads);

    // ── Initialize Pricing Rule Variables ──
    let electronic_contoller_price = flt(frm.doc.electronic_contoller_price);
    let humidity_sensor = flt(frm.doc.humidity_sensor);
    let temperature_sensor = flt(frm.doc.temperature_sensor);
    let relay = flt(frm.doc.relay);

    let pump_hp = 2;
    let pump_quantity = 3;

    let ups_alarm_price = 0;
    let installation_price = 0;
    let tdl_price = 0;
    let tdl_winch_motorised_price = 0;
    let air_inlet_price = 0;
    let air_inlet_winch_motorised_price = 0;
    let misc_price = 0;
    let gi_gutter_system_price = 0;
    let thirtysix_fan_price = 0;
    let filter_price = 0;
    let plumbing_material_price = flt(frm.doc.plumbing_material_price);
    let pump_price = flt(frm.doc.pump_price);
    let control_panel_price = flt(frm.doc.control_panel_price);

    // Fetch the pricing rule doc ONCE
    if (doc) {
        // Electronic Controller
        let rows_ec = doc.lectronic_controller_ec || [];
        rows_ec.forEach(function (row) {
            if (frm.doc.eletronic_cotroller_type == row.electronic_controller_type) {
                humidity_sensor = row.humidity_sensor;
                temperature_sensor = row.temperature_sensor;
                relay = row.relay;
                electronic_contoller_price = row.price;
            }
        });

        // Pump quantity & HP
        let rows_pq = doc.pump_quantity || [];
        let found_pq = false;
        rows_pq.forEach(function (row) {
            if (tunnel_fan_count == row.fan_count) {
                pump_hp = row.pump_hp;
                pump_quantity = row.quantity;
                found_pq = true;
            }
        });
        if (!found_pq) {
            pump_hp = 2;
            pump_quantity = 3;
        }

        // EC System pricing
        let ups_alarm_val = doc.ups_alarm || 3500;
        ups_alarm_price = flt(frm.doc.alarm_system) * ups_alarm_val;

        let installation_val = doc.installation || 31000;
        installation_price = 1 * installation_val;

        let filter_count = pump_quantity;

        if (frm.doc.tdl_check == 1) {
            let tdl_val = doc.tdl;
            let tdl_price_price = 12 * cooling_pad_count * tdl_val;
            tdl_price = tdl_price_price || 222000;

            let tdl_winch_val = doc.tdl_winch || 75000;
            tdl_winch_motorised_price = filter_count * tdl_winch_val;
        }

        if (frm.doc.air_inlet == 1) {
            let air_inlet_val = doc.air_inlet || 4000;
            air_inlet_price = air__inlet_count * air_inlet_val;

            let air_inlet_winch_val = doc.air_inlet_winch || 50000;
            air_inlet_winch_motorised_price = 2 * air_inlet_winch_val;
        }

        misc_price = 1 * (doc.misc || 0);

        if (frm.doc.gutter_system == 1 || frm.doc.gutter_system == "1") {
            let gi_rate = doc.gi_gutter_system || 1200;
            gi_gutter_system_price = (cooling_pad_count * 2) * gi_rate;
        }

        if (frm.doc.minimum_ventilation_fan == 1) {
            let thirtysix_fan_val = doc.thirtysix_fan_price || 29000;
            thirtysix_fan_price = side_fan_count * thirtysix_fan_val;
        }

        let filter_val = doc.filter || 2000;
        filter_price = filter_count * filter_val;

        // Plumbing material
        let rows_pl = doc.plumbing_syatem || [];
        rows_pl.forEach(function (row) {
            if (cooling_pad_count >= row.cooling_pad_from && cooling_pad_count <= row.cooling_pad_to) {
                plumbing_material_price = row.rate;
            }
        });

        // Pump pricing
        let rows_pp = doc.pump_pricing || [];
        let found_pp = false;
        rows_pp.forEach(function (row) {
            if (pump_hp == row.pump_hp && frm.doc.electric_cuurent_phase == row.pump_phase) {
                pump_price = row.price * pump_quantity;
                found_pp = true;
            }
        });
        if (!found_pp) {
            pump_price = 0;
        }

        // Control panel
        let rows_cp = doc.control_panel_price || [];
        rows_cp.forEach(function (row) {
            if (tunnel_fan_count == row.fan_count) {
                control_panel_price = row.rate;
            }
        });
    }


    // Currency Conversion
// Currency Conversion
if (frm.doc.display_currency && frm.doc.display_currency !== "INR") {
    let exchange_rate = flt(frm.doc.exchange_rate) || 1;

    electronic_contoller_price = electronic_contoller_price / exchange_rate;
    ups_alarm_price = ups_alarm_price / exchange_rate;
    installation_price = installation_price / exchange_rate;
    tdl_price = tdl_price / exchange_rate;
    tdl_winch_motorised_price = tdl_winch_motorised_price / exchange_rate;
    air_inlet_price = air_inlet_price / exchange_rate;
    air_inlet_winch_motorised_price = air_inlet_winch_motorised_price / exchange_rate;
    misc_price = misc_price / exchange_rate;
    gi_gutter_system_price = gi_gutter_system_price / exchange_rate;
    thirtysix_fan_price = thirtysix_fan_price / exchange_rate;
    filter_price = filter_price / exchange_rate;
    plumbing_material_price = plumbing_material_price / exchange_rate;
    pump_price = pump_price / exchange_rate;
    control_panel_price = control_panel_price / exchange_rate;
}





    // ── Apply values to form ──
    frm.set_value("humidity_sensor", humidity_sensor);
    frm.set_value("temperature_sensor", temperature_sensor);
    frm.set_value("relay", relay);
    frm.set_value("electronic_contoller_price", electronic_contoller_price);
    frm.set_value("pump_hp", pump_hp);
    frm.set_value("pump_quantity", pump_quantity);

    let filter = pump_quantity;
    frm.set_value("filter", filter);
    frm.set_value("tdl_motor", filter);

    frm.set_value("ups_alarm_price", ups_alarm_price);
    frm.set_value("installation_price", installation_price);
    frm.set_value("tdl_price", tdl_price);
    frm.set_value("tdl_winch_motorised_price", tdl_winch_motorised_price);
    frm.set_value("air_inlet_price", air_inlet_price);
    frm.set_value("air_inlet_winch_motorised_price", air_inlet_winch_motorised_price);
    frm.set_value("misc_price", misc_price);
    frm.set_value("gi_gutter_system_price", gi_gutter_system_price);
    frm.set_value("thirtysix_fan_price", thirtysix_fan_price);
    frm.set_value("filter_price", filter_price);
    frm.set_value("plumbing_material_price", plumbing_material_price);
    frm.set_value("pump_price", pump_price);
    frm.set_value("control_panel_price", control_panel_price);

    // ── Total EC system cost (Calculated using final local variables) ──
    let total_cost_of_ec_system = (
        flt(frm.doc.fan_50_price) +
        flt(frm.doc.cooling_pad_price) +
        gi_gutter_system_price +
        thirtysix_fan_price +
        filter_price +
        pump_price +
        plumbing_material_price +
        control_panel_price +
        electronic_contoller_price +
        ups_alarm_price +
        installation_price +
        tdl_price +
        tdl_winch_motorised_price +
        air_inlet_price +
        air_inlet_winch_motorised_price +
        misc_price
    );
    frm.set_value("total_cost_of_ec_system", total_cost_of_ec_system);
}

// ==== EC Price- BCG ====
frappe.ui.form.on('Cages - Commercial Layer - H Type - Brooding Cum Growing', {
    validate: async function(frm) {
        await set_ec_prices(frm);
    }
});

async function set_ec_prices(frm) {

    if (!frm.doc.fan_type)          frm.set_value("fan_50_price", 0);
    if (!frm.doc.cooling_pad_type)  frm.set_value("cooling_pad_price", 0);

    if (!frm.doc.fan_type && !frm.doc.cooling_pad_type) return;

    let doc = await get_cage_pricing_rule(frm);
    if (!doc) {
        frappe.msgprint("No active Commercial Layer BCG Pricing Rule found");
        return;
    }

    if (frm.doc.fan_type) {

        let fan_rate = 0;
        (doc.table_wkqn || []).forEach(function(row) {
            if (frm.doc.fan_type == row.fan_type) {
                fan_rate = flt(row.rate);
            }
        });

        let fan_50_price = 0;
        if (fan_rate) {
            fan_50_price = fan_rate * flt(frm.doc.tunnel_fan_count);

            if (frm.doc.display_currency && frm.doc.display_currency !== "INR") {
                let exchange_rate = flt(frm.doc.exchange_rate) || 1;
                fan_50_price = fan_50_price / exchange_rate;
            }
        } else {
            frappe.msgprint("No price found for selected fan type in Pricing Rule");
        }
        frm.set_value("fan_50_price", fan_50_price);
    }

    if (frm.doc.cooling_pad_type) {

        let cooling_pad_rate = 0;
        (doc.cooling_pad_price_table || []).forEach(function(row) {
            if (frm.doc.cooling_pad_type == row.cooling_pad_type) {
                cooling_pad_rate = flt(row.rate);
            }
        });

        let cooling_pad_price = 0;
        if (cooling_pad_rate) {
            cooling_pad_price = cooling_pad_rate * flt(frm.doc.cooling_pad_count);

            if (frm.doc.display_currency && frm.doc.display_currency !== "INR") {
                let exchange_rate = flt(frm.doc.exchange_rate) || 1;
                cooling_pad_price = cooling_pad_price / exchange_rate;
            }
        } else {
            frappe.msgprint("No price found for selected cooling pad type in Pricing Rule");
        }
        frm.set_value("cooling_pad_price", cooling_pad_price);
    }
}

function get_cage_pricing_rule(frm) {

    let date = frm.doc.date || frappe.datetime.get_today();

    return frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Commercial Layer BCG Pricing Rule",
            filters: [
                ["valid_from", "<=", date],
                ["valid_to", ">=", date]
            ],
            fields: ["name"],
            limit_page_length: 1
        }
    }).then(res => {
        if (!res || !res.message || !res.message.length) return null;
        return frappe.db.get_doc(
            "Commercial Layer BCG Pricing Rule",
            res.message[0].name
        );
    });
}

// NOTE: duplicate flt() definition (identical to the one in "EC System Logic
// -BCG") removed here - see that script's definition above.



frappe.ui.form.on('Cages - Commercial Layer - H Type - Brooding Cum Growing', {
    validate(frm) {
        calculate_values(frm);

        if (frm.doc.environment_control_system_ec) {

            let centre_height = flt(frm.doc.centre_height);
            let side_height = flt(frm.doc.side_height);

            if (flt(frm.doc.centre_height) === 0) {
                frappe.throw(__("Centre Height Should not be Zero in Environment Control System. Please Enter a Valid Value."));
            }

            if (flt(frm.doc.side_height) === 0) {
        frappe.throw(__("Side Height Should not be Zero in Environment Control System. Please Enter a Valid Value."));
            }
        }
    },

});

// ==== Silo HTML View Logic ====
frappe.ui.form.on("Cages - Commercial Layer - H Type - Brooding Cum Growing", {
    refresh(frm) {
        render_silo_pricing(frm);
    },
});

// NOTE: duplicate get_active_pricing_rule() definition (identical to the one in
// "EC System Logic -BCG") removed here - see that script's definition above.

function fmt_num(v) {
    return (parseFloat(v) || 0).toLocaleString("en-IN");
}

async function render_silo_pricing(frm) {
    let doc = await get_active_pricing_rule();
    let rows = (doc && doc.silo_price_logic_table) || [];

    let body = rows.map(function (row) {
        let capacity = row.silo_capactity || row.silo_capacity || row.capacity || "";
        let price = fmt_num(row.price);
        return `<tr>
            <td class="capacity">${frappe.utils.escape_html(String(capacity))}</td>
            <td class="cost">${price}</td>
        </tr>`;
    }).join("");

    if (!body) {
        body = `<tr><td colspan="2" style="text-align:center;">No active silo pricing found</td></tr>`;
    }

    let html = `
<style>
.price-table{ width:100%; border-collapse:collapse; font-size:12px; font-family:Arial, sans-serif; color:#333; }
.price-table th, .price-table td{ border:1px solid #dcdcdc; padding:6px 10px; text-align:center; }
.price-title{ background:#3f51b5; color:#fff; font-weight:700; font-size:13px; }
.price-header{ background:#eef1ff; font-weight:600; }
.price-table tbody tr:nth-child(odd)  td{ background:#ffffff; }
.price-table tbody tr:nth-child(even) td{ background:#f9f9f9; }
.capacity{ text-align:left; font-weight:600; }
.cost{ color:#0d47a1; font-weight:600; }
.note-box{ margin-top:8px; font-size:12px; font-family:Arial, sans-serif; background:#f7f9ff; border:1px solid #dcdcdc; padding:8px 10px; color:#333; }

/* ---------- DARK MODE ---------- */
[data-theme="dark"] .price-table, [data-theme="dark"] .capacity{ color:#e0e0e0; }
[data-theme="dark"] .price-table th, [data-theme="dark"] .price-table td{ border-color:#444; }
[data-theme="dark"] .price-header{ background:#2a2f45; color:#c5cae9; }
[data-theme="dark"] .price-table tbody tr:nth-child(odd)  td{ background:#1e1e1e; }
[data-theme="dark"] .price-table tbody tr:nth-child(even) td{ background:#262626; }
[data-theme="dark"] .cost{ color:#90caf9; }
[data-theme="dark"] .note-box{ background:#1e1e1e; border-color:#444; color:#cfcfcf; }
[data-theme="dark"] .note-box b{ color:#e8e8e8; }
</style>
<table class="price-table">
<thead>
<tr class="price-title"><th colspan="2">Silo Capacity Pricing</th></tr>
<tr class="price-header"><th>Silo Capacity</th><th>Price</th></tr>
</thead>
<tbody>
${body}
</tbody>
</table>
<div class="note-box">
<b>Fill System:</b> Common to Silo as well as Hopper (up to 3 rows) — <b>113000</b><br>
<b>Additional Row:</b> Every additional row — <b>Add 4000</b>
</div>`;

    let field = frm.get_field("html_pbnl");
    if (field) {
        field.html(html);
    }
}
