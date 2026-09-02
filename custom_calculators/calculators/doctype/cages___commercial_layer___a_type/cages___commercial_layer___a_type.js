// ==== CCL - A Type Calculations ====
frappe.ui.form.on('Cages - Commercial Layer - A Type', {

    onload: function(frm) {
        if (frm.is_new()) set_cage_defaults(frm);
    },

    validate: function(frm) {
        calculate_all(frm);
        calculate_bird_to_shed(frm);
    }

});

// Cage box defaults are fetched from the Pricing Rule (child table removed).
function set_cage_defaults(frm) {
    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Cages - Commercial Layer - A Type Pricing Rule",
            filters: [
                ["valid_from", "<=", frappe.datetime.get_today()],
                ["valid_to", ">=", frappe.datetime.get_today()]
            ],
            fields: ["default_front", "default_depth", "default_front_height", "default_back_height", "default_bird_per_box"],
            limit_page_length: 1
        }
    }).then(r => {
        let d = (r.message && r.message[0]) || {};
        frm.set_value("front", flt(d.default_front) || 20);
        frm.set_value("depth", flt(d.default_depth) || 15);
        frm.set_value("front_height", flt(d.default_front_height) || 17);
        frm.set_value("back_height", flt(d.default_back_height) || 15);
        frm.set_value("bird_per_box", flt(d.default_bird_per_box) || 5);
        frm.set_value("gap", 3);
    });
}

function calculate_all(frm) {
    const d      = frm.doc;
    const method = d.calculation_method;
    if (!method) return;

    const front        = flt(d.front);
    const depth        = flt(d.depth);
    const bird_per_box = flt(d.bird_per_box);
    const rows         = flt(d.rows);
    const tiers        = cint(d.tiers);

    // ── Width Calculation ───────────────────────────
    const row_width = tiers === 3 ? 8.5 : tiers === 2 ? 6 : 0;
    frm.set_value('row_width', row_width);

    const no_of_rows = rows || 0;
    const no_of_gaps = no_of_rows + 1;
    frm.set_value('no_of_gaps', no_of_gaps);

    const calculated_width =
        (row_width * no_of_rows) + (3 * no_of_gaps);

    frm.set_value('calculated_width', calculated_width);

    // ── Common Calculations ─────────────────────────
    const birds_per_section =
        (front > 0 && bird_per_box > 0 && tiers > 0)
            ? Math.floor(120 / front) * bird_per_box * 2 * tiers
            : 0;

    const area_per_bird =
        bird_per_box > 0 ? (front * depth) / bird_per_box : 0;

    frm.set_value('birds_per_section', birds_per_section);
    frm.set_value('area_per_bird', area_per_bird);

    // ── Shed To Bird ───────────────────────────────
    if (method === 'Shed To Bird') {

        const shed_len   = flt(d.shed_size_length);
        const shed_width = flt(d.shed_size_width);
        const left       = flt(d.space_left_from_left_side);
        const right      = flt(d.space_left_from_right_side);

        const total_space = left + right;
        frm.set_value('total_space_to_leave', total_space);

        const reduce = shed_len - total_space;
        frm.set_value('reduce_from_shed_length', reduce);

        const cage_length = reduce;
        frm.set_value('cage_length', cage_length);

        const no_of_section_per_row = cage_length > 0 ? cage_length / 10 : 0;
        frm.set_value('no_of_section_per_row', no_of_section_per_row);

        const total_no_of_section = no_of_section_per_row * rows;
        frm.set_value('total_no_of_section', total_no_of_section);

        frm.set_value('total_no_of_birds', birds_per_section * total_no_of_section);

        const total_row_gap =
            tiers === 3 ? shed_width - (8.5 * rows) :
            tiers === 2 ? shed_width - (6 * rows) : 0;

        frm.set_value('total_row_gap', total_row_gap);

        // Gap remains user input
    }
}


function calculate_bird_to_shed(frm) {
    const d = frm.doc;

    if (d.calculation_method !== 'Bird To Shed') return;

    const front        = flt(d.front);
    const depth        = flt(d.depth);
    const bird_per_box = flt(d.bird_per_box);
    const rows         = flt(d.rows);
    const tiers        = cint(d.tiers);
    const no_of_birds  = flt(d.no_of_birds);
    const left_space   = flt(d.space_left_from_left_side);
    const right_space  = flt(d.space_left_from_right_side);


    const birds_per_section =
        (front > 0 && bird_per_box > 0 && tiers > 0)
            ? (Math.ceil(120 / front) * bird_per_box * 2 * tiers)
            : 0;

    frm.set_value('birds_per_section', birds_per_section);

    const no_of_section_per_row =
        (birds_per_section > 0 && rows > 0)
            ? Math.ceil(no_of_birds / birds_per_section / rows)
            : 0;

    frm.set_value('no_of_section_per_row', no_of_section_per_row);

    const total_no_of_section = no_of_section_per_row * rows;
    frm.set_value('total_no_of_section', total_no_of_section);

    const total_no_of_birds = total_no_of_section * birds_per_section;
    frm.set_value('total_no_of_birds', total_no_of_birds);

    const cage_length =
        no_of_section_per_row * ((front * 6) / 12);

    frm.set_value('cage_length', cage_length);

    const reduce_from_shed_length = left_space + right_space ;
    frm.set_value('reduce_from_shed_length', reduce_from_shed_length);

    const shed_size_length = cage_length + reduce_from_shed_length;
    frm.set_value("shed_size_length", shed_size_length);

    const shed_size_width = (3 * tiers * rows) + ((rows + 1) * 3.5);
    frm.set_value("shed_size_width", shed_size_width);

    const area_per_bird =
        bird_per_box > 0 ? (front * depth) / bird_per_box : 0;

    frm.set_value('area_per_bird', area_per_bird);

    const shed_width = flt(d.shed_size_width);

    let total_row_gap = 0;
    let gap = 0;

    if (tiers === 3) {
        total_row_gap = shed_width - (8.5 * rows);
        gap = (rows + 1) > 0 ? total_row_gap / (rows + 1) : 0;
    } else if (tiers === 2) {
        total_row_gap = shed_width - (6.5 * tiers);
        gap = (rows + 1) > 0 ? total_row_gap / (rows + 1) : 0;
    }

    frm.set_value('total_row_gap', total_row_gap);
    frm.set_value('gap', gap);
}

// ==== Pricing Logic ====
frappe.ui.form.on('Cages - Commercial Layer - A Type', {
    validate: function(frm) {
        calculate_cost(frm);
    },
    no_of_birds: function(frm) {
        calculate_cost(frm);
    },
    cage_type: function(frm) {
        calculate_cost(frm);
    },
    additional_nipple: function(frm) {
        calculate_cost(frm);
    },
    drip_cup: function(frm) {
        calculate_cost(frm);
    },
    water_channel: function(frm) {
        calculate_cost(frm);
    },
    with_gi_framework: function(frm) {
        calculate_cost(frm);
    }
});
function calculate_cost(frm) {
    let fx = flt(frm.doc.exchange_rate) || 1;

    let birds = frm.doc.total_no_of_birds || 0;
    let cage_type = frm.doc.cage_type;

    if (!birds || !cage_type) return;

    if (cage_type === "Complete cage system with installation"){
        console.log("matched")
        frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Cages - Commercial Layer - A Type Pricing Rule",
            filters: [
                ["valid_from", "<=", frappe.datetime.get_today()],
                 ["valid_to", ">=", frappe.datetime.get_today()]
            ],
        fields: ["name"],
        limit_page_length: 1
    }
}).then(res => {

    if (!res.message.length) return;

    let parent_name = res.message[0].name;

    return frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Cages - Commercial Layer - A Type Pricing Rule",
            name: parent_name
        }
    }).then(r => {

        let rows = r.message.cage_costing_with_complete_cage_system_with_installation || [];
        let found = false;

        rows.forEach(function(row){
                if(birds >= row.from_capacity && birds<=row.to_capacity){

                let rate_per_bird = row.rates ;
                //frm.set_value("rate_per_bird", rate_per_bird / fx) ;

                //let total_cost = (rate_per_bird * birds) / fx;

// Add addon costs
if (frm.doc.additional_nipple) {
    rate_per_bird += flt(r.message.additional_nipple || 0);
}

if (frm.doc.drip_cup) {
    rate_per_bird += flt(r.message.drip_cup || 0);
}

if (frm.doc.water_channel) {
    rate_per_bird += flt(r.message.water_channel || 0);
}

if (frm.doc.with_gi_framework) {
    rate_per_bird += flt(r.message.with_gi_framework || 0);
}

frm.set_value("rate_per_bird", rate_per_bird / fx) ;
let total_cost = (rate_per_bird * birds) / fx;

frm.set_value("total_cost", total_cost);

                found = true;
                }
        });

        if(!found){
            frm.set_value("rate_per_bird",0);
        }

    });
});
    }


if (cage_type === "Without steel without installation"){

        frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Cages - Commercial Layer - A Type Pricing Rule",
            filters: [
                ["valid_from", "<=", frappe.datetime.get_today()],
                 ["valid_to", ">=", frappe.datetime.get_today()]
            ],
        fields: ["name"],
        limit_page_length: 1
    }
}).then(res => {

    if (!res.message.length) return;

    let parent_name = res.message[0].name;

    return frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Cages - Commercial Layer - A Type Pricing Rule",
            name: parent_name
        }
    }).then(r => {

        let rows = r.message.cage_costing_without_steel_without_installation || [];
        let found = false;

        rows.forEach(function(row){
            if(birds >= row.from_capacity && birds<=row.to_capacity){
                let rate_per_bird = row.rates ;
                //frm.set_value("rate_per_bird", rate_per_bird / fx) ;

                //let total_cost = (rate_per_bird * birds) / fx;

// Add addon costs
if (frm.doc.additional_nipple) {
    rate_per_bird += flt(r.message.additional_nipple || 0);
}

if (frm.doc.drip_cup) {
    rate_per_bird += flt(r.message.drip_cup || 0);
}

if (frm.doc.water_channel) {
    rate_per_bird += flt(r.message.water_channel || 0);
}

if (frm.doc.with_gi_framework) {
    rate_per_bird += flt(r.message.with_gi_framework || 0);
}

                frm.set_value("rate_per_bird", rate_per_bird / fx) ;

                let total_cost = (rate_per_bird * birds) / fx;


frm.set_value("total_cost", total_cost);

                found = true;
            }
        });

        if(!found){
            frm.set_value("rate_per_bird",0);
        }

    });
});


    }

if (cage_type === "only weldmesh"){

        frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Cages - Commercial Layer - A Type Pricing Rule",
            filters: [
                ["valid_from", "<=", frappe.datetime.get_today()],
                 ["valid_to", ">=", frappe.datetime.get_today()]
            ],
        fields: ["name"],
        limit_page_length: 1
    }
}).then(res => {

    if (!res.message.length) return;

    let parent_name = res.message[0].name;

    return frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Cages - Commercial Layer - A Type Pricing Rule",
            name: parent_name
        }
    }).then(r => {

        let rows = r.message.only_weldmesh || [];
        let found = false;

        rows.forEach(function(row){
            if(birds >= row.from_capacity && birds<=row.to_capacity){
                let rate_per_bird = row.rates ;
                // frm.set_value("rate_per_bird", rate_per_bird / fx) ;

                // let total_cost = (rate_per_bird * birds) / fx;

// Add addon costs
if (frm.doc.additional_nipple) {
    rate_per_bird += flt(r.message.additional_nipple || 0);
}

if (frm.doc.drip_cup) {
    rate_per_bird += flt(r.message.drip_cup || 0);
}

if (frm.doc.water_channel) {
    rate_per_bird += flt(r.message.water_channel || 0);
}

if (frm.doc.with_gi_framework) {
    rate_per_bird += flt(r.message.with_gi_framework || 0);
}

 frm.set_value("rate_per_bird", rate_per_bird / fx) ;

let total_cost = (rate_per_bird * birds) / fx;

frm.set_value("total_cost", total_cost);
                found = true;
            }

        });

        if(!found){
            frm.set_value("rate_per_bird",0);
        }

    });
});
    }

    //  frappe.call({
    //     method: 'frappe.client.get_list',
    //     args: {
    //         doctype: 'Cages - Commercial Layer - A Type Pricing Rule',
    //         fields: ['additional_nipple', 'drip_cup', 'water_channel', 'with_gi_framework'],
    //         limit: 1
    //     },
    //     callback: function(response) {
    //         if (response.message && response.message.length > 0) {
    //             let pricing = response.message[0];
    //             let base_cost = frm.doc.total_cost || 0; // replace with your base cost field
    //             let addon_total = 0;

    //             if (frm.doc.additional_nipple) addon_total += flt(pricing.additional_nipple);
    //             if (frm.doc.drip_cup)          addon_total += flt(pricing.drip_cup);
    //             if (frm.doc.water_channel)     addon_total += flt(pricing.water_channel);
    //             if (frm.doc.with_gi_framework) addon_total += flt(pricing.with_gi_framework);

    //             frm.set_value('total_cost', base_cost + addon_total);
    //         }
    //     }
    // });

}





frappe.ui.form.on('Cages - Commercial Layer - A Type', {

    validate: function(frm) {
        calculate_row_cost(frm);
    }
});

function calculate_row_cost(frm) {
    let fx = flt(frm.doc.exchange_rate) || 1;

    let rows = frm.doc.rows;
    frm.set_value("noof_rows_per_shed_aft" , rows);

    frappe.call({
    method: "frappe.client.get_list",
    args: {
        doctype: "Cages - Commercial Layer - A Type Pricing Rule",
        filters: [
            ["valid_from", "<=", frappe.datetime.get_today()],
            ["valid_to", ">=", frappe.datetime.get_today()]
        ],
        fields: ["name"],
        limit_page_length: 1
    }
}).then(res => {

    if (!res.message.length) return;

    return frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Cages - Commercial Layer - A Type Pricing Rule",
            name: res.message[0].name
        }
    });

}).then(r => {

    if (!r) return;

    let no_of_rows = frm.doc.noof_rows_per_shed_aft || 0;

    let base_amount = r.message.for_2_rows || 0;
    let additional_amount = r.message.addition_for_more_than_2_rows || 0;

    let total_amount = 0;

    if (no_of_rows >= 2) {
        total_amount = base_amount + ((no_of_rows - 2) * additional_amount);
    }

    frm.set_value("total_cost_all_rows_per_shed_aft", total_amount / fx);

});
   }








frappe.ui.form.on('Cages - Commercial Layer - A Type', {

    validate: function(frm) {
        calculate_egg_collection(frm);
    }
});

function calculate_egg_collection(frm) {
    let fx = flt(frm.doc.exchange_rate) || 1;

    let rows = frm.doc.rows;
    frm.set_value("noof_rows_per_shed_ecs" , rows);


    frappe.call({
    method: "frappe.client.get_list",
    args: {
        doctype: "Cages - Commercial Layer - A Type Pricing Rule",
        filters: [
            ["valid_from", "<=", frappe.datetime.get_today()],
            ["valid_to", ">=", frappe.datetime.get_today()]
        ],
        fields: ["name"],
        limit_page_length: 1
    }
}).then(res => {

    if (!res.message.length) return;

    return frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Cages - Commercial Layer - A Type Pricing Rule",
            name: res.message[0].name
        }
    });

}).then(r => {

    if (!r) return;

    let no_of_rows = frm.doc.noof_rows_per_shed_ecs || 0;

    let rate_per_row = r.message.for_1_row || 0;

    let total_amount = no_of_rows * rate_per_row;

    frm.set_value("total_cost_all_rows_per_shed_ecs", total_amount / fx);

});
}


frappe.ui.form.on('Cages - Commercial Layer - A Type', {

    validate: function(frm) {
        calculate_scrapper_system(frm);
    }
});

function calculate_scrapper_system(frm){
    let fx = flt(frm.doc.exchange_rate) || 1;

let rows_scrapper = frm.doc.rows || 0;
frm.set_value("rows_scrapper" , rows_scrapper)

let shed_size_scrapper = frm.doc.shed_size_length || 0;
frm.set_value("shed_size_scrapper" , shed_size_scrapper )

frappe.call({
    method: "frappe.client.get_list",
    args: {
        doctype: "Cages - Commercial Layer - A Type Pricing Rule",
        filters: [
            ["valid_from", "<=", frappe.datetime.get_today()],
            ["valid_to", ">=", frappe.datetime.get_today()]
        ],
        fields: ["name"],
        limit_page_length: 1
    }
}).then(res => {

    if (!res.message.length) return;

    return frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Cages - Commercial Layer - A Type Pricing Rule",
            name: res.message[0].name
        }
    });

}).then(r => {

    if (!r) return;

    let pricing_rows = r.message.scrapper_system || [];
    let found = false;

    pricing_rows.forEach(function(row) {

        if (
            shed_size_scrapper  >= row.shed_length_start &&
            shed_size_scrapper  <= row.shed_length_end &&
            rows_scrapper == row.rows
        ) {
            frm.set_value(
                "total_price_of_scrapper_system",
                row.rates / fx
            );

            frm.set_value("motar_type" ,row.drive_motor)
            console.log(row.drive_motor)
            found = true;
        }
    });

    if (!found) {
        frm.set_value(
            "total_price_of_scrapper_system",
            0
        );
    }
});


}



frappe.ui.form.on('Cages - Commercial Layer - A Type', {

    total_no_of_birds: function(frm) {
        frm.trigger('calculate_silo_capacity');
    },

    days: function(frm) {
        frm.trigger('calculate_silo_capacity');
    },

    feed_capacity: function(frm) {
        frm.trigger('calculate_silo_capacity');
    },

    validate: function(frm) {
        frm.trigger('calculate_silo_capacity');
    },

    calculate_silo_capacity: function(frm) {
        let birds = frm.doc.total_no_of_birds || 1;
        let days = frm.doc.days || 1;
        let feed_capacity = frm.doc.feed_capacity || 1;

        let result = birds * days * feed_capacity;

        frm.set_value('silo__capacity_estimated', result);
    }
});


frappe.ui.form.on('Cages - Commercial Layer - A Type', {

    silo: function(frm) {

        if (frm.doc.silo) {
            frm.set_value("fill_system", frm.doc.silo);
        }

    }

});
// frappe.ui.form.on('Cages - Commercial Layer - A Type', {

//     fill_system_for_1_ton_hopper: function(frm) {

//         if (frm.doc.fill_system_for_1_ton_hopper) {
//             frm.set_value("one_ton_hopper_with_boot", frm.doc.fill_system_for_1_ton_hopper);
//         }

//     }

// });

frappe.ui.form.on('Cages - Commercial Layer - A Type', {

    silo_capacity_ton: function(frm) {
        set_silo_price(frm);
    },

    validate: function(frm) {
        set_silo_price(frm);
    }

});

async function set_silo_price(frm) {
    let fx = flt(frm.doc.exchange_rate) || 1;

    let capacity = frm.doc.silo_capacity_ton || "";
    let date = frm.doc.date || frappe.datetime.get_today();

    console.log("Selected Capacity:", capacity);

    if (!capacity) {
        frm.set_value("silo_rate", 0);
        frm.set_value("silo_amount", 0);
        return;
    }

    try {
        let res = await frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Cages - Commercial Layer - A Type Pricing Rule",
                filters: [
                    ["valid_from", "<=", date],
                    ["valid_to", ">=", date]
                ],
                fields: ["name"],
                limit_page_length: 1
            }
        });

        console.log("Pricing Rule:", res.message);

        if (!res.message || !res.message.length) {
            frappe.msgprint("No Pricing Rule found");
            return;
        }

        let doc = await frappe.db.get_doc(
            "Cages - Commercial Layer - A Type Pricing Rule",
            res.message[0].name
        );

        let table = doc.silo_price_logic_table || [];
        console.log("Silo Table:", table);

        let row = table.find(r => r.silo_capactity == capacity);

        console.log("Matched Row:", row);

        let price = row ? row.price : 0;

        frm.set_value("silo_rate", price / fx);
        frm.set_value("silo_amount", price / fx);

        // if (!row) {
        //     frappe.msgprint("No Silo price found for selected capacity");
        // }

    } catch (err) {
        console.error("Error:", err);
        frappe.msgprint("Error fetching silo price");
    }
}



frappe.ui.form.on('Cages - Commercial Layer - A Type', {

    rows: function(frm) {

        if (frm.doc.rows) {
            frm.set_value("no_of_rows", frm.doc.rows);
            frm.set_value("no_of_rows_fill", frm.doc.rows);
            frm.set_value("no_of_rows_silo", frm.doc.rows);

        }

    },
    validate: function(frm) {

        if (frm.doc.rows) {
            frm.set_value("no_of_rows", frm.doc.rows);
            frm.set_value("no_of_rows_fill", frm.doc.rows);
                        frm.set_value("no_of_rows_silo", frm.doc.rows);

        }

    }

});


frappe.ui.form.on('Cages - Commercial Layer - A Type', {

    no_of_rows: function(frm) {
        calculate_fill_system(frm);
    },

    validate: function(frm) {
        calculate_fill_system(frm);
    }

});

function calculate_fill_system(frm) {
    let fx = flt(frm.doc.exchange_rate) || 1;

    let rows = frm.doc.rows || 0;
    let base_rate = frm.doc.cost_upto_3_rows || 113000;
    let extra_rate = frm.doc.additional_row_value_to_add || 4000;

    let rate = 0;

    if (rows <= 3) {
        rate = base_rate;
    } else {
        let extra_rows = rows - 3;
        rate = base_rate + (extra_rows * extra_rate);
    }

    frm.set_value("rate_per_running_feet", rate / fx);
    frm.set_value("fill_system_amount", rate / fx);
}









frappe.ui.form.on('Cages - Commercial Layer - A Type', {

    no_of_rows_fill: function(frm) {
        calculate_fill_systems(frm);
    },

    validate: function(frm) {
        calculate_fill_systems(frm);
    }

});

function calculate_fill_systems(frm) {
    let fx = flt(frm.doc.exchange_rate) || 1;

    let rows = frm.doc.no_of_rows_fill || 0;
    let base_rate = frm.doc.cost_3_rows || 113000;
    let extra_rate = frm.doc.add_row_value || 4000;

    let rate = 0;

    if (rows <= 3) {
        rate = base_rate;
    } else {
        let extra_rows = rows - 3;
        rate = base_rate + (extra_rows * extra_rate);
    }

    frm.set_value("rate_per_running_feet_fill", rate / fx);
    frm.set_value("fill_system_amounts", rate / fx);
}


frappe.ui.form.on('Cages - Commercial Layer - A Type', {

    silo_amount: function(frm) {
        calculate_total_silo_cost(frm);
    },

    fill_system_amount: function(frm) {
        calculate_total_silo_cost(frm);
    },
    loader_amount: function(frm) {
        calculate_total_silo_cost(frm);
    },

        weighing_system_cost: function(frm) {
        calculate_total_silo_cost(frm);
    },

    silo_w_system: function(frm) {
        calculate_total_silo_cost(frm);
    },

    validate: function(frm) {
        calculate_total_silo_cost(frm);
    }

});

function calculate_total_silo_cost(frm) {

    let silo_amount = frm.doc.silo_amount || 0;
    let fill_system_amount = frm.doc.fill_system_amount || 0;
    let loader_amount = frm.doc.loader_amount || 0;

    let total = silo_amount ;

      if(frm.doc.loader) {
          total += frm.doc.loader_amount;
      }

      if(frm.doc.fill_system == "Needed"){
        total = total + fill_system_amount;
    }

      if (frm.doc.silo_w_system) {
        total += frm.doc.weighing_system_cost;
    }

    frm.set_value("total_silo_cost", total);
}


frappe.ui.form.on('Cages - Commercial Layer - A Type', {

    fill_system_amounts: function(frm) {
        calculate_total_hopper(frm);
    },
    hopper_amount: function(frm) {
        calculate_total_hopper(frm);
    },

    validate: function(frm) {
        calculate_total_hopper(frm);
    }

});

function calculate_total_hopper(frm) {

    let fill_system_amounts = frm.doc.fill_system_amounts || 0;
    let hopper_amount = frm.doc.hopper_amount || 0;

    let total = fill_system_amounts;

      if(frm.doc.one_ton_hopper_with_boot == "Needed"){
        total = total + hopper_amount;
    }

    frm.set_value("total_1_ton_hopper_with_fill_system", total);
}

// ---- Multi-currency: reconvert amounts when currency / exchange rate changes ----
frappe.ui.form.on('Cages - Commercial Layer - A Type', {
    exchange_rate: function(frm){ pl_recompute_currency(frm); },
    display_currency: function(frm){ pl_recompute_currency(frm); }
});
function pl_recompute_currency(frm){
    calculate_cost(frm);
    calculate_row_cost(frm);
    calculate_egg_collection(frm);
    calculate_scrapper_system(frm);
    set_silo_price(frm);
    calculate_fill_system(frm);
    calculate_fill_systems(frm);
    calculate_total_silo_cost(frm);
    calculate_total_hopper(frm);
}

// ==== CL A Type -EC Type ====
frappe.ui.form.on("Cages - Commercial Layer - A Type", {
    validate(frm) {
        // Return the promise so Frappe waits for it to complete before saving
        return calculate_values(frm);
    },
    side_height: calculate_values,
    centre_height: calculate_values,
    shed_lenght: calculate_values,
    shed_width: calculate_values,
});

// ─── Helper: safe float parse ───
function flt(v) {
    return parseFloat(v) || 0;
}

// ─── Helper: round up to next even number ───
function next_even(value) {
    if (Number.isInteger(value) && value % 2 === 0) {
        return value;
    }
    let val = Math.ceil(value);
    if (val % 2 !== 0) {
        val += 1;
    }
    return val;
}

// ─── Helper: fetch active A Type Pricing Rule (Optimized - single fetch) ───
function get_active_pricing_rule() {
    return frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Cages - Commercial Layer - A Type Pricing Rule",
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
                doctype: "Cages - Commercial Layer - A Type Pricing Rule",
                name: res.message[0].name,
            },
        }).then((r) => (r ? r.message : null));
    });
}

// ─── Helper: fetch Standard Selling rate for an item ───
function get_item_price(item_code) {
    return frappe.call({
        method: "frappe.client.get_value",
        args: {
            doctype: "Item Price",
            filters: {
                item_code: item_code,
                price_list: "Standard Selling",
            },
            fieldname: "price_list_rate",
        },
    }).then((r) => (r && r.message ? flt(r.message.price_list_rate) : null));
}

// ═══════════════════════════════════════════════
//  Main calculation function
// ═══════════════════════════════════════════════
async function calculate_values(frm) {

    let fx = flt(frm.doc.exchange_rate) || 1;

    // ── Shed dimensions ──
    let shed_lenght = flt(frm.doc.shed_size_length);
    let shed_width = flt(frm.doc.shed_size_width);
    frm.set_value("shed_lenght", shed_lenght);
    frm.set_value("shed_width", shed_width);

    // ── Average height ──
    let side_height = flt(frm.doc.side_height);
    let centre_height = flt(frm.doc.centre_height);
    let average_height = (side_height + centre_height) / 2;
    frm.set_value("average_height", average_height);

    // ── Pump type based on gutter system ──
    if (frm.doc.gutter_system_type === "Aluminium") {
        frm.set_value("pump_type", "Submersible pump");
    } else if (frm.doc.gutter_system_type === "PVC") {
        frm.set_value("pump_type", "Centrifugal pump");
    }

    // ── Volume & airflow ──
    let total_area_in_cu_ft = shed_lenght * shed_width * average_height;
    frm.set_value("total_area_in_cu_ft", total_area_in_cu_ft);

    let air_exchange = flt(frm.doc.air_exchange);
    let total_cfm = total_area_in_cu_ft * air_exchange;
    frm.set_value("total_cfm", total_cfm);

    // ── Fan capacity by type ──
        // ── Fan capacity by type (from Pricing Rule) ──
    let fan_capacity_cfm = 0;
    let fan_capacity_cmh_vsf = 0;
    let fan_capacity_cmh_vai = 0;

    // Fetch the pricing rule doc ONCE (used here and below)
    let doc = await get_active_pricing_rule();

    if (doc) {
        let fan_rows = doc.table_wkqn || [];
        fan_rows.forEach(function (row) {
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

    // ── Fetch the pricing rule doc ONCE ──
    // let doc = await get_active_pricing_rule();

    // ── Electronic Controller ──
    let humidity_sensor = flt(frm.doc.humidity_sensor);
    let temperature_sensor = flt(frm.doc.temperature_sensor);
    let relay = flt(frm.doc.relay);
    let electronic_contoller_price = flt(frm.doc.electronic_contoller_price);

    // ── Pump quantity & HP ──
    let pump_hp = 2;
    let pump_quantity = 3;

    if (doc) {
        let rows_ec = doc.lectronic_controller_ec || [];
        rows_ec.forEach(function (row) {
            if (frm.doc.eletronic_cotroller_type == row.electronic_controller_type) {
                humidity_sensor = row.humidity_sensor;
                temperature_sensor = row.temperature_sensor;
                relay = row.relay;
                electronic_contoller_price = row.price;
            }
        });

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
    }

    frm.set_value("humidity_sensor", humidity_sensor);
    frm.set_value("temperature_sensor", temperature_sensor);
    frm.set_value("relay", relay);
    frm.set_value("electronic_contoller_price", electronic_contoller_price / fx);
    frm.set_value("pump_hp", pump_hp);
    frm.set_value("pump_quantity", pump_quantity);

    let filter = pump_quantity;
    frm.set_value("filter", filter);
    frm.set_value("tdl_motor", filter);

    // ── Fan item price (guard preserved from original) ──
    // if (!frm.doc.fan_type) return;

    // let fan_50_price = 0;
    // let fan_rate = await get_item_price(frm.doc.fan_type);
    // if (fan_rate !== null) {
    //     fan_50_price = fan_rate * tunnel_fan_count;
    // } else {
    //     fan_50_price = 0;
    //     frappe.msgprint("No price found for selected item");
    // }

    // ── Cooling pad item price (guard preserved from original) ──
    // if (!frm.doc.cooling_pad_type) return;

    // let cooling_pad_price = 0;
    // let pad_rate = await get_item_price(frm.doc.cooling_pad_type);
    // if (pad_rate !== null) {
    //     cooling_pad_price = pad_rate * cooling_pad_count;
    // } else {
    //     cooling_pad_price = 0;
    //     frappe.msgprint("No price found for selected item");
    // }

    // ── Initialize Pricing Rule Variables ──
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

    if (doc) {
        // EC System pricing
        let ups_alarm_val = doc.ups_alarm || 3500;
        ups_alarm_price = flt(frm.doc.alarm_system) * ups_alarm_val;

        let installation_val = doc.installation || 31000;
        installation_price = 1 * installation_val;

        if (frm.doc.tdl_check == 1) {
            let tdl_val = doc.tdl;
            let tdl_price_price = 12 * cooling_pad_count * tdl_val;
            tdl_price = tdl_price_price || 222000;

            let tdl_winch_val = doc.tdl_winch || 75000;
            tdl_winch_motorised_price = filter * tdl_winch_val;
        }

        if (frm.doc.air_inlet == 1) {
            let air_inlet_val = doc.air_inlet || 4000;
            air_inlet_price = air__inlet_count * air_inlet_val;

            let air_inlet_winch_val = doc.air_inlet_winch || 50000;
            air_inlet_winch_motorised_price = 2 * air_inlet_winch_val;
        }

        misc_price = 1 * (doc.misc || 0);

        if (frm.doc.gutter_system == "1") {
            let gi_rate = doc.gi_gutter_system || 1200;
            gi_gutter_system_price = (cooling_pad_count * 2) * gi_rate;
        }

        if (frm.doc.minimum_ventilation_fan == 1) {
            let thirtysix_fan_val = doc.thirtysix_fan_price || 29000;
            thirtysix_fan_price = side_fan_count * thirtysix_fan_val;
        }

        let filter_val = doc.filter || 2000;
        filter_price = filter * filter_val;

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

    // ── Currency Conversion ──
    // fan_50_price = fan_50_price / fx;
    // cooling_pad_price = cooling_pad_price / fx;
    ups_alarm_price = ups_alarm_price / fx;
    installation_price = installation_price / fx;
    tdl_price = tdl_price / fx;
    tdl_winch_motorised_price = tdl_winch_motorised_price / fx;
    air_inlet_price = air_inlet_price / fx;
    air_inlet_winch_motorised_price = air_inlet_winch_motorised_price / fx;
    misc_price = misc_price / fx;
    gi_gutter_system_price = gi_gutter_system_price / fx;
    thirtysix_fan_price = thirtysix_fan_price / fx;
    filter_price = filter_price / fx;
    plumbing_material_price = plumbing_material_price / fx;
    pump_price = pump_price / fx;
    control_panel_price = control_panel_price / fx;

    // ── Apply values to form ──
    // frm.set_value("fan_50_price", fan_50_price);
    // frm.set_value("cooling_pad_price", cooling_pad_price);
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
        (electronic_contoller_price / fx) +
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

// ---- Multi-currency: reconvert EC total when currency / exchange rate changes ----
frappe.ui.form.on('Cages - Commercial Layer - A Type', {
    exchange_rate: calculate_values,
    display_currency: calculate_values
});

// ==== Curtain Winching System - A Type ====
frappe.ui.form.on('Cages - Commercial Layer - A Type', {
    validate: function(frm) {
        cws(frm);
    }
});

function cws(frm) {
    let fx = flt(frm.doc.exchange_rate) || 1;

    // --- Sync: copy fields ---
    frm.set_value("shed_length_cws", frm.doc.shed_size_length);
    frm.set_value("side_height_cws", frm.doc.side_height);
    frm.set_value("cooling_pad_count_cws", frm.doc.cooling_pad_count);


    // --- GSM options ---
    let options = [];
    if (frm.doc.type == "Only Curtain") {
        options = ["120", "150", "200", "250", "300"];
    } else if (frm.doc.type == "Curtain With Winching") {
        options = ["200", "250", "300"];
    }
    frm.set_df_property("gsm", "options", options.join("\n"));

    // frm.set_value("curtain_type_cc", frm.doc.curtain_type);
    // frm.set_value("gsm_cp_cc", frm.doc.gsm);

    // --- doc_name for curtain/winching ---
    let doc_name = "";
    if (frm.doc.type == "Only Curtain" && frm.doc.curtain_type == "HDPE") {
        doc_name = "only_curtain_hdpe";
    } else if (frm.doc.type == "Only Curtain" && frm.doc.curtain_type == "PE") {
        doc_name = "only_curtain_pe";
    } else if (frm.doc.type == "Curtain With Winching" && frm.doc.curtain_type == "HDPE") {
        doc_name = "curtain_winching_hdpe";
    } else if (frm.doc.type == "Curtain With Winching" && frm.doc.curtain_type == "PE") {
        doc_name = "curtain_winching_pe";
    }

    // --- doc_name_cc: always only_curtain table based on curtain_type ---
    let doc_name_cc = "";
    if (frm.doc.curtain_type == "HDPE") {
        doc_name_cc = "only_curtain_hdpe";
    } else if (frm.doc.curtain_type == "PE") {
        doc_name_cc = "only_curtain_pe";
    }

    // --- doc_name2 for curtain below platform ---
    let doc_name2 = "";
    if (frm.doc.curtain_type == "HDPE") {
        doc_name2 = "curtain_below_platform_hdpe";
    } else if (frm.doc.curtain_type == "PE") {
        doc_name2 = "curtain_below_platform_pe";
    }

    // --- Sync calculations that do NOT need rates ---
    let shed_length_cws = frm.doc.shed_size_length;
    let side_height_cws = frm.doc.side_height;
    let cooling_pad_count_cws = frm.doc.cooling_pad_count;

    let shed_length_ech = shed_length_cws - cooling_pad_count_cws - frm.doc.space_left_10_ft;
    frm.set_value("shed_length_ech", shed_length_ech);
    frm.set_value("side_height_ech", frm.doc.side_height);

    let shed_length_c = shed_length_cws - cooling_pad_count_cws - frm.doc.space_left_20_ft;
    frm.set_value("shed_length_c", shed_length_c);
    frm.set_value("side_height_c", frm.doc.side_height);

    let shed_length_cc = shed_length_cws + 10;
    frm.set_value("shed_length_cc", shed_length_cc);

    let side_height_cc = frm.doc.shed_width + 5;
    frm.set_value("side_height_cc", side_height_cc);

    frm.set_value("cooling_pad_no", frm.doc.cooling_pad_count);

    frappe.call({
    method: "frappe.client.get_list",
    args: {
        doctype: "Cages - Commercial Layer - A Type Pricing Rule",
        filters: [
            ["valid_from", "<=", frappe.datetime.get_today()],
            ["valid_to", ">=", frappe.datetime.get_today()]
        ],
        fields: ["name", "cooling_pad_curtain_price"],
        limit_page_length: 1
    }
}).then(res => {
    if (!res.message.length) return;
    frm.set_value("rate_cpc", res.message[0].cooling_pad_curtain_price / fx);
    //frm.set_value("curtain_winching_cpc",)
});


     let curtain_winching_cpc = frm.doc.cooling_pad_count * frm.doc.height_of_cp * 2 * frm.doc.rate_cpc;
     frm.set_value("curtain_winching_cpc", curtain_winching_cpc);

    frappe.call({
    method: "frappe.client.get_list",
    args: {
        doctype: "Cages - Commercial Layer - A Type Pricing Rule",
        filters: [
            ["valid_from", "<=", frappe.datetime.get_today()],
            ["valid_to", ">=", frappe.datetime.get_today()]
        ],
        fields: ["name", "white_curtain_price"],
        limit_page_length: 1
    }
}).then(res => {
    if (!res.message.length) return;
    frm.set_value("rate_wc", res.message[0].white_curtain_price / fx);
    //frm.set_value("curtain_winching_cpc",)
});

    let shed_size_wc = shed_length_cws - cooling_pad_count_cws;
    frm.set_value("shed_size_wc", shed_size_wc);

    let curtain_winching_wc = shed_size_wc * frm.doc.height_of_wc * 2 * frm.doc.rate_wc;
    frm.set_value("curtain_winching_wc", curtain_winching_wc);

    let shed_length_cbp = frm.doc.shed_size_length ;
    frm.set_value("shed_length_cbp" , shed_length_cbp)

    let shed_width_cpc = frm.doc.side_height
    frm.set_value("shed_width_cpc" , shed_width_cpc)

    // --- Single async fetch ---
    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Cages - Commercial Layer - A Type Pricing Rule",
            filters: [
                ["valid_from", "<=", frappe.datetime.get_today()],
                ["valid_to", ">=", frappe.datetime.get_today()]
            ],
            fields: ["name"],
            limit_page_length: 1
        }
    }).then(res => {
        if (!res.message || !res.message.length) {
            frappe.msgprint("No valid pricing rule found for today.");
            return;
        }

        let parent_name = res.message[0].name;

        return frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Cages - Commercial Layer - A Type Pricing Rule",
                name: parent_name
            }
        }).then(r => {
            let doc = r.message;

            // --- Rows from doc_name (curtain/winching rates) ---
            let rows1 = doc[doc_name] || [];
            rows1.forEach(function(row) {
                if (frm.doc.gsm == row.gsm) {
                    frm.set_value("rate_curtain_winching", row.rate / fx);
                    frm.set_value("rate_ech", row.rate / fx);
                    frm.set_value("rate_c", row.rate / fx);

                    let curtain_winching = (shed_length_cws * side_height_cws * 2 * row.rate) / fx;
                    console.log( shed_length_cws )
                    console.log( side_height_cws )
                    console.log(  row.rate )
                    frm.set_value("curtain_winching", curtain_winching);

                    let curtain_winching_ech = (shed_length_ech * frm.doc.side_height * 2 * row.rate) / fx;
                    frm.set_value("curtain_winching_ech", curtain_winching_ech);

                    let curtain_winching_c = (shed_length_c * frm.doc.side_height * 2 * row.rate) / fx;
                    frm.set_value("curtain_winching_c", curtain_winching_c);
                }
            });

            // --- Rows from doc_name_cc (always only_curtain table for ceiling curtain) ---
            let rows_cc = doc[doc_name_cc] || [];
            rows_cc.forEach(function(row) {
                if (frm.doc.gsm_cp_cc == row.gsm) {
                    frm.set_value("rate_cc", row.rate / fx);

                    let curtain_winching_cc = (shed_length_cc * side_height_cc * 1 * row.rate) / fx;
                    curtain_winching_cc = Math.round(curtain_winching_cc);
                    frm.set_value("curtain_winching_cc", curtain_winching_cc);
                }
            });

            // --- Rows from doc_name2 (curtain below platform rates) ---
            let rows2 = doc[doc_name2] || [];
            rows2.forEach(function(row) {
                if (frm.doc.gsm == row.gsm) {
                    frm.set_value("rate_cbp", row.rate / fx);

                    let curtain_below_platform_rates = (shed_length_cws * side_height_cws * 2 * row.rate) / fx;
                    frm.set_value("curtain_below_platform_rates", curtain_below_platform_rates);
                }
            });
        });
    });
}

// ---- Multi-currency: reconvert curtain amounts when currency / exchange rate changes ----
frappe.ui.form.on('Cages - Commercial Layer - A Type', {
    exchange_rate: cws,
    display_currency: cws
});

// ==== CL A Type ====
frappe.ui.form.on("Cages - Commercial Layer - A Type", {

    onload(frm){

        if (!frm.is_new()) return;

        let ctx = null;

        try{
            ctx = JSON.parse(sessionStorage.getItem("calculator_context"));
        }catch(e){}

        if(!ctx) return;

        if(ctx.opportunity_id && frm.fields_dict.opportunity){
            frm.set_value("opportunity", ctx.opportunity_id);
        }

    },

    after_save(frm){

        let ctx = null;

        try{
            ctx = JSON.parse(sessionStorage.getItem("calculator_context"));
        }catch(e){}

        if(!ctx) return;

        const rowname = ctx.rowname;
        const calculator_id = frm.doc.name;

        frappe.db.set_value(
            "Calculator Selector",
            rowname,
            "calculator_id",
            calculator_id
        ).then(()=>{

            frappe.show_alert({
                message: __("Calculator {0} linked", [calculator_id]),
                indicator: "green"
            });

            load_opportunity_summary(frm);

            try{
                sessionStorage.removeItem("calculator_context");
            }catch(e){}

        });

    }
});

// ==== Item Updation -A type ====
frappe.ui.form.on("Cages - Commercial Layer - A Type", {

    validate: async function(frm) {

        let date = frm.doc.date || frappe.datetime.get_today();

        let res = await frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Cages - Commercial Layer - A Type Pricing Rule",
                filters: [
                    ["valid_from", "<=", date],
                    ["valid_to", ">=", date]
                ],
                fields: ["name"],
                limit_page_length: 1
            }
        });

        if (!res.message.length) {
            frappe.throw("❌ No Pricing Rule found for selected date");
        }

        let pr = await frappe.db.get_doc(
            "Cages - Commercial Layer - A Type Pricing Rule",
            res.message[0].name
        );

        if (!pr.male_bird_item) {
            frappe.throw("❌ Broiler Birds item not set in Pricing Rule");
        }

        if (frm.doc.environment_control_system_ec && !pr.environment_control_ec_item) {
            frappe.throw("❌ Environment Cooling System Item missing in Pricing Rule");
        }

        if (frm.doc.silo_with_fill_system && !pr.silo_item) {
            frappe.throw("❌ Silo Item missing in Pricing Rule");
        }

        if (frm.doc.one_ton_hopper_with_fill_system && !pr.one_ton_hopper_item) {
            frappe.throw("❌ 1 Ton Hopper Item missing in Pricing Rule");
        }

        if (frm.doc.automatic_feeding_trolley && !pr.automatic_feedig_trolley) {
            frappe.throw("❌ Automatic Pan Feeding System Item missing in Pricing Rule");
        }

        if (frm.doc.automatic_egg_collection_system && !pr.egg_collection_system) {
            frappe.throw("❌ Automatic Egg Collection System Item missing in Pricing Rule");
        }

        if (frm.doc.side_curtain_vinching_system && !pr.side_curtain_vinching_system) {
            frappe.throw("❌ Side Curtain Vinching System Item missing in Pricing Rule");
        }

        if (frm.doc.ceiling_curtain && !pr.ceiling_curtain) {
            frappe.throw("❌ Ceiling Curtain Item missing in Pricing Rule");
        }

        if (frm.doc.cooling_pad_curtain && !pr.cooling_pad_curtain) {
            frappe.throw("❌ Cooling Pad Curtain Item missing in Pricing Rule");
        }

        if (frm.doc.white_curtain && !pr.white_curtain) {
            frappe.throw("❌ White Curtain Item missing in Pricing Rule");
        }

        if (frm.doc.curtain_below_platform && !pr.curtain_below_platform) {
            frappe.throw("❌ Curtain Below Platform Item missing in Pricing Rule");
        }

        if (frm.doc.scrapper_system && !pr.scrapper_system_s) {
            frappe.throw("❌ Scrapper System Item missing in Pricing Rule");
        }

    },

    after_save: async function(frm) {

        console.log("after_save triggered");
        console.log("opportunity_id:", frm.doc.opportunity_id);

        if (!frm.doc.opportunity_id) {
            console.log("STOPPED: no opportunity_id");
            return;
        }

        let date = frm.doc.date || frappe.datetime.get_today();

        let res = await frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Cages - Commercial Layer - A Type Pricing Rule",
                filters: [
                    ["valid_from", "<=", date],
                    ["valid_to", ">=", date]
                ],
                fields: ["name"],
                limit_page_length: 1
            }
        });

        if (!res.message.length) return;

        let pr = await frappe.db.get_doc(
            "Cages - Commercial Layer - A Type Pricing Rule",
            res.message[0].name
        );

        // Re-fetch the calculator from the server so we read the persisted
        // values (rate_per_bird etc.) instead of the stale in-memory frm.doc.
        let self_res = await frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Cages - Commercial Layer - A Type",
                name: frm.doc.name
            }
        });

        let src = self_res.message || frm.doc;

        console.log("DEBUG src values:", {
            rate_per_bird: src.rate_per_bird,
            total_no_of_birds: src.total_no_of_birds,
            feeding_trolly: src.total_cost_all_rows_per_shed_aft,
            egg_collection: src.total_cost_all_rows_per_shed_ecs,
            ec_system: src.total_cost_of_ec_system,
            silo: src.total_silo_cost,
            hopper: src.total_1_ton_hopper_with_fill_system,
            curtain_below_platform: src.curtain_below_platform_rates,
            cooling_pad_curtain: src.curtain_winching_cpc,
            white_curtain: src.curtain_winching_wc,
            ceiling_curtain: src.curtain_winching_cc,
            curtain_winching: src.curtain_winching,
            curtain_winching_ech: src.curtain_winching_ech,
            curtain_winching_c: src.curtain_winching_c
        });

        let required_items = [];

        required_items.push(pr.male_bird_item);

        if (src.automatic_feeding_trolley) {
            required_items.push(pr.automatic_feedig_trolley);
        }

        if (src.scrapper_system) {
            required_items.push(pr.scrapper_system_s);
        }

        if (src.automatic_egg_collection_system) {
            required_items.push(pr.egg_collection_system);
        }

        if (src.environment_control_system_ec) {
            required_items.push(pr.environment_control_ec_item);
        }

        if (src.side_curtain_vinching_system) {
            required_items.push(pr.side_curtain_vinching_system);
        }

        if (src.silo_with_fill_system) {
            required_items.push(pr.silo_item);
        }

        if (src.one_ton_hopper_with_fill_system) {
            required_items.push(pr.one_ton_hopper_item);
        }

        if (src.curtain_below_platform) {
            required_items.push(pr.curtain_below_platform);
        }

        if (src.cooling_pad_curtain) {
            required_items.push(pr.cooling_pad_curtain);
        }

        if (src.white_curtain) {
            required_items.push(pr.white_curtain);
        }

        if (src.ceiling_curtain) {
            required_items.push(pr.ceiling_curtain);
        }

        let controlled_items = [
            pr.male_bird_item,
            pr.automatic_feedig_trolley,
            pr.scrapper_system_s,
            pr.egg_collection_system,
            pr.environment_control_ec_item,
            pr.side_curtain_vinching_system,
            pr.silo_item,
            pr.one_ton_hopper_item,
            pr.curtain_below_platform,
            pr.cooling_pad_curtain,
            pr.white_curtain,
            pr.ceiling_curtain
        ].filter(Boolean);

        let r = await frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Opportunity",
                name: frm.doc.opportunity_id
            }
        });

        if (!r.message) return;

        let doc = r.message;
        let existing_items = doc.items || [];

        for (let item of required_items) {

            if (!item) continue;

            // compute latest qty + rate for this item (once)
            let qty = 1;
            let rate = 0;

            if (item === pr.male_bird_item) {
                qty = src.total_no_of_birds || 1;
                rate = src.rate_per_bird || 0;
            }
            else if (item === pr.automatic_feedig_trolley) {
                rate = src.total_cost_all_rows_per_shed_aft || 0;
            }
            else if (item === pr.scrapper_system_s) {
                rate = src.total_price_of_scrapper_system || 0;
            }
            else if (item === pr.egg_collection_system) {
                rate = src.total_cost_all_rows_per_shed_ecs || 0;
            }
            else if (item === pr.environment_control_ec_item) {
                rate = src.total_cost_of_ec_system || 0;
            }
            else if (item === pr.side_curtain_vinching_system) {
                if (src.environment_cooling_system == 0) {
                    rate = src.curtain_winching || 0;
                } else {
                    if (src.select_winching_type === "For Both Sides") {
                        rate = src.curtain_winching_ech || 0;
                    } else if (src.select_winching_type === "for C Section") {
                        rate = src.curtain_winching_c || 0;
                    } else {
                        rate = 0;
                    }
                }
            }
            else if (item === pr.silo_item) {
                rate = src.total_silo_cost || 0;
            }
            else if (item === pr.one_ton_hopper_item) {
                rate = src.total_1_ton_hopper_with_fill_system || 0;
            }
            else if (item === pr.curtain_below_platform) {
                rate = src.curtain_below_platform_rates || 0;
            }
            else if (item === pr.cooling_pad_curtain) {
                rate = src.curtain_winching_cpc || 0;
            }
            else if (item === pr.white_curtain) {
                rate = src.curtain_winching_wc || 0;
            }
            else if (item === pr.ceiling_curtain) {
                rate = src.curtain_winching_cc || 0;
            }

            // find existing row on the opportunity
            let existing_row = existing_items.find(d => d.item_code === item);

            if (existing_row) {
                // UPDATE existing row with latest values
                existing_row.qty = qty;
                existing_row.rate = rate;
                console.log(`Updated item: ${item}, qty: ${qty}, rate: ${rate}`);
            } else {
                // ADD new row
                doc.items.push({
                    item_code: item,
                    qty: qty,
                    rate: rate
                });
                console.log(`Added item: ${item}, qty: ${qty}, rate: ${rate}`);
            }
        }

        await frappe.call({
            method: "frappe.client.save",
            args: { doc: doc }
        });

        for (let row of existing_items) {
            if (
                controlled_items.includes(row.item_code) &&
                !required_items.includes(row.item_code)
            ) {
                await frappe.call({
                    method: "frappe.client.delete",
                    args: {
                        doctype: "Opportunity Item",
                        name: row.name
                    }
                });
            }
        }

        frappe.show_alert({
            message: "Opportunity synced",
            indicator: "green"
        });
    }

});



frappe.ui.form.on("Cages - Commercial Layer - A Type", {

    onload(frm){

        if (!frm.is_new()) return;

        let ctx = null;

        try{
            ctx = JSON.parse(sessionStorage.getItem("calculator_context"));
        }catch(e){}

        if(!ctx) return;

        if(ctx.opportunity_id && frm.fields_dict.opportunity_id){
            frm.set_value("opportunity_id", ctx.opportunity_id);
        }

    },

    after_save(frm){

        let ctx = null;

        try{
            ctx = JSON.parse(sessionStorage.getItem("calculator_context"));
        }catch(e){}

        if(!ctx) return;

        const rowname = ctx.rowname;
        const calculator_id = frm.doc.name;

        frappe.db.set_value(
            "Calculator Selector",
            rowname,
            "calculator_id",
            calculator_id
        ).then(()=>{

            frappe.show_alert({
                message: __("Calculator {0} linked", [calculator_id]),
                indicator: "green"
            });

            load_opportunity_summary(frm);

            try{
                sessionStorage.removeItem("calculator_context");
            }catch(e){}

        });

    }
});

// ==== A Type - Exchange Rate Popup ====
frappe.ui.form.on("Cages - Commercial Layer - A Type", {
    before_save(frm) { frm._at_first_save = frm.is_new(); },
    after_save(frm) {
        if (!frm._at_first_save) return;
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

// ==== A Type - Dynamic Rates ====
// A Type - Dynamic Rates : Loader / Hopper / Load-Cell fetched from the Pricing Rule
// (read-only fields), converted to the display currency via exchange_rate.

frappe.ui.form.on("Cages - Commercial Layer - A Type", {
    onload(frm) { if (frm.is_new()) at_set_dynamic_rates(frm); },
    display_currency(frm) { at_set_dynamic_rates(frm); },
    exchange_rate(frm) { at_set_dynamic_rates(frm); },
    validate(frm) { at_set_dynamic_rates(frm); }
});

function at_set_dynamic_rates(frm) {
    return frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Cages - Commercial Layer - A Type Pricing Rule",
            filters: [
                ["valid_from", "<=", frappe.datetime.get_today()],
                ["valid_to", ">=", frappe.datetime.get_today()]
            ],
            fields: ["loader_rate", "hopper_rate", "load_cell_with_assembly_cost"],
            limit_page_length: 1
        }
    }).then(r => {
        let d = (r.message && r.message[0]) || {};
        let fx = flt(frm.doc.exchange_rate) || 1;

        let loader = flt(d.loader_rate) / fx;
        let hopper = flt(d.hopper_rate) / fx;
        let loadcell = flt(d.load_cell_with_assembly_cost) / fx;

        frm.set_value("loader_rate", loader);
        frm.set_value("loader_amount", loader);
        frm.set_value("hopper_rate", hopper);
        frm.set_value("hopper_amount", hopper);
        frm.set_value("weighing_system_cost", loadcell);
    });
}

// ==== A Type - Currency Fetch ====
frappe.ui.form.on("Cages - Commercial Layer - A Type", {
    onload(frm) { if (frm.is_new() && frm.doc.opportunity_id) at_set_display_currency(frm); },
    opportunity_id(frm) { at_set_display_currency(frm); }
});
function at_set_display_currency(frm) {
    if (!frm.doc.opportunity_id) return;
    frappe.db.get_value("Opportunity", frm.doc.opportunity_id, ["opportunity_from", "party_name", "currency"]).then(r => {
        const o = r.message || {};
        if (o.opportunity_from === "Customer" && o.party_name) {
            frappe.db.get_value("Customer", o.party_name, "default_currency").then(c => {
                frm.set_value("display_currency", (c.message && c.message.default_currency) || o.currency || "INR");
            });
        } else {
            frm.set_value("display_currency", o.currency || "INR");
        }
    });
}


// ---- Auto-fetch exchange rate (1 display_currency = X INR) when currency changes ----
frappe.ui.form.on("Cages - Commercial Layer - A Type", {
    display_currency(frm) { at_fetch_exchange_rate(frm); }
});
function at_fetch_exchange_rate(frm) {
    let cur = frm.doc.display_currency;
    if (!cur || cur === "INR") { frm.set_value("exchange_rate", 1); return; }
    frappe.call({
        method: "get_inr_exchange_rate",
        args: { currency: cur, date: frm.doc.date || frappe.datetime.get_today() }
    }).then(r => {
        let rate = flt(r && r.message && r.message.exchange_rate);
        if (rate) {
            frm.set_value("exchange_rate", rate);
        } else {
            frappe.show_alert({ message: __("Could not fetch exchange rate for {0}. Enter it manually.", [cur]), indicator: "orange" });
        }
    });
}

// ==== A Type - Measurement Unit ====
// A Type - Measurement Unit : bidirectional Feet <-> Meter (all 28 pairs)
// Factors are fetched from the Pricing Rule (never hardcoded).

const AT_MEASURE_PAIRS = [
    ["shed_lenght", "shed_length_in_meter"],
    ["shed_width", "shed_width_in_meter"],
    ["side_height", "side_height_meter"],
    ["average_height", "average_height_meter"],
    ["centre_height", "centre_height_meter"],
    // ["shed_size_length", "shed_size_length_meter"],
    ["shed_size_width", "shed_size_width_meter"],
    // ["cage_length", "cage_length_meter"],
    // ["row_width", "row_width_meter"],
    // ["calculated_width", "calculated_width_meter"],
    // ["reduce_from_shed_length", "reduce_from_shed_length_meter"],
    ["shed_size_scrapper", "shed_size_scrapper_meter"],
    ["shed_length_cws", "shed_length_cws_meter"],
    ["side_height_cws", "side_height_cws_meter"],
    ["shed_length_ech", "shed_length_ech_meter"],
    ["side_height_ech", "side_height_ech_meter"],
    ["shed_length_c", "shed_length_c_meter"],
    ["side_height_c", "side_height_c_meter"],
    ["shed_length_cc", "shed_length_cc_meter"],
    ["side_height_cc", "side_height_cc_meter"],
    ["height_of_cp", "height_of_cp_meter"],
    ["shed_size_wc", "shed_size_wc_meter"],
    ["height_of_wc", "height_of_wc_meter"],
    ["shed_length_cbp", "shed_length_cbp_meter"],
    ["shed_width_cpc", "shed_width_cpc_meter"]
];

function at_load_factors(frm) {
    return frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Cages - Commercial Layer - A Type Pricing Rule",
            filters: [
                ["valid_from", "<=", frappe.datetime.get_today()],
                ["valid_to", ">=", frappe.datetime.get_today()]
            ],
            fields: ["feet_to_meter_conversion_factor", "meter_to_feet_conversion_factor"],
            limit_page_length: 1
        }
    }).then(r => {
        let d = (r.message && r.message[0]) || {};
        let f2m = flt(d.feet_to_meter_conversion_factor) || 0.3048;
        let m2f = flt(d.meter_to_feet_conversion_factor) || (1 / f2m);
        frm._at_fac = { f2m: f2m, m2f: m2f };
    });
}

function at_toggle_measurement(frm) {
    let is_meter = frm.doc.measurement_unit === "Meter";
    AT_MEASURE_PAIRS.forEach(function (p) {
        frm.set_df_property(p[0], "hidden", 0);
        frm.set_df_property(p[1], "hidden", 0);
        // Feet mode -> feet editable, meter read-only ; Meter mode -> reverse
        frm.set_df_property(p[0], "read_only", is_meter ? 1 : 0);
        frm.set_df_property(p[1], "read_only", is_meter ? 0 : 1);
    });
}

// Tolerance guard (0.01) prevents the feet<->meter reciprocal from re-firing.
// Frappe triggers field handlers on a microtask, so a sync lock cannot span the
// reciprocal; the tolerance (> the ~0.0016 precision drift) makes it terminate.
const AT_CONV_TOL = 0.01;
function at_conv(frm, feet_f, meter_f, from) {
    let fac = frm._at_fac || { f2m: 0.3048, m2f: 3.28084 };
    if (from === "feet") {
        let v = flt(frm.doc[feet_f]) * fac.f2m;
        if (Math.abs(flt(frm.doc[meter_f]) - v) > AT_CONV_TOL) frm.set_value(meter_f, v);
    } else {
        let v = flt(frm.doc[meter_f]) * fac.m2f;
        if (Math.abs(flt(frm.doc[feet_f]) - v) > AT_CONV_TOL) frm.set_value(feet_f, v);
    }
}

function at_reconvert_all(frm) {
    let to_meter = frm.doc.measurement_unit === "Meter";
    AT_MEASURE_PAIRS.forEach(function (p) {
        at_conv(frm, p[0], p[1], to_meter ? "feet" : "meter");
    });
}

frappe.ui.form.on("Cages - Commercial Layer - A Type", {
    onload(frm) { at_load_factors(frm).then(() => at_toggle_measurement(frm)); },
    refresh(frm) { at_load_factors(frm); at_toggle_measurement(frm); },
    measurement_unit(frm) { at_toggle_measurement(frm); at_reconvert_all(frm); }
});

// per-field change handlers for every pair (both directions), guarded by tolerance
(function () {
    let handlers = {};
    AT_MEASURE_PAIRS.forEach(function (p) {
        let feet_f = p[0], meter_f = p[1];
        handlers[feet_f] = function (frm) { at_conv(frm, feet_f, meter_f, "feet"); };
        handlers[meter_f] = function (frm) { at_conv(frm, feet_f, meter_f, "meter"); };
    });
    frappe.ui.form.on("Cages - Commercial Layer - A Type", handlers);
})();

// ==== Fan And Cooing Pad Logic ====
frappe.ui.form.on('Cages - Commercial Layer - A Type', {
    validate: async function (frm) {
        await set_ec_prices(frm);
    }
});

async function set_ec_prices(frm) {

    if (!frm.doc.fan_type)         frm.set_value("fan_50_price", 0);
    if (!frm.doc.cooling_pad_type) frm.set_value("cooling_pad_price", 0);

    if (!frm.doc.fan_type && !frm.doc.cooling_pad_type) return;

    let doc = await get_a_type_pricing_rule(frm);
    if (!doc) {
        frappe.msgprint("No active Cages - Commercial Layer - A Type Pricing Rule found");
        return;
    }

    let fx = flt(frm.doc.exchange_rate) || 1;

    // ── Fan price ──
    if (frm.doc.fan_type) {
        let fan_rate = 0;
        (doc.table_wkqn || []).forEach(function (row) {
            if (frm.doc.fan_type == row.fan_type) {
                fan_rate = flt(row.rate);
            }
        });

        let fan_50_price = 0;
        if (fan_rate) {
            fan_50_price = (fan_rate * flt(frm.doc.tunnel_fan_count)) / fx;
        } else {
            frappe.msgprint("No price found for selected fan type in Pricing Rule");
        }
        frm.set_value("fan_50_price", fan_50_price);
    }

    // ── Cooling pad price ──
    if (frm.doc.cooling_pad_type) {
        let cooling_pad_rate = 0;
        (doc.cooling_pad_price_table || []).forEach(function (row) {
            if (frm.doc.cooling_pad_type == row.cooling_pad_type) {
                cooling_pad_rate = flt(row.rate);
            }
        });

        let cooling_pad_price = 0;
        if (cooling_pad_rate) {
            cooling_pad_price = (cooling_pad_rate * flt(frm.doc.cooling_pad_count)) / fx;
        } else {
            frappe.msgprint("No price found for selected cooling pad type in Pricing Rule");
        }
        frm.set_value("cooling_pad_price", cooling_pad_price);
    }
}

function get_a_type_pricing_rule(frm) {
    let date = frm.doc.date || frappe.datetime.get_today();

    return frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Cages - Commercial Layer - A Type Pricing Rule",
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
            "Cages - Commercial Layer - A Type Pricing Rule",
            res.message[0].name
        );
    });
}

// NOTE: duplicate flt() definition (identical to the one in "CL A Type -EC Type")
// removed here - see that script's definition above.

// ==== SILO HTML View Logic - A Type ====
frappe.ui.form.on("Cages - Commercial Layer - A Type", {
    refresh(frm) {
        render_silo_pricing(frm);
    },
});

// NOTE: duplicate get_active_pricing_rule() definition (identical to the one in
// "CL A Type -EC Type") removed here - see that script's definition above.

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

    let field = frm.get_field("html_dgod");
    if (field) {
        field.html(html);
    }
}
