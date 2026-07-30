// ==== Item Updation logic in opportunity ====
frappe.ui.form.on("Broiler EC House", {

    validate: async function(frm) {

        let date = frm.doc.date || frappe.datetime.get_today();

        let res = await frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Broiler EC House Pricing Rule",
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
            "Broiler EC House Pricing Rule",
            res.message[0].name
        );

        // if (!pr.male_bird_item) {
        //     frappe.throw("❌ Broiler Birds item not set in Pricing Rule");
        // }

        if (frm.doc.environment_cooling_system && !pr.environment_control_ec_item) {
            frappe.throw("❌ Environment Cooling System Item missing in Pricing Rule");
        }

        if (frm.doc.silo_with_fill_system && !pr.silo_item) {
            frappe.throw("❌ Silo Item missing in Pricing Rule");
        }

        if (frm.doc.ones_ton_hopper_with_fill_system && !pr.one_ton_hopper_item) {
            frappe.throw("❌ 1 Ton Hopper Item missing in Pricing Rule");
        }

        if (frm.doc.automatic_pan_feeding_system && !pr.automatic_pan_feedig_system) {
            frappe.throw("❌ Automatic Pan Feeding System Item missing in Pricing Rule");
        }

        if (frm.doc.automatic_nipple_drinking_system && !pr.automatic_nipple_drinking_system) {
            frappe.throw("❌ Automatic Nipple Drinking System Item missing in Pricing Rule");
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
                doctype: "Broiler EC House Pricing Rule",
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
            "Broiler EC House Pricing Rule",
            res.message[0].name
        );

        console.log("DEBUG frm.doc values:", {
            pan_feeding: frm.doc.total_cost_of_pan_feeding_system_pfs,
            nipple_drinking: frm.doc.total_cost_of_nipple_drinkking_system,
            ec_system: frm.doc.total_cost_of_ec_system,
            silo: frm.doc.total_silo_cost,
            hopper: frm.doc.total_1_ton_hopper_with_fill_system,
            curtain_below_platform: frm.doc.curtain_below_platform_rates,
            cooling_pad_curtain: frm.doc.curtain_winching_cpc,
            white_curtain: frm.doc.curtain_winching_wc,
            ceiling_curtain: frm.doc.curtain_winching_cc,
            curtain_winching: frm.doc.curtain_winching,
            curtain_winching_ech: frm.doc.curtain_winching_ech,
            curtain_winching_c: frm.doc.curtain_winching_c,
        });

        let required_items = [];

        //required_items.push(pr.male_bird_item);

        if (frm.doc.automatic_pan_feeding_system) {
            required_items.push(pr.automatic_pan_feedig_system);
        }

        if (frm.doc.automatic_nipple_drinking_system) {
            required_items.push(pr.automatic_nipple_drinking_system);
        }

        if (frm.doc.environment_cooling_system) {
            required_items.push(pr.environment_control_ec_item);
        }

        if (frm.doc.side_curtain_vinching_system) {
            required_items.push(pr.side_curtain_vinching_system);
        }

        if (frm.doc.silo_with_fill_system) {
            required_items.push(pr.silo_item);
        }

        if (frm.doc.ones_ton_hopper_with_fill_system) {
            required_items.push(pr.one_ton_hopper_item);
        }

        if (frm.doc.curtain_below_platform) {
            required_items.push(pr.curtain_below_platform);
        }

        if (frm.doc.cooling_pad_curtain) {
            required_items.push(pr.cooling_pad_curtain);
        }

        if (frm.doc.white_curtain) {
            required_items.push(pr.white_curtain);
        }

        if (frm.doc.ceiling_curtain) {
            required_items.push(pr.ceiling_curtain);
        }

        let controlled_items = [
            // pr.male_bird_item,
            pr.automatic_pan_feedig_system,
            pr.automatic_nipple_drinking_system,
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

            let existingRow = existing_items.find(d => d.item_code === item);

            if (existingRow) {

                // UPDATE existing item
                // if (item === pr.male_bird_item) {
                //     existingRow.qty = frm.doc.total_birds_per_shed || 1;
                //     existingRow.rate = 0;
                // }
                if (item === pr.automatic_pan_feedig_system) {
                    existingRow.rate = frm.doc.total_cost_of_pan_feeding_system_pfs || 0;
                }
                if (item === pr.automatic_nipple_drinking_system) {
                    existingRow.rate = frm.doc.total_cost_of_nipple_drinkking_system || 0;
                }
                if (item === pr.environment_control_ec_item) {
                    existingRow.rate = frm.doc.total_cost_of_ec_system || 0;
                }
                if (item === pr.side_curtain_vinching_system) {
                    if (frm.doc.environment_cooling_system == 0) {
                        existingRow.rate = frm.doc.curtain_winching || 0;
                    } else {
                        if (frm.doc.select_winching_type === "For Both Sides") {
                            existingRow.rate = frm.doc.curtain_winching_ech || 0;
                        } else if (frm.doc.select_winching_type === "for C Section") {
                            existingRow.rate = frm.doc.curtain_winching_c || 0;
                        } else {
                            existingRow.rate = 0;
                        }
                    }
                }
                if (item === pr.silo_item) {
                    existingRow.rate = frm.doc.total_silo_cost || 0;
                }
                if (item === pr.one_ton_hopper_item) {
                    existingRow.rate = frm.doc.total_1_ton_hopper_with_fill_system || 0;
                }
                if (item === pr.curtain_below_platform) {
                    existingRow.rate = frm.doc.curtain_below_platform_rates || 0;
                }
                if (item === pr.cooling_pad_curtain) {
                    existingRow.rate = frm.doc.curtain_winching_cpc || 0;
                }
                if (item === pr.white_curtain) {
                    existingRow.rate = frm.doc.curtain_winching_wc || 0;
                }
                if (item === pr.ceiling_curtain) {
                    existingRow.rate = frm.doc.curtain_winching_cc || 0;
                }

                console.log(`Updated item: ${item}, rate: ${existingRow.rate}`);

            } else {

                // ADD new item
                let qty = 1;
                let rate = 0;

                // if (item === pr.male_bird_item) {
                //     qty = frm.doc.total_birds_per_shed || 1;
                //     rate = 0;
                // }
                if (item === pr.automatic_pan_feedig_system) {
                    rate = frm.doc.total_cost_of_pan_feeding_system_pfs || 0;
                }
                if (item === pr.automatic_nipple_drinking_system) {
                    rate = frm.doc.total_cost_of_nipple_drinkking_system || 0;
                }
                if (item === pr.environment_control_ec_item) {
                    rate = frm.doc.total_cost_of_ec_system || 0;
                }
                if (item === pr.side_curtain_vinching_system) {
                    if (frm.doc.environment_cooling_system == 0) {
                        rate = frm.doc.curtain_winching || 0;
                    } else {
                        if (frm.doc.select_winching_type === "For Both Sides") {
                            rate = frm.doc.curtain_winching_ech || 0;
                        } else if (frm.doc.select_winching_type === "for C Section") {
                            rate = frm.doc.curtain_winching_c || 0;
                        } else {
                            rate = 0;
                        }
                    }
                }
                if (item === pr.silo_item) {
                    rate = frm.doc.total_silo_cost || 0;
                }
                if (item === pr.one_ton_hopper_item) {
                    rate = frm.doc.total_1_ton_hopper_with_fill_system || 0;
                }
                if (item === pr.curtain_below_platform) {
                    rate = frm.doc.curtain_below_platform_rates || 0;
                }
                if (item === pr.cooling_pad_curtain) {
                    rate = frm.doc.curtain_winching_cpc || 0;
                }
                if (item === pr.white_curtain) {
                    rate = frm.doc.curtain_winching_wc || 0;
                }
                if (item === pr.ceiling_curtain) {
                    rate = frm.doc.curtain_winching_cc || 0;
                }

                console.log(`Adding item: ${item}, qty: ${qty}, rate: ${rate}`);

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
            message: "Opportunity synced (Deep Litter)",
            indicator: "green"
        });
    }

});

// ==== Currency Fetch ====
frappe.ui.form.on("Broiler EC House", {
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


frappe.ui.form.on("Broiler EC House", {
    refresh: function(frm) {
        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "User Group",
                name: "US Local"
            },
            callback: function(r) {
                if (!r.message) return;

                let members = (r.message.user_group_members  || []).map(d => d.user);

                if (members.includes(frappe.session.user)) {
                    if (frm.is_new() && frm.doc.measurement_unit !== "Meter") {
                        frm.set_value("measurement_unit", "Meter");
                    }
                }
            }
        });
    }
});


frappe.ui.form.on("Broiler EC House", {
    onload(frm) {
        if (frm.is_new() && !frm.doc.date) {
            frm.set_value("date", frappe.datetime.get_today());
        }
    }
});

// ==== Deep Litter - Broiler ====
frappe.ui.form.on("Broiler EC House", {

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


frappe.ui.form.on("Broiler EC House", {
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



frappe.ui.form.on("Broiler EC House", {
    measurement_unit: function(frm) {
        convert_meter_to_feet(frm);
    },

    shed_length_in_meter: function(frm) {
        convert_meter_to_feet(frm);
    },

    validate: function(frm) {
        convert_meter_to_feet(frm);
    },

    shed_width_in_meter: function(frm) {
        convert_meter_to_feet(frm);
    },

    side_height_meter: function(frm) {
        convert_meter_to_feet(frm);
    },

    centre_height_meter: function(frm) {
        convert_meter_to_feet(frm);
    },

    //  shed_length_in_meter_copy: function(frm) {
    //     convert_meter_to_feet(frm);
    // },
    //  shed_width_in_meter_copy: function(frm) {
    //     convert_meter_to_feet(frm);
    // },
    // shed_length_meter_nps: function(frm) {
    //     convert_meter_to_feet(frm);
    // },
    // shed_width_meter_nds: function(frm) {
    //     convert_meter_to_feet(frm);
    // },
    // shed_width_meter_ec: function(frm) {
    //     convert_meter_to_feet(frm);
    // },
    // shed_length_meter_ec: function(frm) {
    //     convert_meter_to_feet(frm);
    // },
    // sideheight_meter: function(frm) {
    //     convert_meter_to_feet(frm);
    // },
    // shedlength_meter: function(frm) {
    //     convert_meter_to_feet(frm);
    // },
    // shedmeter: function(frm) {
    //     convert_meter_to_feet(frm);
    // },
    //  shedheight_meetr: function(frm) {
    //     convert_meter_to_feet(frm);
    // },
    //  side_c_meter: function(frm) {
    //     convert_meter_to_feet(frm);
    // },
    //  shed_c_meter: function(frm) {
    //     convert_meter_to_feet(frm);
    // },
});

function convert_meter_to_feet(frm) {

    if (frm.doc.measurement_unit !== "Meter") {
        return;
    }

    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Broiler EC House Pricing Rule",
            filters: [
                ["valid_from", "<=", frappe.datetime.get_today()],
                ["valid_to", ">=", frappe.datetime.get_today()]
            ],
            fields: ["meter_to_feet_conversion_factor"],
            limit_page_length: 1
        },
        callback: function(r) {

            if (!r.message || !r.message.length) {
                return;
            }

            let factor = flt(r.message[0].meter_to_feet_conversion_factor);

            frm.set_value(
                "shed_length",
                flt(frm.doc.shed_length_in_meter) * factor
            );

            frm.set_value(
                "shed_width",
                flt(frm.doc.shed_width_in_meter) * factor
            );

            frm.set_value(
                "side_height",
                flt(frm.doc.side_height_meter) * factor
            );

            frm.set_value(
                "centre_height",
                flt(frm.doc.centre_height_meter) * factor
            );
            // frm.set_value(
            //     "shed_lengthin_feet",
            //     flt(frm.doc.shed_length_in_meter_copy) * factor
            // );
            // frm.set_value(
            //     "shed_width_in_feet",
            //     flt(frm.doc.shed_width_in_meter_copy) * factor
            // );
            //  frm.set_value(
            //     "shed_length_nps",
            //     flt(frm.doc.shed_length_meter_nps) * factor
            // );
            //  frm.set_value(
            //     "shed_width_nds",
            //     flt(frm.doc.shed_width_meter_nds) * factor
            // );
            // frm.set_value(
            //     "shed_lenght",
            //     flt(frm.doc.shed_length_meter_ec) * factor
            // );
            // frm.set_value(
            //     "shed_widthq",
            //     flt(frm.doc.shed_width_meter_ec) * factor
            // );
            // frm.set_value(
            //     "shed_length_cws",
            //     flt(frm.doc.shedlength_meter) * factor
            // );
            // frm.set_value(
            //     "side_height_cws",
            //     flt(frm.doc.sideheight_meter) * factor
            // );
            // frm.set_value(
            //     "shed_length_ech",
            //     flt(frm.doc.shedmeter) * factor
            // );
            // frm.set_value(
            //     "side_height_ech",
            //     flt(frm.doc.shedheight_meetr) * factor
            // );
            // frm.set_value(
            //     "shed_length_c",
            //     flt(frm.doc.shed_c_meter) * factor
            // );
            // frm.set_value(
            //     "side_height_c",
            //     flt(frm.doc.side_c_meter) * factor
            // );
        }
    });
}






frappe.ui.form.on("Broiler EC House", {
    average_height: function(frm) {
        update_meter_fields(frm);
    },

    production_area: function(frm) {
        update_meter_fields(frm);
    }
});

function update_meter_fields(frm) {

        if (frm.doc.measurement_unit !== "Meter") {
        return;
    }

    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Broiler EC House Pricing Rule",
            filters: [
                ["valid_from", "<=", frappe.datetime.get_today()],
                ["valid_to", ">=", frappe.datetime.get_today()]
            ],
            fields: ["feet_to_meter_conversion_factor"],
            limit_page_length: 1
        },
        callback: function(r) {

            if (!r.message || !r.message.length) {
                return;
            }

            let factor = flt(r.message[0].feet_to_meter_conversion_factor);

            frm.set_value(
                "average_height_meters",
                flt(frm.doc.average_height) * factor
            );

            frm.set_value(
                "production_area_meter",
                flt(frm.doc.production_area) * factor * factor
            );
            frm.set_value(
                "total_area_in_cubic_meter",
                flt(frm.doc.total_area_in_cu_ft) * factor * factor* factor
            );
        }
    });
}







frappe.ui.form.on("Broiler EC House", {
    measurement_unit: function(frm) {
        convert_feet_to_meter(frm);
    },

    shed_length: function(frm) {
        convert_feet_to_meter(frm);
    },

    shed_width: function(frm) {
        convert_feet_to_meter(frm);
    },

    side_height: function(frm) {
        convert_feet_to_meter(frm);
    },

    centre_height: function(frm) {
        convert_feet_to_meter(frm);
    },

    average_height: function(frm) {
        convert_feet_to_meter(frm);
    },

    production_area: function(frm) {
        convert_feet_to_meter(frm);
    },

    // shed_lengthin_feet: function(frm) {
    //     convert_feet_to_meter(frm);
    // },

    // shed_width_in_feet: function(frm) {
    //     convert_feet_to_meter(frm);
    // },

    // shed_width_nds: function(frm) {
    //     convert_feet_to_meter(frm);
    // },

    // shed_length_nps: function(frm) {
    //     convert_feet_to_meter(frm);
    // },

    // shed_widthq: function(frm) {
    //     convert_feet_to_meter(frm);
    // },

    // shed_lenght: function(frm) {
    //     convert_feet_to_meter(frm);
    // },

    // // // ADDED
    // shed_length_cws: function(frm) {
    //     convert_feet_to_meter(frm);
    // },

    // side_height_cws: function(frm) {
    //     convert_feet_to_meter(frm);
    // },

    // // // ADDED
    // shed_length_ech: function(frm) {
    //     convert_feet_to_meter(frm);
    // },

    // side_height_ech: function(frm) {
    //     convert_feet_to_meter(frm);
    // },

    // shed_length_c: function(frm) {
    //     convert_feet_to_meter(frm);
    // },

    // side_height_c: function(frm) {
    //     convert_feet_to_meter(frm);
    // },
    //  side_height_cc: function(frm) {
    //     convert_feet_to_meter(frm);
    // },
    //  shed_length_cc: function(frm) {
    //     convert_feet_to_meter(frm);
    // },
    // shed_size_wc: function(frm) {
    //     convert_feet_to_meter(frm);
    // },
    // shed_length_cbp: function(frm) {
    //     convert_feet_to_meter(frm);
    // },
    // shed_width_cpc: function(frm) {
    //     convert_feet_to_meter(frm);
    // },

    validate: function(frm) {
        convert_feet_to_meter(frm);
    }
});

function convert_feet_to_meter(frm) {

    if (frm.doc.measurement_unit !== "Feet") {
        return;
    }

    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Broiler EC House Pricing Rule",
            filters: [
                ["valid_from", "<=", frappe.datetime.get_today()],
                ["valid_to", ">=", frappe.datetime.get_today()]
            ],
            fields: ["feet_to_meter_conversion_factor"],
            limit_page_length: 1
        },
        callback: function(r) {

            if (!r.message || !r.message.length) {
                return;
            }

            let factor = flt(r.message[0].feet_to_meter_conversion_factor);

            frm.set_value(
                "shed_length_in_meter",
                flt(frm.doc.shed_length) * factor
            );

            frm.set_value(
                "shed_width_in_meter",
                flt(frm.doc.shed_width) * factor
            );

            frm.set_value(
                "side_height_meter",
                flt(frm.doc.side_height) * factor
            );

            frm.set_value(
                "centre_height_meter",
                flt(frm.doc.centre_height) * factor
            );

            frm.set_value(
                "average_height_meters",
                flt(frm.doc.average_height) * factor
            );

            frm.set_value(
                "production_area_meter",
                flt(frm.doc.production_area) * factor * factor
            );

            // frm.set_value(
            //     "shed_width_in_meter_copy",
            //     flt(frm.doc.shed_width_in_feet) * factor
            // );

            // frm.set_value(
            //     "shed_length_in_meter_copy",
            //     flt(frm.doc.shed_lengthin_feet) * factor
            // );

            // frm.set_value(
            //     "shed_length_meter_nps",
            //     flt(frm.doc.shed_length_nps) * factor
            // );

            // frm.set_value(
            //     "shed_width_meter_nds",
            //     flt(frm.doc.shed_width_nds) * factor
            // );

            // frm.set_value(
            //     "shed_length_meter_ec",
            //     flt(frm.doc.shed_lenght) * factor
            // );

            // frm.set_value(
            //     "shed_width_meter_ec",
            //     flt(frm.doc.shed_widthq) * factor
            // );

            // frm.set_value(
            //     "shedlength_meter",
            //     flt(frm.doc.shed_length_cws) * factor
            // );

            // frm.set_value(
            //     "sideheight_meter",
            //     flt(frm.doc.side_height_cws) * factor
            // );

            // // // ADDED
            // frm.set_value(
            //     "shedmeter",
            //     flt(frm.doc.shed_length_ech) * factor
            // );

            // frm.set_value(
            //     "shedheight_meetr",
            //     flt(frm.doc.side_height_ech) * factor
            // );

            // // // ADDED
            // frm.set_value(
            //     "shed_c_meter",
            //     flt(frm.doc.shed_length_c) * factor
            // );

            // // // ADDED
            // frm.set_value(
            //     "side_c_meter",
            //     flt(frm.doc.side_height_c) * factor
            // );
            // frm.set_value(
            //     "shed_cc",
            //     flt(frm.doc.shed_length_cc) * factor
            // );
            // frm.set_value(
            //     "side_cc",
            //     flt(frm.doc.side_height_cc) * factor
            // );
            // frm.set_value(
            //     "shed_white",
            //     flt(frm.doc.shed_size_wc) * factor
            // );


            // frm.set_value(
            //     "shed_below",
            //     flt(frm.doc.shed_length_cbp) * factor
            // );
            // frm.set_value(
            //     "side_below",
            //     flt(frm.doc.shed_width_cpc) * factor
            // );


        }
    });
}

// ==== Exchange Rate Popup ====
frappe.ui.form.on("Broiler EC House", {
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

// ==== Visibility logic For Meter And feet fields ====
frappe.ui.form.on("Broiler EC House", {
    refresh(frm) {
        toggle_measurement_fields(frm);
    },

    measurement_unit(frm) {
        toggle_measurement_fields(frm);
    }
});

function toggle_measurement_fields(frm) {

    let meter_fields = [
        "shed_length_in_meter_copy",
        "shed_width_in_meter_copy",
        "shed_length_meter_nps",
        "shed_width_meter_nds",
        "shed_width_meter_ec",
        "shed_length_meter_ec",
        "shedlength_meter",
        "sideheight_meter",
        "shedmeter",
        "shedheight_meetr",
        "shed_c_meter",
        "side_c_meter",
        "shed_cc",
        "side_cc",
        "shed_white",
        "shed_below",
        "side_below",
        "system_length_meter"
    ];

    let feet_fields = [
        "shed_lengthin_feet",
        "shed_width_in_feet",
        "shed_length_nps",
        "shed_width_nds",
        "shed_lenght",
        "shed_widthq",
        "shed_length_cws",
        "side_height_cws",
        "shed_length_ech",
        "side_height_ech",
        "shed_length_c",
        "side_height_c",
        "side_height_cc",
        "shed_length_cc",
        "shed_size_wc",
        "shed_width_cpc",
        "shed_length_cbp",
        "system_length"
    ];
    let extra_fields = [
        "no_of_pan_feeding_lines_pfs",
        "no_of_end_pan_sensor_in_1_shed",
        "total_section_for_1_line",
        "section_for_feeding_line",
        "total_feeding_pan_fr_1_line",
        "total_feeding_pan_per_shed",
        "total_number_of_birds_per_pan",
        "no_nipple_lines",
        "drinking_line_length",
        "no_of_pipes_per_line",
        "total_nipple_per_line",
        "total_nipples_for_1_shed",
        "total_area",
        "no_of_birds_per_nipple",
        "total_area_in_cu_ft",
        "total_area_in_cubic_meter",
        "no_of_fan",
        "tunnel_fan_count",
        "total_pads",
        "cooling_pad_count",
        "fan_capacity_cfm"
    ];


    // Combine all fields
    let all_fields = [...meter_fields, ...feet_fields, ...extra_fields];

    all_fields.forEach(field => {
        frm.set_df_property(field, "hidden", 0);
        frm.set_df_property(field, "read_only", 1);
    });
}











// frappe.ui.form.on("Broiler EC House", {
//     exchange_rate(frm) {
//         calculate_usd_values(frm);
//     },
//     validate(frm) {
//         calculate_usd_values(frm);
//     },

//     rate_per_feet_pfs(frm) {
//         calculate_usd_values(frm);
//     },

//     total_cost_of_pan_feeding_system_pfs(frm) {
//         calculate_usd_values(frm);
//     }
// });

// function calculate_usd_values(frm) {

//     let exchange_rate = flt(frm.doc.exchange_rate);

//     if (!exchange_rate) {
//         frm.set_value("rates", 0);
//         // frm.set_value("total_cost_of_pan_feeding_system_usd", 0);
//         return;
//     }

//     frm.set_value(
//         "rates",
//         flt(frm.doc.rate_per_feet_pfs) / exchange_rate
//     );

//     // frm.set_value(
//     //     "total_cost_of_pan_feeding_system_usd",
//     //     flt(frm.doc.total_cost_of_pan_feeding_system_pfs) / exchange_rate
//     // );
// }




frappe.ui.form.on("Broiler EC House", {
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

// ==== Deep Litter Broilers ====
frappe.ui.form.on('Broiler EC House', {
	async validate(frm) {
        await detail(frm);   // must finish first — everything below depends on it
        nds(frm);
        pfs(frm);
    }

});




async function detail(frm) {

    let shed_width  = flt(frm.doc.shed_width);
    let shed_length = flt(frm.doc.shed_length);
    let date = frm.doc.date || frappe.datetime.get_today();

    // ── Production area & bird count ──
    let production_area = shed_length * shed_width;
    frm.set_value("production_area", production_area);

    let densiti = flt(frm.doc.densiti);
    let total_birds_per_shed = densiti ? Math.round(production_area / densiti) : 0;
    frm.set_value("total_birds_per_shed", total_birds_per_shed);

    try {
        // ── Find the active Pricing Rule for this date ──
        let res = await frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Broiler EC House Pricing Rule",
                filters: [
                    ["valid_from", "<=", date],
                    ["valid_to", ">=", date]
                ],
                fields: ["name"],
                limit_page_length: 1
            }
        });

        if (!res || !res.message || !res.message.length) {
            frappe.msgprint("No active Broiler EC House Pricing Rule found");
            return;
        }

        // ── Fetch the full doc ──
        let r = await frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Broiler EC House Pricing Rule",
                name: res.message[0].name
            }
        });

        let doc = r ? r.message : null;
        if (!doc) return;

        // ── Match shed width against the PFS line table ──
        let rows = doc.table_ruvh || [];   // <-- your actual child table fieldname
        let no_of_pan_feeding_lines = 0;

        rows.forEach(function (row) {
            if (shed_width >= flt(row.shed_width_start) && shed_width <= flt(row.shed_width_end)) {
                no_of_pan_feeding_lines = flt(row.apfs);
            }
        });

        frm.set_value("no_of_pan_feeding_lines", no_of_pan_feeding_lines);
        frm.set_value("no_of_nipple_drinking_lines", no_of_pan_feeding_lines + 1);

    } catch (err) {
        frappe.msgprint("Error fetching pan feeding line configuration");
    }
}


function nds (frm){

    let shed_length_nps=frm.doc.shed_length
    frm.set_value("shed_length_nps",shed_length_nps)

    let shed_width_nds = frm.doc.shed_width
    frm.set_value("shed_width_nds",shed_width_nds)

    let no_nipple_lines=frm.doc.no_of_nipple_drinking_lines
    frm.set_value("no_nipple_lines",no_nipple_lines)

    let dll = (frm.doc.shed_length - 10);
    frm.set_value("drinking_line_length", dll);
    let nppl = (frm.doc.drinking_line_length/frm.doc.per_pipe_length_ft_10inches);
    frm.set_value("no_of_pipes_per_line",nppl);
    let tnpl = Math.round(
    frm.doc.no_of_pipes_per_line * frm.doc.no_of_nipples_per_10_feet_pipe
);
frm.set_value("total_nipple_per_line", tnpl);
let tnfs = Math.round(
    tnpl * frm.doc.no_nipple_lines
);
frm.set_value("total_nipples_for_1_shed", tnfs);
    let ta = (frm.doc.shed_length * frm.doc.shed_width);
    frm.set_value("total_area",ta);

    // let tb = (frm.doc.total_area / frm.doc.density);
    // frm.set_value("total_birds",tb);

    let nbpn = (frm.doc.total_birds_per_shed / frm.doc.total_nipples_for_1_shed);
    nbpn = Math.ceil(nbpn);
    frm.set_value("no_of_birds_per_nipple", nbpn)

    //Price Nipple Drinking System

    // 	frappe.call({
    //         method: "frappe.client.get",
    //         args: {
    //             doctype: "Pan Feeding and Nipple Drinking Price Rule",
    //             name: "Nipple_Drinking"
    //         },
    //         callback: function(r) {

    //             if (r.message) {

    //                 let rows = r.message.table_odsv;


    //                 rows.forEach(function(row){

    //                         if(frm.doc.shed_length_nps>=row.shed_length_start && frm.doc.shed_width_nds<=row.shed_length_end){
    //                         frm.set_value("rate_per_feet_nds",row.cost_per_row);

    //                         let total_cost_of_nipple_drinkking_system = frm.doc.rate_per_feet_nds * frm.doc.shed_length_nps * frm.doc.no_nipple_lines;
    //                         frm.set_value("total_cost_of_nipple_drinkking_system",total_cost_of_nipple_drinkking_system)
    //                         }

    //                         //  let no_of_nipple_drinking_lines=frm.doc.no_of_pan_feeding_lines+1
    //                         //  frm.set_value("no_of_nipple_drinking_lines",no_of_nipple_drinking_lines)
    //                 });
    //             }
    //         }
	   //});


}

//Pan Feeding System
function pfs(frm){
    let shed_lengthin_feet=frm.doc.shed_length
    frm.set_value("shed_lengthin_feet",shed_lengthin_feet)

    let sl =(frm.doc.shed_length - frm.doc.place_left_for_moving_10_feet);
    frm.set_value("system_length",sl);

    let shed_width_in_feet=frm.doc.shed_width
    frm.set_value("shed_width_in_feet",shed_width_in_feet)

    let no_of_pan_feeding_lines_pfs=frm.doc.no_of_pan_feeding_lines
    frm.set_value("no_of_pan_feeding_lines_pfs",no_of_pan_feeding_lines_pfs)

    let no_of_end_pan_sensor_in_1_shed=frm.doc.no_of_pan_feeding_lines
    frm.set_value("no_of_end_pan_sensor_in_1_shed",no_of_end_pan_sensor_in_1_shed)

    let tsfl = (frm.doc.system_length / frm.doc.total_space_divided_by_15);
   // let tsfl_trunk=Math.floor(tsfl*100)/100
    frm.set_value("total_section_for_1_line", tsfl);

    let sffl = (frm.doc.total_section_for_1_line * frm.doc.no_of_pan_feeding_lines);
    frm.set_value("section_for_feeding_line", sffl);

    //let value=Math.ceil(frm.doc.total_section_for_1_line);
    let value = frm.doc.total_section_for_1_line * frm.doc.per_pipe_carry_6_feeding_pan;
    let tfpl = Math.ceil(value * 100) / 100;
    frm.set_value("total_feeding_pan_fr_1_line", tfpl);

    let total_feeding_pan_per_shed =frm.doc.total_feeding_pan_fr_1_line*frm.doc.no_of_pan_feeding_lines_pfs+frm.doc.no_of_end_pan_sensor_in_1_shed
    frm.set_value("total_feeding_pan_per_shed",total_feeding_pan_per_shed)

    //let total_birds_per_shed_open_house=(frm.doc.shed_length*frm.doc.shed_width)/frm.doc.density_ec
    //frm.set_value("total_birds_per_shed_open_house",total_birds_per_shed_open_house)

    let total_number_of_birds_per_pan=flt(frm.doc.total_birds_per_shed)/flt(frm.doc.total_feeding_pan_per_shed)
    let value2=Math.ceil(total_number_of_birds_per_pan )
    frm.set_value("total_number_of_birds_per_pan",value2)

    //     	frappe.call({
    //         method: "frappe.client.get",
    //         args: {
    //             doctype: "Pan Feeding and Nipple Drinking Price Rule",
    //             name: "Pan_Feeding"
    //         },
    //         callback: function(r) {

    //             if (r.message) {

    //                 let rows = r.message.table_odsv;


    //                 rows.forEach(function(row){

    //                         if(frm.doc.shed_lengthin_feet>=row.shed_length_start && frm.doc.shed_lengthin_feet<=row.shed_length_end){
    //                         frm.set_value("rate_per_feet_pfs",row.cost_per_row);

    //                         let total_cost_of_pan_feeding_system_pfs = frm.doc.rate_per_feet_pfs * frm.doc.shed_lengthin_feet * frm.doc.no_of_pan_feeding_lines_pfs;
    //                         frm.set_value("total_cost_of_pan_feeding_system_pfs",total_cost_of_pan_feeding_system_pfs)
    //                         }

    //                          let no_of_nipple_drinking_lines=frm.doc.no_of_pan_feeding_lines+1
    //                          frm.set_value("no_of_nipple_drinking_lines",no_of_nipple_drinking_lines)
    //                 });
    //             }
    //         }
	   //});


}

frappe.ui.form.on('Broiler EC House', {
    validate(frm) {
        // Return the promise so Frappe waits for it to complete before saving
        return calculate_values(frm);
    },
    side_height: calculate_values,
    centre_height: calculate_values,
    shed_lenght: calculate_values,
    shed_widthq: calculate_values,
});

// ─── Helper: next even number ───
function next_even(total_pads) {
    if (Number.isInteger(total_pads) && total_pads % 2 == 0) {
        return total_pads;
    } else {
        let val = Math.ceil(total_pads);
        if (val % 2 !== 0) {
            val += 1;
            return val;
        } else {
            return val;
        }
    }
}

// ─── Helper: safe float parse ───
function flt(v) {
    return parseFloat(v) || 0;
}

// ─── Helper: currency conversion ───
function convert_currency(value, frm) {
    if (frm.doc.display_currency && frm.doc.display_currency !== "INR") {
        let exchange_rate = flt(frm.doc.exchange_rate) || 1;
        return value / exchange_rate;
    }
    return value;
}

// ─── Helper: fetch active Broiler EC House Pricing Rule (Optimized - fetched ONCE) ───
function get_active_pricing_rule() {
    return frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Broiler EC House Pricing Rule",
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
                doctype: "Broiler EC House Pricing Rule",
                name: res.message[0].name,
            },
        }).then((r) => r ? r.message : null);
    });
}

// ─── Helper: fetch Item Price (Standard Selling) ───
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
    }).then((r) => (r && r.message) ? r.message : null);
}

// ═══════════════════════════════════════════════
//  Main calculation function
// ═══════════════════════════════════════════════
async function calculate_values(frm) {

    // ── Shed dimensions ──
    let shed_lenght = flt(frm.doc.shed_length);
    frm.set_value("shed_lenght", shed_lenght);

    let shed_widthq = flt(frm.doc.shed_width);
    frm.set_value("shed_widthq", shed_widthq);

    let shed_width = flt(frm.doc.shed_width);

    // ── Average height ──
    let side_height = flt(frm.doc.side_height);
    let centre_height = flt(frm.doc.centre_height);
    let average_height = (side_height + centre_height) / 2;
    frm.set_value("average_height", average_height);

    // ── Pump type based on gutter system ──
    if (frm.doc.gutter_system_type == "Aluminium") {
        frm.set_value("pump_type", "Submersible pump");
    } else if (frm.doc.gutter_system_type == "PVC") {
        frm.set_value("pump_type", "Centrifugal pump");
    }

    // ── Volume ──
    let total_area_in_cu_ft = shed_lenght * shed_width * average_height;
    frm.set_value("total_area_in_cu_ft", total_area_in_cu_ft);

    // ── Fetch the pricing rule doc ONCE ──
    let doc = await get_active_pricing_rule();

    // ── Fan capacity (CFM) from Pricing Rule ──
    let fan_capacity_cfm = flt(frm.doc.fan_capacity_cfm);

    if (doc) {
        let rows = doc.table_iutn || [];
        rows.forEach(function (row) {
            if (frm.doc.fan_type == row.fan_type) {
                fan_capacity_cfm = flt(row.fan_capacity_cfm);
            }
        });
    }
    frm.set_value("fan_capacity_cfm", fan_capacity_cfm);

    // ── Tunnel fans ──
    let no_of_fan = fan_capacity_cfm ? (total_area_in_cu_ft / fan_capacity_cfm) : 0;
    frm.set_value("no_of_fan", no_of_fan);

    let tunnel_fan_count = Math.round(no_of_fan);
    frm.set_value("tunnel_fan_count", tunnel_fan_count);

    // ── Cooling pads ──
    let total_pads = tunnel_fan_count * 6;
    frm.set_value("total_pads", total_pads);

    let cooling_pad_count = next_even(total_pads);
    frm.set_value("cooling_pad_count", cooling_pad_count);

    // ── Side fans (VSF) ──
    let fan_capacity_cmh_vsf = flt(frm.doc.fan_capacity_cmh_vsf);
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
    let fan_capacity_cmh_vai = flt(frm.doc.fan_capacity_cmh_vai);
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

    // ── Initialize Pricing Variables ──
    let humidity_sensor = frm.doc.humidity_sensor;
    let temperature_sensor = frm.doc.temperature_sensor;
    let relay = frm.doc.relay;
    let electronic_contoller_price = flt(frm.doc.electronic_contoller_price);

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

    if (doc) {
        // Electronic Controller
        let rows_ec = doc.lectronic_controller_ec || [];
        rows_ec.forEach(function (row) {
            if (frm.doc.eletronic_cotroller_type == row.electronic_controller_type) {
                humidity_sensor = row.humidity_sensor;
                temperature_sensor = row.temperature_sensor;
                relay = row.relay;
                electronic_contoller_price = convert_currency(row.price, frm);
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
    }

    // ── Apply controller / pump values ──
    frm.set_value("humidity_sensor", humidity_sensor);
    frm.set_value("temperature_sensor", temperature_sensor);
    frm.set_value("relay", relay);
    frm.set_value("electronic_contoller_price", electronic_contoller_price);
    frm.set_value("pump_hp", pump_hp);
    frm.set_value("pump_quantity", pump_quantity);

    // ── Filter & TDL motor ──
    let filter = pump_quantity;
    frm.set_value("filter", filter);

    let tdl_motor = filter;
    frm.set_value("tdl_motor", tdl_motor);

    // ── Fan Price (Item Price) ──
    let fan_50_price = 0;
    if (frm.doc.fan_type) {
        let price_row = await get_item_price(frm.doc.fan_type);
        if (price_row) {
            fan_50_price = convert_currency(price_row.price_list_rate * tunnel_fan_count, frm);
        } else {
            fan_50_price = 0;
            frappe.msgprint("No price found for selected fan item");
        }
    }
    frm.set_value("fan_50_price", fan_50_price);

    // ── Cooling Pad Price (Item Price) ──
    let cooling_pad_price = 0;
    if (frm.doc.cooling_pad_type) {
        let price_row = await get_item_price(frm.doc.cooling_pad_type);
        if (price_row) {
            cooling_pad_price = convert_currency(price_row.price_list_rate * cooling_pad_count, frm);
        } else {
            cooling_pad_price = 0;
            frappe.msgprint("No price found for selected cooling pad item");
        }
    }
    frm.set_value("cooling_pad_price", cooling_pad_price);

    // ── EC System pricing ──
    if (doc) {
        // UPS Alarm
        ups_alarm_price = convert_currency(flt(frm.doc.alarm_system) * (doc.ups_alarm || 3500), frm);

        // Installation
        installation_price = convert_currency(1 * (doc.installation || 31000), frm);

        // TDL
        if (frm.doc.tdl_check == 1) {
            let tdl_price_price = 12 * cooling_pad_count * (doc.tdl);
            tdl_price = convert_currency(tdl_price_price || 222000, frm);

            tdl_winch_motorised_price = convert_currency(filter * (doc.tdl_winch || 75000), frm);
        } else {
            tdl_price = 0;
            tdl_winch_motorised_price = 0;
        }

        // Air Inlet
        if (frm.doc.air_inlet == 1) {
            air_inlet_price = convert_currency(air__inlet_count * (doc.air_inlet || 4000), frm);
            air_inlet_winch_motorised_price = convert_currency(2 * (doc.air_inlet_winch || 50000), frm);
        } else {
            air_inlet_price = 0;
            air_inlet_winch_motorised_price = 0;
        }

        // Misc
        misc_price = convert_currency(1 * (doc.misc), frm);

        // GI Gutter System
        if (frm.doc.gutter_system == "1") {
            gi_gutter_system_price = convert_currency((cooling_pad_count * 2) * (doc.gi_gutter_system || 1200), frm);
        } else {
            gi_gutter_system_price = 0;
        }

        // 36" Fan
        if (frm.doc.minimum_ventilation_fan == 1) {
            thirtysix_fan_price = convert_currency(side_fan_count * (doc.thirtysix_fan_price || 29000), frm);
        } else {
            thirtysix_fan_price = 0;
        }

        // Filter
        filter_price = convert_currency(filter * (doc.filter || 2000), frm);

        // Plumbing Material
        let cooling_pad = cooling_pad_count;
        let rows_pl = doc.plumbing_syatem || [];
        rows_pl.forEach(function (row) {
            if (cooling_pad >= row.cooling_pad_from && cooling_pad <= row.cooling_pad_to) {
                plumbing_material_price = convert_currency(row.rate, frm);
            }
        });

        // Pump pricing
        let rows_pp = doc.pump_pricing || [];
        let found_pp = false;
        rows_pp.forEach(function (row) {
            if (pump_hp == row.pump_hp && frm.doc.electric_cuurent_phase == row.pump_phase) {
                pump_price = convert_currency(row.price * pump_quantity, frm);
                found_pp = true;
            }
        });
        if (!found_pp) {
            pump_price = 0;
        }

        // Control Panel
        let fans = tunnel_fan_count;
        let rows_cp = doc.control_panel_price || [];
        rows_cp.forEach(function (row) {
            if (fans == row.fan_count) {
                control_panel_price = convert_currency(row.rate, frm);
            }
        });
    }

    // ── Apply values to form ──
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
        fan_50_price +
        cooling_pad_price +
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

// function cws(frm){
//     let shed_length_cws=frm.doc.shed_length
//     frm.set_value("shed_length_cws",shed_length_cws)

//     let side_height_cws=frm.doc.side_height
//     frm.set_value("side_height_cws",side_height_cws)

//     let cooling_pad_count_cws=frm.doc.cooling_pad_count
//     frm.set_value("cooling_pad_count_cws",cooling_pad_count_cws)


//     let options = [];

//     if (frm.doc.type=="Only Curtain"){
//         options = ["120","150","200","250","300"]
//     }else if(frm.doc.type=="Curtain With Winching"){
//         options = ["200","250","300"]
//     }

//     frm.set_df_property("gsm", "options", options.join("\n"));

//         let doc_name="";
//         if(frm.doc.type == "Only Curtain" && frm.doc.curtain_type == "HDPE"){
//             doc_name="Only Curtain HDPE"
//         }else if(frm.doc.type == "Only Curtain" && frm.doc.curtain_type == "PE"){
//             doc_name="Only Curtain PE"
//         }else if(frm.doc.type == "Curtain With Winching" && frm.doc.curtain_type == "HDPE"){
//             doc_name="Curtain Winching HDPE"
//         }else if(frm.doc.type == "Curtain With Winching" && frm.doc.curtain_type == "PE"){
//             doc_name="Curtain Winching PE"
//         }

//         	frappe.call({
//             method: "frappe.client.get",
//             args: {
//                 doctype: "Curtain Winching System Rule",

//                  name: doc_name,

//                             },
//             callback: function(r) {

//                 if (r.message) {

//                     let rows = r.message.table_nclp;

//                     rows.forEach(function(row){

//                         if(frm.doc.gsm == row.gsm){

//                             frm.set_value("rate_curtain_winching",row.rate)
//                             frm.set_value("rate_ech",row.rate)
//                             frm.set_value("rate_c",row.rate)
//                             frm.set_value("rate_cc",row.rate)
//                         }
//                     });
//                 }
//             }
// 	   });

// 	let curtain_winching=frm.doc.shed_length_cws*frm.doc.side_height_cws*2*frm.doc.rate_curtain_winching;
//     frm.set_value("curtain_winching",curtain_winching)

//     let shed_length_ech=frm.doc.shed_length_cws-frm.doc.cooling_pad_count_cws-frm.doc.space_left_10_ft
//     frm.set_value("shed_length_ech",shed_length_ech)

//     let side_height_ech=frm.doc.side_height
//     frm.set_value("side_height_ech",side_height_ech)

//     let curtain_winching_ech=frm.doc.shed_length_ech*frm.doc.side_height_ech*2*frm.doc.rate_ech
//     frm.set_value("curtain_winching_ech",curtain_winching_ech)

//     let shed_length_c=frm.doc.shed_length_cws-frm.doc.cooling_pad_count_cws-frm.doc.space_left_20_ft
//     frm.set_value("shed_length_c",shed_length_c)

//     let side_height_c=frm.doc.side_height
//     frm.set_value("side_height_c",side_height_c)

//     let curtain_winching_c=frm.doc.shed_length_c*frm.doc.side_height_c*2*frm.doc.rate_c
//     frm.set_value("curtain_winching_c",curtain_winching_c)

//     let shed_length_cc=frm.doc.shed_length_cws+10
//     frm.set_value("shed_length_cc",shed_length_cc)

//     let side_height_cc=frm.doc.side_height+5
//     frm.set_value("side_height_cc",side_height_cc)

//     let curtain_winching_cc=frm.doc.shed_length_cc*frm.doc.side_height_cc*1*frm.doc.rate_cc
//     curtain_winching_cc=Math.round(curtain_winching_cc)
//     frm.set_value("curtain_winching_cc",curtain_winching_cc)

//     let cooling_pad_no=frm.doc.cooling_pad_count
//     frm.set_value("cooling_pad_no",cooling_pad_no)

//     let curtain_winching_cpc=frm.doc.cooling_pad_no*frm.doc.height_of_cp*2*22
//     frm.set_value("curtain_winching_cpc",curtain_winching_cpc)

//     let shed_size_wc=frm.doc.shed_length_cws- frm.doc.cooling_pad_count_cws
//     frm.set_value("shed_size_wc",shed_size_wc)

//     let curtain_winching_wc=frm.doc.shed_size_wc*frm.doc.height_of_wc*2*7
//     frm.set_value("curtain_winching_wc",curtain_winching_wc)

//     let doc_name2 =""

//     if(frm.doc.curtain_type == "HDPE"){
//         doc_name2="Curtain Below Platform HDPE"
//     }else if(frm.doc.curtain_type == "PE"){
//         doc_name2="Curtain Below Platform PE"
//     }

//     	frappe.call({
//             method: "frappe.client.get",
//             args: {
//                 doctype: "Curtain Winching System Rule",

//                  name: doc_name2,

//                             },
//             callback: function(r) {

//                 if (r.message) {

//                     let rows = r.message.table_nclp;

//                     rows.forEach(function(row){

//                         if(frm.doc.gsm == row.gsm){

//                             frm.set_value("rate_cbp",row.rate)


//                         }
//                     });
//                 }
//             }
// 	   });

//     let curtain_below_platform_rates = frm.doc.shed_length_cws * frm.doc.side_height_cws *2*frm.doc.rate_cbp;
//     frm.set_value("curtain_below_platform_rates",curtain_below_platform_rates)
// }


frappe.ui.form.on('Broiler EC House', {

    silo: function(frm) {

        if (frm.doc.silo) {
            frm.set_value("fill_system", frm.doc.silo);
        }

    }

});
frappe.ui.form.on('Broiler EC House', {

    fill_system_for_1_ton_hopper: function(frm) {

        if (frm.doc.fill_system_for_1_ton_hopper) {
            frm.set_value("one_ton_hopper_with_boot", frm.doc.fill_system_for_1_ton_hopper);
        }

    }

});

frappe.ui.form.on('Broiler EC House', {

    // silo_capacity_ton: function(frm) {
    //     set_silo_price(frm);
    // },

    validate: function(frm) {
        set_silo_price(frm);
    }

});

// function set_silo_price(frm) {

//     let price_map = {
//         "2.5 Ton":200000,
//         "5 Ton" : 268825,
//         "10 Ton": 316550,
//         "12 Ton": 334285,
//         "14 Ton": 389877,
//         "20 Ton": 490500,
//         "30 Ton": 631350
//     };

//     let capacity = frm.doc.silo_capacity_ton || "";

//     if (price_map[capacity]) {
//         frm.set_value("silo_rate", price_map[capacity]);
//         frm.set_value("silo_amount", price_map[capacity]);
//     } else {
//         frm.set_value("silo_rate", 0);
//         frm.set_value("silo_amount", 0);
//     }
// }


async function set_silo_price(frm) {

    let capacity = frm.doc.silo_capacity_ton || "";
    let date = frm.doc.date || frappe.datetime.get_today();

    //console.log("Selected Capacity:", capacity);

    if (!capacity) {
        frm.set_value("silo_rate", 0);
        frm.set_value("silo_amount", 0);
        return;
    }

    try {
        let res = await frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Broiler EC House Pricing Rule",
                filters: [
                    ["valid_from", "<=", date],
                    ["valid_to", ">=", date]
                ],
                fields: ["name"],
                limit_page_length: 1
            }
        });

        //console.log("Pricing Rule:", res.message);

        if (!res.message || !res.message.length) {
            frappe.msgprint("No Pricing Rule found");
            return;
        }

        let doc = await frappe.db.get_doc(
            "Broiler EC House Pricing Rule",
            res.message[0].name
        );

        let table = doc.silo_price_logic_table || [];
        //console.log("Silo Table:", table);

        let row = table.find(r => r.silo_capactity == capacity);

        //console.log("Matched Row:", row);

        let price = row ? row.price : 0;

        let silo_price = price;

if (frm.doc.display_currency && frm.doc.display_currency !== "INR") {
    let exchange_rate = flt(frm.doc.exchange_rate) || 1;
    silo_price = silo_price / exchange_rate;
}

frm.set_value("silo_rate", silo_price);
frm.set_value("silo_amount", silo_price);

        // if (!row) {
        //     frappe.msgprint("No Silo price found for selected capacity");
        // }

    } catch (err) {
       // console.error("Error:", err);
        frappe.msgprint("Error fetching silo price");
    }
}



frappe.ui.form.on('Broiler EC House', {

    rows: function(frm) {

        if (frm.doc.no_of_pan_feeding_lines) {
            frm.set_value("no_of_rows", frm.doc.no_of_pan_feeding_lines);
            frm.set_value("no_of_rows_fill", frm.doc.no_of_pan_feeding_lines);
        }

    },
    validate: function(frm) {

        if (frm.doc.no_of_pan_feeding_lines) {
            frm.set_value("no_of_rows", frm.doc.no_of_pan_feeding_lines);
            frm.set_value("no_of_rows_fill", frm.doc.no_of_pan_feeding_lines);
        }

    }

});


frappe.ui.form.on('Broiler EC House', {

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

   let fill_rate = rate;

if (frm.doc.display_currency && frm.doc.display_currency !== "INR") {
    let exchange_rate = flt(frm.doc.exchange_rate) || 1;
    fill_rate = fill_rate / exchange_rate;
}

frm.set_value("rate_per_running_feet", fill_rate);
frm.set_value("fill_system_amount", fill_rate);
}



frappe.ui.form.on('Broiler EC House', {
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
    },
    // refresh: function(frm) {
    //     calculate_total_silo_cost(frm);
    // }
});

function calculate_total_silo_cost(frm) {
    var silo_amount = flt(frm.doc.silo_amount);
    var fill_system_amount = flt(frm.doc.fill_system_amount);
    var loader_amount = flt(frm.doc.loader_amount);
    var weighing_system_cost = flt(frm.doc.weighing_system_cost);

    var total = silo_amount + fill_system_amount;

    if(frm.doc.loader == "1"){
        total = total + loader_amount;
    }

    if (frm.doc.silo_w_system) {
        total = total + weighing_system_cost;
    }

    frm.set_value("total_silo_cost", total);
}


frappe.ui.form.on('Broiler EC House', {

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

   let fill_rate = rate;

if (frm.doc.display_currency && frm.doc.display_currency !== "INR") {
    let exchange_rate = flt(frm.doc.exchange_rate) || 1;
    fill_rate = fill_rate / exchange_rate;
}

frm.set_value("rate_per_running_feet_fill", fill_rate);
frm.set_value("fill_system_amounts", fill_rate);
}


frappe.ui.form.on('Broiler EC House', {

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

    let total = fill_system_amounts + hopper_amount;

    frm.set_value("total_1_ton_hopper_with_fill_system", total);
}


frappe.ui.form.on('Broiler EC House', {

    total_birds: function(frm) {
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
        let birds = frm.doc.total_birds_per_shed || 1;
        frm.set_value("bird_capacity",birds)

        let days = frm.doc.days || 1;
        let feed_capacity = frm.doc.feed_capacity || 1;

        let total_feed_for_40_days = birds * frm.doc.body_weight_at_40_days * frm.doc.feed_conversion_ratio ;
        frm.set_value("total_feed_for_40_days", total_feed_for_40_days)

        feed_capacity = total_feed_for_40_days / 40;
        frm.set_value("feed_capacity",feed_capacity)

        let result = days * feed_capacity;
            result= result/1000;
            frm.set_value('silo__capacity_estimated', result);
    }
});

// ==== Curtain Winching System ====
frappe.ui.form.on('Broiler EC House', {
    validate: function(frm) {
        cws(frm);
    }
});

function cws(frm) {

    // --- Sync: copy fields ---
    frm.set_value("shed_length_cws", frm.doc.shed_length);
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
    let shed_length_cws = frm.doc.shed_length;
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
        doctype: "Broiler EC House Pricing Rule",
        filters: [
            ["valid_from", "<=", frappe.datetime.get_today()],
            ["valid_to", ">=", frappe.datetime.get_today()]
        ],
        fields: ["name", "cooling_pad_curtain_price"],
        limit_page_length: 1
    }
}).then(res => {
    if (!res.message.length) return;
    let rate_cpc = res.message[0].cooling_pad_curtain_price;

if (frm.doc.display_currency && frm.doc.display_currency !== "INR") {
    let exchange_rate = flt(frm.doc.exchange_rate) || 1;
    rate_cpc = rate_cpc / exchange_rate;
}

frm.set_value("rate_cpc", rate_cpc);
    //frm.set_value("curtain_winching_cpc",)
});


     let curtain_winching_cpc = frm.doc.cooling_pad_count * frm.doc.height_of_cp * 2 * frm.doc.rate_cpc;
     if (frm.doc.display_currency && frm.doc.display_currency !== "INR") {
    let exchange_rate = flt(frm.doc.exchange_rate) || 1;
    curtain_winching_cpc = curtain_winching_cpc / exchange_rate;
}

frm.set_value("curtain_winching_cpc", curtain_winching_cpc);

    frappe.call({
    method: "frappe.client.get_list",
    args: {
        doctype: "Broiler EC House Pricing Rule",
        filters: [
            ["valid_from", "<=", frappe.datetime.get_today()],
            ["valid_to", ">=", frappe.datetime.get_today()]
        ],
        fields: ["name", "white_curtain_price"],
        limit_page_length: 1
    }
}).then(res => {
    if (!res.message.length) return;
   let rate_wc = res.message[0].white_curtain_price;

if (frm.doc.display_currency && frm.doc.display_currency !== "INR") {
    let exchange_rate = flt(frm.doc.exchange_rate) || 1;
    rate_wc = rate_wc / exchange_rate;
}

frm.set_value("rate_wc", rate_wc);
    //frm.set_value("curtain_winching_cpc",)
});

    let shed_size_wc = shed_length_cws - cooling_pad_count_cws;
    frm.set_value("shed_size_wc", shed_size_wc);

    let curtain_winching_wc = shed_size_wc * frm.doc.height_of_wc * 2 * frm.doc.rate_wc;
    if (frm.doc.display_currency && frm.doc.display_currency !== "INR") {
    let exchange_rate = flt(frm.doc.exchange_rate) || 1;
    curtain_winching_wc = curtain_winching_wc / exchange_rate;
}

frm.set_value("curtain_winching_wc", curtain_winching_wc);

    let shed_length_cbp = frm.doc.shed_length
    frm.set_value("shed_length_cbp" , shed_length_cbp)

    let shed_width_cpc = frm.doc.side_height
    frm.set_value("shed_width_cpc" , shed_width_cpc)

    // --- Single async fetch ---
    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Broiler EC House Pricing Rule",
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
                doctype: "Broiler EC House Pricing Rule",
                name: parent_name
            }
        }).then(r => {
            let doc = r.message;

            // --- Rows from doc_name (curtain/winching rates) ---
            let rows1 = doc[doc_name] || [];
            rows1.forEach(function(row) {
                if (frm.doc.gsm == row.gsm) {
                    let rate = row.rate;

if (frm.doc.display_currency && frm.doc.display_currency !== "INR") {
    let exchange_rate = flt(frm.doc.exchange_rate) || 1;
    rate = rate / exchange_rate;
}

frm.set_value("rate_curtain_winching", rate);
frm.set_value("rate_ech", rate);
frm.set_value("rate_c", rate);

                    let curtain_winching = shed_length_cws * side_height_cws * 2 * row.rate;
                    frm.set_value("curtain_winching", curtain_winching);

let curtain_winching_ech = shed_length_ech * frm.doc.side_height * 2 * row.rate;

if (frm.doc.display_currency && frm.doc.display_currency !== "INR") {
    let exchange_rate = flt(frm.doc.exchange_rate) || 1;
    curtain_winching_ech = curtain_winching_ech / exchange_rate;
}

frm.set_value("curtain_winching_ech", curtain_winching_ech);

                   let curtain_winching_c = shed_length_c * frm.doc.side_height * 2 * row.rate;

if (frm.doc.display_currency && frm.doc.display_currency !== "INR") {
    let exchange_rate = flt(frm.doc.exchange_rate) || 1;
    curtain_winching_c = curtain_winching_c / exchange_rate;
}

frm.set_value("curtain_winching_c", curtain_winching_c);
                }
            });

            // --- Rows from doc_name_cc (always only_curtain table for ceiling curtain) ---
            let rows_cc = doc[doc_name_cc] || [];
            rows_cc.forEach(function(row) {
                if (frm.doc.gsm_cp_cc == row.gsm) {
                    let rate_cc = row.rate;

if (frm.doc.display_currency && frm.doc.display_currency !== "INR") {
    let exchange_rate = flt(frm.doc.exchange_rate) || 1;
    rate_cc = rate_cc / exchange_rate;
}

frm.set_value("rate_cc", rate_cc);

                    let curtain_winching_cc = shed_length_cc * side_height_cc * 1 * row.rate;
                    if (frm.doc.display_currency && frm.doc.display_currency !== "INR") {
    let exchange_rate = flt(frm.doc.exchange_rate) || 1;
    curtain_winching_cc = curtain_winching_cc / exchange_rate;
}

curtain_winching_cc = Math.round(curtain_winching_cc);
frm.set_value("curtain_winching_cc", curtain_winching_cc);
                }
            });

            // --- Rows from doc_name2 (curtain below platform rates) ---
            let rows2 = doc[doc_name2] || [];
            rows2.forEach(function(row) {
                if (frm.doc.gsm == row.gsm) {
                    let rate_cbp = row.rate;

if (frm.doc.display_currency && frm.doc.display_currency !== "INR") {
    let exchange_rate = flt(frm.doc.exchange_rate) || 1;
    rate_cbp = rate_cbp / exchange_rate;
}

frm.set_value("rate_cbp", rate_cbp);

                    let curtain_below_platform_rates = shed_length_cws * side_height_cws * 2 * row.rate;
                    if (frm.doc.display_currency && frm.doc.display_currency !== "INR") {
    let exchange_rate = flt(frm.doc.exchange_rate) || 1;
    curtain_below_platform_rates = curtain_below_platform_rates / exchange_rate;
}

frm.set_value("curtain_below_platform_rates", curtain_below_platform_rates);
                }
            });
        });
    });
}
