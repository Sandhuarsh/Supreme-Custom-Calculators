// ==== Cages - Broiler Breeder - H Type ====
frappe.ui.form.on("Cages - Broiler Breeder - H Type - Layer Stage", {

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
frappe.ui.form.on("Cages - Broiler Breeder - H Type - Layer Stage", {

    validate: async function(frm) {

        let date = frm.doc.date;

        let female_qty = frm.doc.total_female_birds || 1;

        let female_rate = await get_cage_rate(
            female_qty,
            frm.doc.trough_type,
            "female",
            date
        );

        frm.set_value("rate_per_female_bird", female_rate);

        let male_qty = frm.doc.total_male_birds || 1;

        let male_rate = await get_cage_rate(
            male_qty,
            frm.doc.trough_type,
            "male",
            date
        );

        frm.set_value("rate_per_female_bird_copy", male_rate);
    }
});
frappe.ui.form.on("Cages - Broiler Breeder - H Type - Layer Stage", {

    validate: async function(frm) {

        // remember the previously-saved item_4 so its stale
        // Opportunity row can be cleaned up if item_4 changes
        if (frm.is_new()) {
            frm.__previous_item_4 = null;
            return;
        }

        try {
            let old = await frappe.db.get_value(
                "Cages - Broiler Breeder - H Type - Layer Stage",
                frm.doc.name,
                "item_4"
            );
            frm.__previous_item_4 = (old && old.message) ? old.message.item_4 : null;
        } catch (e) {
            frm.__previous_item_4 = null;
        }
    }
});


frappe.ui.form.on("Cages - Broiler Breeder - H Type - Layer Stage", {

    validate: async function(frm) {

        let date = frm.doc.date || frappe.datetime.get_today();

        let res = await frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Cage H Type Item Pricing Rule",
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
            "Cage H Type Item Pricing Rule",
            res.message[0].name
        );

        if (!pr.female_bird_item) frappe.throw("❌ Female Bird Item not set in Pricing Rule");
        if (!pr.male_bird_item) frappe.throw("❌ Male Bird Item not set in Pricing Rule");

        if (frm.doc.automatic_feeding_trolley && !pr.automatic_feeding_trolley_item) {
            frappe.throw("❌ Automatic Feeding Trolley Item missing in Pricing Rule");
        }

        if (frm.doc.egg_collection && !pr.egg_collection_item) {
            frappe.throw("❌ Egg Collection Item missing in Pricing Rule");
        }

        if (frm.doc.environment_control_system_ec && !pr.environment_control_ec_item) {
            frappe.throw("❌ Environment Control Item missing in Pricing Rule");
        }

        if (frm.doc.silo_with_fill_system && !pr.silo_item) {
            frappe.throw("❌ Silo Item missing in Pricing Rule");
        }

    }
});




frappe.ui.form.on("Cages - Broiler Breeder - H Type - Layer Stage", {

    after_save: async function(frm) {

        if (!frm.doc.opportunity_id) return;

        let date = frm.doc.date || frappe.datetime.get_today();

        let res = await frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Cage H Type Item Pricing Rule",
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
            "Cage H Type Item Pricing Rule",
            res.message[0].name
        );


        let required_items = [];

        required_items.push(pr.female_bird_item);
        required_items.push(pr.male_bird_item);

        if (frm.doc.automatic_feeding_trolley) {
            required_items.push(pr.automatic_feeding_trolley_item);
        }

        if (frm.doc.egg_collection) {
            required_items.push(pr.egg_collection_item);
        }

        if (frm.doc.environment_control_system_ec) {
            required_items.push(pr.environment_control_ec_item);
        }

        if (frm.doc.cage_mat) {
            required_items.push(frm.doc.item_4);
        }

        if (frm.doc.silo_with_fill_system) {
            required_items.push(pr.silo_item);
        }

        if (frm.doc.ones_ton_hopper_with_fill_system == "1") {
            if (frm.doc.one_ton_hopper_with_boot == "Needed") {
                required_items.push(pr.one_ton_hopper_item);
            }
        }

        let controlled_items = [
            pr.automatic_feeding_trolley_item,
            pr.egg_collection_item,
            pr.environment_control_ec_item,
            frm.doc.item_4,
            pr.silo_item,
            pr.one_ton_hopper_item
        ];

         if (frm.__previous_item_4 && frm.__previous_item_4 !== frm.doc.item_4) {
            controlled_items.push(frm.__previous_item_4);
        }

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

            let qty = 1;
            let rate = 0;

            if (item === pr.female_bird_item) {
                qty = frm.doc.total_female_birds || 1;
                rate = await get_cage_rate(
                    qty,
                    frm.doc.trough_type,
                    "female",
                    date
                );
            }

            if (item === pr.male_bird_item) {
                qty = frm.doc.total_male_birds || 1;
                rate = await get_cage_rate(
                    qty,
                    frm.doc.trough_type,
                    "male",
                    date
                );
            }

            if (item === frm.doc.item_4) {
                qty = frm.doc.total_no_mats || 1;
                rate = frm.doc.price_cage_mat || 0;
            }

            if (item === pr.automatic_feeding_trolley_item) {
                qty = 1;
                rate = frm.doc.cost_for_all_rows_aft || 0;
            }

            if (item === pr.egg_collection_item) {
                qty = 1;
                rate = frm.doc.cost_for_all_rows_ec || 0;
            }

            if (item === pr.environment_control_ec_item) {
                qty = 1;
                rate = frm.doc.total_cost_of_ec_system || 0;
            }

            if (item === pr.silo_item) {
                qty = 1;
                rate = frm.doc.total_silo_cost || 0;
            }

            if (item === pr.one_ton_hopper_item) {
                qty = 1;
                rate = frm.doc.total_1_ton_hopper_with_fill_system || 0;
            }

            let existingRow = existing_items.find(d => d.item_code === item);

            if (existingRow) {
                // UPDATE existing item (this is what was missing before)
                existingRow.qty = qty;
                existingRow.rate = rate;
            } else {
                // ADD new item
                doc.items.push({
                    item_code: item,
                    qty: qty,
                    rate: rate
                });
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
            message: "Opportunity items synced",
            indicator: "green"
        });
    }
});


// function get_cage_rate(birds, trough, gender){

//     let rate = 0;

//     if (birds < 5000){

//         if (trough === "Aluminium") {
//             rate = (gender === "female") ? 740 : 790;
//         } else {
//             rate = (gender === "female") ? 690 : 740;
//         }

//     }

//     else if (birds >= 5000 && birds < 7500){

//         if (trough === "Aluminium") {
//             rate = (gender === "female") ? 730 : 780;
//         } else {
//             rate = (gender === "female") ? 680 : 730;
//         }

//     }

//     else if (birds >= 7500 && birds < 10000){

//         if (trough === "Aluminium") {
//             rate = (gender === "female") ? 720 : 770;
//         } else {
//             rate = (gender === "female") ? 670 : 720;
//         }

//     }

//     else if (birds >= 10000 && birds < 12500){

//         if (trough === "Aluminium") {
//             rate = (gender === "female") ? 710 : 760;
//         } else {
//             rate = (gender === "female") ? 660 : 710;
//         }

//     }

//     else{

//         if (trough === "Aluminium") {
//             rate = (gender === "female") ? 700 : 750;
//         } else {
//             rate = (gender === "female") ? 650 : 700;
//         }

//     }

//     return rate;
// }

function get_cage_rate(birds, trough, gender, date) {

    return frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Cage H Type Item Pricing Rule",
            filters: [
                ["valid_from", "<=", date],
                ["valid_to", ">=", date]
            ],
            fields: ["name"],
            limit_page_length: 1
        }
    }).then(res => {

        if (!res.message.length) return 0;

        let parent_name = res.message[0].name;

        return frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Cage H Type Item Pricing Rule",
                name: parent_name
            }
        }).then(r => {

            let doc = r.message;

            if (!doc || !doc.pricing_rule || !doc.pricing_rule.length) return 0;

            let matched_row = doc.pricing_rule.find(row =>
                row.from_capacity <= birds &&
                row.to_capacity >= birds &&
                row.trough_type === trough
            );

            if (matched_row) {
                return (gender === "female")
                    ? matched_row.female_bird_rate
                    : matched_row.male_bird_rate;
            }

            return 0;
        });

    });
}



// function load_opportunity_summary(frm) {

//     if (!frm.doc.opportunity_id) return;

//     frappe.db.get_doc("Opportunity", frm.doc.opportunity_id)
//     .then(doc => {

//         if (!doc.items) return;

//         let html = `
//         <div style="padding:10px;border:1px solid #ddd">
//         <table class="table table-bordered">
//         <thead>
//         <tr>
//             <th>Item</th>
//             <th>Qty</th>
//             <th>Rate</th>
//             <th>Amount</th>
//         </tr>
//         </thead>
//         <tbody>
//         `;

//         let total = 0;

//         doc.items.forEach(row => {

//             let qty = row.qty || 0;
//             let rate = row.rate || 0;
//             let amount = qty * rate;

//             total += amount;

//             html += `
//             <tr>
//                 <td>${row.item_code}</td>
//                 <td>${qty}</td>
//                 <td>${rate}</td>
//                 <td>${amount}</td>
//             </tr>
//             `;
//         });

//         html += "</tbody></table></div>";

//         if (!frm.fields_dict.summary) return;

//         frm.fields_dict.summary.$wrapper.html(html);

//         frm.set_value("total_of_one_shed", total);

//     });

// }

// ==== Automatic Feeding Trolley ====
// frappe.ui.form.on('Cages - Broiler Breeder - H Type - Layer Stage', {
//     validate: function(frm) {

//         let shed_length = frm.doc.final_shed_lenght_for_quotation || 0;
//         let date = frm.doc.date || frappe.datetime.get_today();

//         frm.set_value("shed_length_aft", shed_length);


//     }
// });




frappe.ui.form.on('Cages - Broiler Breeder - H Type - Layer Stage', {

    silo: function(frm) {

        if (frm.doc.silo) {
            frm.set_value("fill_system", frm.doc.silo);
        }

    }

});
// frappe.ui.form.on('Cages - Broiler Breeder - H Type - Layer Stage', {

//     fill_system_for_1_ton_hopper: function(frm) {

//         if (frm.doc.fill_system_for_1_ton_hopper) {
//             frm.set_value("one_ton_hopper_with_boot", frm.doc.fill_system_for_1_ton_hopper);
//         }

//     }

// });

frappe.ui.form.on('Cages - Broiler Breeder - H Type - Layer Stage', {

    silo_capacity_ton: function(frm) {
        set_silo_price(frm);
    },

    validate: function(frm) {
        set_silo_price(frm);
    }

});

async function set_silo_price(frm) {

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
                doctype: "Cage H Type Item Pricing Rule",
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
            "Cage H Type Item Pricing Rule",
            res.message[0].name
        );

        let table = doc.silo_price_logic_table || [];
        console.log("Silo Table:", table);

        let row = table.find(r => r.silo_capactity == capacity);

        console.log("Matched Row:", row);

        let price = row ? row.price : 0;

        if (frm.doc.display_currency && frm.doc.display_currency !== "INR") {
    let exchange_rate = flt(frm.doc.exchange_rate) || 1;
    price = price / exchange_rate;
}

        frm.set_value("silo_rate", price);
        frm.set_value("silo_amount", price);

        // if (!row) {
        //     frappe.msgprint("No Silo price found for selected capacity");
        // }

    } catch (err) {
        console.error("Error:", err);
        frappe.msgprint("Error fetching silo price");
    }
}



frappe.ui.form.on('Cages - Broiler Breeder - H Type - Layer Stage', {

    rows: function(frm) {

        if (frm.doc.rows) {
            frm.set_value("no_of_rows", frm.doc.rows);
            frm.set_value("no_of_rows_fill", frm.doc.rows);
        }

    },
    validate: function(frm) {

        if (frm.doc.rows) {
            frm.set_value("no_of_rows", frm.doc.rows);
            frm.set_value("no_of_rows_fill", frm.doc.rows);
        }

    }

});


frappe.ui.form.on('Cages - Broiler Breeder - H Type - Layer Stage', {

    no_of_rows: function(frm) {
        calculate_fill_system(frm);
    },

    validate: function(frm) {
        calculate_fill_system(frm);
    }

});

function calculate_fill_system(frm) {

    let rows = frm.doc.no_of_rows || 0;
    let base_rate = frm.doc.cost_upto_3_rows || 113000;
    let extra_rate = frm.doc.additional_row_value_to_add || 4000;

    let rate = 0;

    if (rows <= 3) {
        rate = base_rate;
    } else {
        let extra_rows = rows - 3;
        rate = base_rate + (extra_rows * extra_rate);
    }
if (frm.doc.display_currency && frm.doc.display_currency !== "INR") {
        let exchange_rate = flt(frm.doc.exchange_rate) || 1;
        rate = rate / exchange_rate;
    }
    frm.set_value("rate_per_running_feet", rate);
    frm.set_value("fill_system_amount", rate);
}



frappe.ui.form.on('Cages - Broiler Breeder - H Type - Layer Stage', {

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

 loader: function(frm) {
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

    if (frm.doc.loader) {
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





frappe.ui.form.on('Cages - Broiler Breeder - H Type - Layer Stage', {

    no_of_rows_fill: function(frm) {
        calculate_fill_systems(frm);
    },

    validate: function(frm) {
        calculate_fill_systems(frm);
    }

});

function calculate_fill_systems(frm) {

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

    if (frm.doc.display_currency && frm.doc.display_currency !== "INR") {
        let exchange_rate = flt(frm.doc.exchange_rate) || 1;
        rate = rate / exchange_rate;
    }

    frm.set_value("rate_per_running_feet_fill", rate);
    frm.set_value("fill_system_amounts", rate);
}


frappe.ui.form.on('Cages - Broiler Breeder - H Type - Layer Stage', {

    fill_system_amounts: function(frm) {
        calculate_total_hopper(frm);
    },
    hopper_amount: function(frm) {
        calculate_total_hopper(frm);
    },
    one_ton_hopper_with_boot: function(frm) {
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


    if (frm.doc.one_ton_hopper_with_boot == "Needed") {
        total += frm.doc.hopper_amount;
    }

    frm.set_value("total_1_ton_hopper_with_fill_system", total);
}





// function toggle_final_shed_fields(frm) {
//     console.log("========== toggle_final_shed_fields ==========");
//     console.log("Measurement Unit:", frm.doc.measurement_unit);
//     console.log("Calculation Method:", frm.doc.calculation_method);

//     const make_read_only =
//         ["Feet", "Meter"].includes(frm.doc.measurement_unit) &&
//         frm.doc.calculation_method === "Bird To Shed";

//     console.log("Make Read Only:", make_read_only);

//     [
//         "final_shed_width",
//         "final_shed_width_in_meter",
//         "final_shed_lenght_for_quotation",
//         "final_shed_length_for_quotation_in_meter"
//     ].forEach(field => {
//         console.log(`Setting ${field} read_only = ${make_read_only ? 1 : 0}`);

//         frm.set_df_property(field, "read_only", make_read_only ? 1 : 0);

//         console.log(
//             `${field} current read_only property:`,
//             frm.get_field(field)?.df?.read_only
//         );
//     });

//     frm.refresh_fields([
//         "final_shed_width",
//         "final_shed_width_in_meter",
//         "final_shed_lenght_for_quotation",
//         "final_shed_length_for_quotation_in_meter"
//     ]);

//     console.log("Fields refreshed.");
//     console.log("==============================================");
// }

// frappe.ui.form.on("Cages - Broiler Breeder - H Type - Layer Stage", {
//     refresh(frm) {
//         console.log(">>> Refresh Triggered");
//         toggle_final_shed_fields(frm);
//     },

//     measurement_unit(frm) {
//         console.log(">>> Measurement Unit Changed:", frm.doc.measurement_unit);
//         toggle_final_shed_fields(frm);
//     },

//     calculation_method(frm) {
//         console.log(">>> Calculation Method Changed:", frm.doc.calculation_method);
//         toggle_final_shed_fields(frm);
//     }
// });

// ==== Egg Collection System ====
// frappe.ui.form.on('Cages - Broiler Breeder - H Type - Layer Stage', {
//     validate: function(frm) {

//         let shed_length = frm.doc.final_shed_lenght_for_quotation || 0;
//         frm.set_value("shed_length_ec", shed_length);

//         let per_row_cost = 0;

//         if (shed_length < 250) {
//             per_row_cost = 235200;

//         } else if (shed_length >= 250 && shed_length <= 300) {
//             per_row_cost = 241600;

//         } else if (shed_length > 300 && shed_length <= 350) {
//             per_row_cost = 248000;

//         } else if (shed_length > 350) {
//             per_row_cost = 256000;
//         }

//         frm.set_value("per_row_cost_ec", per_row_cost);

//         let rows = frm.doc.rows || 0;

//         frm.set_value("no_of_rows_in_1_shed_ec", rows);

//         let cost_for_all_rows = per_row_cost * rows;
//         frm.set_value("cost_for_all_rows_ec", cost_for_all_rows);
//     }
// });


frappe.ui.form.on('Cages - Broiler Breeder - H Type - Layer Stage', {

    total_female_birds: function(frm) {
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
        let birds = frm.doc.total_female_birds || 1;
        let days = frm.doc.days || 1;
        let feed_capacity = frm.doc.feed_capacity || 1;

        let result = birds * days * feed_capacity;

        frm.set_value('silo__capacity_estimated', result);
    }
});


frappe.ui.form.on("Cages - Broiler Breeder - H Type - Layer Stage", {
    display_currency(frm) {
        update_silo_defaults(frm);
    },

    exchange_rate(frm) {
        update_silo_defaults(frm);
    },

    validate(frm) {
        update_silo_defaults(frm);
    },
    onload(frm) {
        if (frm.is_new()) {
            update_silo_defaults(frm);
        }
    },
});

function update_silo_defaults(frm) {

    let loader_rate = 110000;
    let loader_amount = 110000;
    let weighing_system_cost = 106582;
    let hopper_rate = 25000;
    let hopper_amount = 25000;

    if (frm.doc.display_currency && frm.doc.display_currency !== "INR") {
        let exchange_rate = flt(frm.doc.exchange_rate) || 1;

        loader_rate = loader_rate / exchange_rate;
        loader_amount = loader_amount / exchange_rate;
        weighing_system_cost = weighing_system_cost / exchange_rate;
        hopper_rate = hopper_rate / exchange_rate;
        hopper_amount = hopper_amount / exchange_rate;
    }

    frm.set_value("loader_rate", loader_rate);
    frm.set_value("loader_amount", loader_amount);
    frm.set_value("weighing_system_cost", weighing_system_cost);
    frm.set_value("hopper_rate", hopper_rate);
    frm.set_value("hopper_amount", hopper_amount);
}

// ==== Cage Mat ====
// frappe.ui.form.on('Cages - Broiler Breeder - H Type - Layer Stage', {
// 	validate:function(frm) {

// 		let female_bird_count_cm = frm.doc.total_female_birds;
// 		frm.set_value("female_bird_count_cm", female_bird_count_cm);

// 		let total_no_mats = frm.doc.female_bird_count_cm / 2;
// 		frm.set_value("total_no_mats", total_no_mats);

// 		frappe.call({
//             method: "frappe.client.get",
//             args: {
//                 doctype: "Cage H Type Item Pricing Rule",
//                 name: "Cage Mat"
//             },
//             callback: function(r) {

//                 if (r.message) {

//                     let rows = r.message.table_vxia;

//                     rows.forEach(function(row){

//                         if(frm.doc.mat_size == row.mat_size){

//                             frm.set_value("price_cage_mat", row.price);

//                             let total_price = (frm.doc.total_no_mats || 0) * (row.price || 0);
//                             frm.set_value("total_price_of_cage_mat", total_price);
//                         }
//                     });
//                 }
//             }
// 	   });
// 	}
// });

frappe.ui.form.on('Cages - Broiler Breeder - H Type - Layer Stage', {

    female: function(frm) {
        calculate_male(frm);
    }

});

function calculate_male(frm) {

    let female = frm.doc.female || 0;

    let male = female * 0.10;

    frm.set_value("male", male);

}

// ==== Default Cage Dimensions ====
frappe.ui.form.on('Cages - Broiler Breeder - H Type - Layer Stage', {

    onload: function(frm) {
        set_bird_configuration(frm);
    },

    calculation_method: function(frm) {

        frm.clear_table('table_qxwc');

        set_bird_configuration(frm);

        frm.refresh_field('table_qxwc');
    }

});

function set_bird_configuration(frm) {

    if (!frm.doc.table_qxwc || frm.doc.table_qxwc.length === 0) {

        if (frm.doc.calculation_method == "Bird To Shed") {

            let row1 = frm.add_child('table_qxwc');
            row1.bird = "Female";
            row1.front = 20;
            row1.depth = 18;
            row1.front_height = 22.40;
            row1.back_height = 19.60;
            row1.birdsbox = 2;

            let row2 = frm.add_child('table_qxwc');
            row2.bird = "Male";
            row2.front = 24;
            row2.depth = 18;
            row2.front_height = 24;
            row2.back_height = 24;
            row2.birdsbox = 2;
        }

        if (frm.doc.calculation_method == "Shed To Bird") {

            let row1 = frm.add_child('table_qxwc');
            row1.bird = "Female";
            row1.front = 18;
            row1.depth = 18;
            row1.front_height = 22.4;
            row1.back_height = 19.6;
            row1.birdsbox = 2;

            let row2 = frm.add_child('table_qxwc');
            row2.bird = "Male";
            row2.front = 24;
            row2.depth = 18;
            row2.front_height = 24;
            row2.back_height = 24;
            row2.birdsbox = 2;
        }

        frm.refresh_field('table_qxwc');
    }
}


// frappe.ui.form.on('Cages - Broiler Breeder - H Type - Layer Stage', {
//     refresh: function(frm) {

//         let calculated_fields = [

//             "birds_per_male_topmost_tier",
//             "no_of_birds_in_female_section_below_male_birds",
//             "total_female_birds_in_female_section_all_tiers",

//             "male_sec",
//             "section_width_male",
//             "section_width_female",

//             "total_no_of_male_birds_per_row",
//             "total_male_birds",
//             "total_length_of_male_section",
//             "male_section_cage_length_per_row",

//             "f_sec_below_the_m_sec",
//             "female_birds_below_male_sections_each_row",
//             "total_female_birds_below_male_sections_all_rows",

//             "total_female_bird_in_female_tier",
//             "total_female_birds_in_each_row",
//             "no_of_sections_with_all_female_birds_in_all_three_tiers",
//             "total_female_birds",

//             "length_of_female_bird_sections_below_the_male_birds_sections",
//             "full_female_section_cage_length_per_row",
//             "total_cage_length_inch",
//             "final_cage_length_for_quotation_feet",

//             "width_of_one_row",
//             "total_space_for_all_rows",
//             "no_of_gaps",
//             "total_space_for_gaps",
//             "final_shed_width",
//             "gap_between_two_rows",
//             "added_length",
//             "rate_per_female_bird",
//             "rate_per_female_bird_copy",
//             "total_rate_of_male_battery_cages_for_1_shed",
//             "total_rate_of_female_battery_cages_for_one_shed",
//             "per_row_cost_2",
//             "shed_length_aft",
//             "no_of_rows_in_1_shed_aft",
//             "cost_for_all_rows_aft",
//             "shed_length_ec",
//             "no_of_rows_in_1_shed_ec",
//             "cost_for_all_rows_ec",
//             "per_row_cost_ec",
//             "shed_lenght",
//             "shed_width",
//             "average_height",
//             "total_area_in_cu_ft",
//             "total_cfm",
//             "air_exchange",
//             "no_of_fan",
//             "tunnel_fan_count",
//             "fan_capacity_pascal",
//             "fan_capacity_cfm",
//             "cooling_pad_cfmsqft",
//             "pad_area_in_sqft",
//             "total_sqft",
//             "total_pads",
//             "cooling_pad_count",
//             "pump_hp",
//             "pump_quantity",
//             "filter",
//             "eletronic_cotroller_quantity",
//             "temperature_sensor",
//             "plumbing_material",
//             "humidity_sensor",
//             "relay",
//             "electrical_control_panel",
//             "alarm_system",
//             "plumbing_material",
//             "fan_50_price",
//             "cooling_pad_price",
//             "gi_gutter_system_price",
//             "thirtysix_fan_price",
//             "filter_price",
//             "pump_price",
//             "plumbing_material_price",
//             "control_panel_price",
//             "electronic_contoller_price",
//             "misc_price",
//             "ups_alarm_price",
//             "installation_price",
//             "tdl_price",
//             "tdl_winch_motorised_price",
//             "air_inlet_price",
//             "air_inlet_winch_motorised_price",
//             "total_cost_of_ec_system",
//             "female_bird_count_cm",
//             "total_price_of_cage_mat",
//             "total_no_mats",
//             "price_cage_mat",
//             "body_weight_at_40_days",
//             "feed_conversion_ratio",
//             "silo__capacity_estimated",
//             "silo_rate",
//             "silo_amount",
//             "no_of_rows",
//             "rate_per_running_feet",
//             "fill_system_amount",
//             "total_silo_cost",
//             "no_of_rows_fill",
//             "rate_per_running_feet_fill",
//             "fill_system_amounts",
//             "hopper_rate",
//             "hopper_amount",
//             "no_of_hoppers",
//             "total_1_ton_hopper_with_fill_system",


//             "final_shed_lenght_for_quotation"
//         ];

//         calculated_fields.forEach(field => {

//             if (frm.doc.calculation_method == "Bird To Shed") {
//                 frm.set_df_property(field, 'read_only', 1);
//             }

//         });
//     },

//     calculation_method: function(frm) {
//         frm.refresh();
//     }
// });












frappe.ui.form.on('Cages - Broiler Breeder - H Type - Layer Stage', {

    refresh: function(frm) {

        let bird_to_shed_fields = [

            "birds_per_male_topmost_tier",
            "no_of_birds_in_female_section_below_male_birds",
            "total_female_birds_in_female_section_all_tiers",

            "male_sec",
            "section_width_male",
            "section_width_female",

            "total_no_of_male_birds_per_row",
            "total_male_birds",
            "total_length_of_male_section",
            "male_section_cage_length_per_row",

            "f_sec_below_the_m_sec",
            "female_birds_below_male_sections_each_row",
            "total_female_birds_below_male_sections_all_rows",

            "total_female_bird_in_female_tier",
            "total_female_birds_in_each_row",
            "no_of_sections_with_all_female_birds_in_all_three_tiers",
            "total_female_birds",

            "length_of_female_bird_sections_below_the_male_birds_sections",
            "full_female_section_cage_length_per_row",
            "total_cage_length_inch",
            "final_cage_length_for_quotation_feet",

            "width_of_one_row",
            "total_space_for_all_rows",
            "no_of_gaps",
            "total_space_for_gaps",
            "final_shed_width",
            "gap_between_two_rows",
            "added_length",
            "rate_per_female_bird",
            "rate_per_female_bird_copy",
            "total_rate_of_male_battery_cages_for_1_shed",
            "total_rate_of_female_battery_cages_for_one_shed",
            "per_row_cost_2",
            "shed_length_aft",
            "no_of_rows_in_1_shed_aft",
            "cost_for_all_rows_aft",
            "shed_length_ec",
            "no_of_rows_in_1_shed_ec",
            "cost_for_all_rows_ec",
            "per_row_cost_ec",
            "shed_lenght",
            "shed_width",
            "average_height",
            "total_area_in_cu_ft",
            "total_cfm",
            "air_exchange",
            "no_of_fan",
            "tunnel_fan_count",
            "fan_capacity_pascal",
            "fan_capacity_cfm",
            "cooling_pad_cfmsqft",
            "pad_area_in_sqft",
            "total_sqft",
            "total_pads",
            "cooling_pad_count",
            "pump_hp",
            "pump_quantity",
            "filter",
            "eletronic_cotroller_quantity",
            "temperature_sensor",
            "plumbing_material",
            "humidity_sensor",
            "relay",
            "electrical_control_panel",
            "alarm_system",
            "plumbing_material",
            "fan_50_price",
            "cooling_pad_price",
            "gi_gutter_system_price",
            "thirtysix_fan_price",
            "filter_price",
            "pump_price",
            "plumbing_material_price",
            "control_panel_price",
            "electronic_contoller_price",
            "misc_price",
            "ups_alarm_price",
            "installation_price",
            "tdl_price",
            "tdl_winch_motorised_price",
            "air_inlet_price",
            "air_inlet_winch_motorised_price",
            "total_cost_of_ec_system",
            "female_bird_count_cm",
            "total_price_of_cage_mat",
            "total_no_mats",
            "price_cage_mat",
            "body_weight_at_40_days",
            "feed_conversion_ratio",
            "silo__capacity_estimated",
            "silo_rate",
            "silo_amount",
            "no_of_rows",
            "rate_per_running_feet",
            "fill_system_amount",
            "total_silo_cost",
            "no_of_rows_fill",
            "rate_per_running_feet_fill",
            "fill_system_amounts",
            "hopper_rate",
            "hopper_amount",
            "no_of_hoppers",
            "total_1_ton_hopper_with_fill_system",


            "final_shed_lenght_for_quotation"
        ];

        let shed_to_bird_fields = [

     "birds_per_male_topmost_tier",
    "no_of_birds_in_female_section_below_male_birds",
    "total_female_birds_in_female_section_all_tiers",

    "male_sec",

    "total_no_of_male_birds_per_row",
    "total_male_birds",

    "f_sec_below_the_m_sec",

    "no_of_sections_with_all_female_birds_in_all_three_tiers",
    "total_female_birds",

    "final_cage_length_for_quotation_feet",

    "two_tier_female_section_feet",
    "three_tier_female_section_feet",
    "three_tier_female_section_inch",
    "two_tier_female_section_inch",

    "total_female_birds_in_full_female_sections_in_all_rows",
    "total_female_bird_per_row",

    "one_tier_male_sections_inch",
    "total_female_birds_below_the_male_sections_in_all_rows",
    "section_width_male",
    "section_width_female",



            "per_row_cost_2",
            "shed_length_aft",
            "no_of_rows_in_1_shed_aft",
            "cost_for_all_rows_aft",
            "shed_length_ec",
            "no_of_rows_in_1_shed_ec",
            "cost_for_all_rows_ec",
            "per_row_cost_ec",
            "shed_lenght",
            "shed_width",
            "average_height",
            "total_area_in_cu_ft",
            "total_cfm",
            "air_exchange",
            "no_of_fan",
            "tunnel_fan_count",
            "fan_capacity_pascal",
            "fan_capacity_cfm",
            "cooling_pad_cfmsqft",
            "pad_area_in_sqft",
            "total_sqft",
            "total_pads",
            "cooling_pad_count",
            "pump_hp",
            "pump_quantity",
            "filter",
            "eletronic_cotroller_quantity",
            "temperature_sensor",
            "plumbing_material",
            "humidity_sensor",
            "relay",
            "electrical_control_panel",
            "alarm_system",
            "plumbing_material",
            "fan_50_price",
            "cooling_pad_price",
            "gi_gutter_system_price",
            "thirtysix_fan_price",
            "filter_price",
            "pump_price",
            "plumbing_material_price",
            "control_panel_price",
            "electronic_contoller_price",
            "misc_price",
            "ups_alarm_price",
            "installation_price",
            "tdl_price",
            "tdl_winch_motorised_price",
            "air_inlet_price",
            "air_inlet_winch_motorised_price",
            "total_cost_of_ec_system",
            "female_bird_count_cm",
            "total_price_of_cage_mat",
            "total_no_mats",
            "price_cage_mat",
            "body_weight_at_40_days",
            "feed_conversion_ratio",
            "silo__capacity_estimated",
            "silo_rate",
            "silo_amount",
            "no_of_rows",
            "rate_per_running_feet",
            "fill_system_amount",
            "total_silo_cost",
            "no_of_rows_fill",
            "rate_per_running_feet_fill",
            "fill_system_amounts",
            "hopper_rate",
            "hopper_amount",
            "no_of_hoppers",
            "total_1_ton_hopper_with_fill_system",


            "1_tier_male_sections_inch"
        ];

        [...new Set([...bird_to_shed_fields, ...shed_to_bird_fields])].forEach(field => {
            frm.set_df_property(field, 'read_only', 0);
        });

        if (frm.doc.calculation_method == "Bird To Shed") {

            bird_to_shed_fields.forEach(field => {
                frm.set_df_property(field, 'read_only', 1);
            });

        }

        if (frm.doc.calculation_method == "Shed To Bird") {

            shed_to_bird_fields.forEach(field => {
                frm.set_df_property(field, 'read_only', 1);
            });

        }

    },

    calculation_method: function(frm) {
        frm.refresh();
    }

});










frappe.ui.form.on('Cages - Broiler Breeder - H Type - Layer Stage', {

    refresh: function(frm) {
        toggle_shed_to_bird_fields(frm);
    },

    calculation_method: function(frm) {
        toggle_shed_to_bird_fields(frm);
    }

});

function toggle_shed_to_bird_fields(frm) {

    let hide_in_shed_to_bird = [

        // "section_width_male",
        // "section_width_female",
        "total_length_of_male_section",
        "male_section_cage_length_per_row",
        "female_birds_below_male_sections_each_row",
        "total_female_birds_below_male_sections_all_rows",
        "total_female_bird_in_female_tier",
        "total_female_birds_in_each_row",
        "length_of_female_bird_sections_below_the_male_birds_sections",
        "full_female_section_cage_length_per_row",
        "total_cage_length_inch",
        "width_of_one_row",
        "total_space_for_all_rows",
        "no_of_gaps",
        "total_space_for_gaps",
        "gap_between_two_rows",
        "female",
        "male",
        "added_length",
        "rate_per_female_bird",
        "rate_per_female_bird_copy",
        "total_rate_of_male_battery_cages_for_1_shed",
        "total_rate_of_female_battery_cages_for_one_shed"
    ];

    hide_in_shed_to_bird.forEach(field => {
        frm.set_df_property(field, 'hidden', 0);
    });

    if (frm.doc.calculation_method == "Shed To Bird") {

        hide_in_shed_to_bird.forEach(field => {
            frm.set_df_property(field, 'hidden', 1);
        });

    }
}

// ==== EC Price ====
frappe.ui.form.on('Cages - Broiler Breeder - H Type - Layer Stage', {
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
        frappe.msgprint("No active Cage H Type Item Pricing Rule found");
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
            doctype: "Cage H Type Item Pricing Rule",
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
            "Cage H Type Item Pricing Rule",
            res.message[0].name
        );
    });
}

function flt(v) {
    return parseFloat(v) || 0;
}

frappe.ui.form.on('Cages - Broiler Breeder - H Type - Layer Stage', {
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






// frappe.ui.form.on("Cages - Broiler Breeder - H Type - Layer Stage", {
//     display_currency(frm) {
//         update_silo_defaults(frm);
//     },

//     exchange_rate(frm) {
//         update_silo_defaults(frm);
//     },

//     validate(frm) {
//         update_silo_defaults(frm);
//     },
//     onload(frm) {
//         if (frm.is_new()) {
//             update_silo_defaults(frm);
//         }
//     },
// });

// function update_silo_defaults(frm) {

//     let loader_rate = 110000;
//     let loader_amount = 110000;
//     let weighing_system_cost = 106582;
//     let hopper_rate = 25000;
//     let hopper_amount = 25000;

//     if (frm.doc.display_currency && frm.doc.display_currency !== "INR") {
//         let exchange_rate = flt(frm.doc.exchange_rate) || 1;

//         loader_rate = loader_rate / exchange_rate;
//         loader_amount = loader_amount / exchange_rate;
//         weighing_system_cost = weighing_system_cost / exchange_rate;
//         hopper_rate = hopper_rate / exchange_rate;
//         hopper_amount = hopper_amount / exchange_rate;
//     }

//     frm.set_value("loader_rate", loader_rate);
//     frm.set_value("loader_amount", loader_amount);
//     frm.set_value("weighing_system_cost", weighing_system_cost);
//     frm.set_value("hopper_rate", hopper_rate);
//     frm.set_value("hopper_amount", hopper_amount);
// }

// ==== Exchange Rate Popup --BBHL ====
frappe.ui.form.on("Cages - Broiler Breeder - H Type - Layer Stage", {
    before_save(frm) {
        frm._is_first_save = frm.is_new();
    },

    after_save(frm) {
        if (!frm._is_first_save) return;

        const rate = frm.doc.exchange_rate;

        frappe.msgprint({
            title: __("Check Exchange Rate"),
            indicator: rate ? "blue" : "orange",
            message: rate
                ? __("Current <b>Exchange Rate</b>: <b>{0}</b><br>⚠️ Please Verify Before Processing the Calculator", [rate])
                : __("⚠️ <b>Exchange Rate</b> is not set. Please set it before processing the Calculator.")
        });
    }
});


frappe.ui.form.on("Cages - Broiler Breeder - H Type - Layer Stage", {
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




frappe.ui.form.on("Cages - Broiler Breeder - H Type - Layer Stage", {
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


frappe.ui.form.on("Cages - Broiler Breeder - H Type - Layer Stage", {
    onload(frm) {
        if (frm.is_new() && !frm.doc.date) {
            frm.set_value("date", frappe.datetime.get_today());
        }
    }
});

// ==== New Logic For EC Syste, ====
frappe.ui.form.on("Cages - Broiler Breeder - H Type - Layer Stage", {
    validate(frm) {
        // Return the promise so Frappe waits for it to complete before saving
        return calculate_values(frm);
    },
    side_height: calculate_values,
    centre_height: calculate_values,
    shed_lenght: calculate_values,
    shed_width: calculate_values,
});

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

// ─── Helper: safe float parse ───
function flt(v) {
    return parseFloat(v) || 0;
}

// ─── Helper: fetch active Cage H Type Item Pricing Rule (Optimized) ───
function get_active_pricing_rule() {
    return frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Cage H Type Item Pricing Rule",
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
                doctype: "Cage H Type Item Pricing Rule",
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
    let shed_lenght = flt(frm.doc.final_shed_lenght_for_quotation);
    let shed_width = flt(frm.doc.final_shed_width);
    frm.set_value("shed_lenght", shed_lenght);
    frm.set_value("shed_width", shed_width);

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

// ==== Silo HTML View - BBHL ====
frappe.ui.form.on("Cages - Broiler Breeder - H Type - Layer Stage", {
    refresh(frm) {
        render_silo_pricing(frm);
    },
});

// NOTE: duplicate get_active_pricing_rule() definition (identical to the one in
// "New Logic For EC Syste,") removed here - see that script's definition above.

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

// ==== HTML View Logic ====
frappe.ui.form.on("Cages - Broiler Breeder - H Type - Layer Stage", {
    refresh(frm) {
        render_cage_h_pricing(frm);
    },
});

// NOTE: duplicate get_active_pricing_rule() definition (identical to the one in
// "New Logic For EC Syste,") removed here - see that script's definition above.

function get_item_names(codes) {
    let unique = [...new Set((codes || []).filter(Boolean))];
    if (!unique.length) return Promise.resolve({});
    return frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Item",
            filters: [["name", "in", unique]],
            fields: ["name", "item_name"],
            limit_page_length: 0,
        },
    }).then((res) => {
        let map = {};
        (res && res.message ? res.message : []).forEach(function (it) {
            map[it.name] = it.item_name || it.name;
        });
        return map;
    });
}

// NOTE: duplicate fmt_num() definition (identical to the one in "Silo HTML View
// - BBHL") removed here - see that script's definition above.

function build_table(title, headers, rows) {
    let colspan = headers.length;
    let head_cells = headers
        .map((h) => `<th>${frappe.utils.escape_html(h)}</th>`)
        .join("");
    let body = rows.join("");
    if (!body) {
        body = `<tr><td colspan="${colspan}" style="text-align:center;">No active pricing found</td></tr>`;
    }

    return `
<style>
.price-table{ width:100%; border-collapse:collapse; font-size:12px; font-family:Arial, sans-serif; color:#333; }
.price-table th, .price-table td{ border:1px solid #dcdcdc; padding:6px 10px; text-align:center; }
.price-title{ background:#3f51b5; color:#fff; font-weight:700; font-size:13px; }
.price-header{ background:#eef1ff; font-weight:600; }
.price-table tbody tr:nth-child(odd)  td{ background:#ffffff; }
.price-table tbody tr:nth-child(even) td{ background:#f9f9f9; }
.first-col{ text-align:left; font-weight:600; }
.cost{ color:#0d47a1; font-weight:600; }

/* ---------- DARK MODE ---------- */
[data-theme="dark"] .price-table, [data-theme="dark"] .first-col{ color:#e0e0e0; }
[data-theme="dark"] .price-table th, [data-theme="dark"] .price-table td{ border-color:#444; }
[data-theme="dark"] .price-header{ background:#2a2f45; color:#c5cae9; }
[data-theme="dark"] .price-table tbody tr:nth-child(odd)  td{ background:#1e1e1e; }
[data-theme="dark"] .price-table tbody tr:nth-child(even) td{ background:#262626; }
[data-theme="dark"] .cost{ color:#90caf9; }
</style>
<table class="price-table">
<thead>
<tr class="price-title"><th colspan="${colspan}">${frappe.utils.escape_html(title)}</th></tr>
<tr class="price-header">${head_cells}</tr>
</thead>
<tbody>
${body}
</tbody>
</table>`;
}

function set_html(frm, fieldname, html) {
    let field = frm.get_field(fieldname);
    if (field) field.html(html);
}

async function render_cage_h_pricing(frm) {
    let doc = await get_active_pricing_rule();

    let mat_data = (doc && doc.cage_mat_pricing_logic) || [];
    let name_map = await get_item_names(mat_data.map((r) => r.cage_mat_item));
    let mat_rows = mat_data.map(function (row) {
        let code = row.cage_mat_item || "";
        let name = name_map[code];
        let display = name ? `${code} (${name})` : code;
        return `<tr>
            <td class="first-col">${frappe.utils.escape_html(String(display))}</td>
            <td class="cost">${fmt_num(row.price)}</td>
        </tr>`;
    });
    set_html(
        frm,
        "html_abei",
        build_table("Cage Mat Pricing", ["Cage Mat", "Price"], mat_rows)
    );

    let aft_rows = ((doc && doc.automatic_feeding_trolley_price_table) || []).map(function (row) {
        return `<tr>
            <td class="first-col">${fmt_num(row.shed_length_start)}</td>
            <td>${fmt_num(row.shed_length_end)}</td>
            <td class="cost">${fmt_num(row.cost_per_row)}</td>
        </tr>`;
    });
    set_html(
        frm,
        "html_nyjy",
        build_table(
            "Automatic Feeding Trolley Pricing",
            ["Shed Length From", "Shed Length To", "Cost per Row"],
            aft_rows
        )
    );

    let egg_rows = ((doc && doc.egg_collection_pricing_logic) || []).map(function (row) {
        return `<tr>
            <td class="first-col">${fmt_num(row.shed_length_start)}</td>
            <td>${fmt_num(row.shed_length_end)}</td>
            <td class="cost">${fmt_num(row.cost_per_row)}</td>
        </tr>`;
    });
    set_html(
        frm,
        "html_vizk",
        build_table(
            "Egg Collection Pricing",
            ["Shed Length From", "Shed Length To", "Cost per Row"],
            egg_rows
        )
    );
}
