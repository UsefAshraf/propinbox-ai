// Static, hand-written seed content: buildings, knowledge-base articles and
// conversation scripts. Generated data (names, phones, units) lives in seed.ts.
// All content is fictional.

export type BuildingSeed = {
  name: string;
  street: string;
  postalCode: string;
  city: string;
  yearBuilt: number;
  floors: number; // number of upper floors above EG (two units per floor: links / rechts)
};

// 8 buildings x (floors + 1) x 2 units = 60 units.
export const BUILDINGS: BuildingSeed[] = [
  { name: "Lindenhof", street: "Lindenstraße 14", postalCode: "10969", city: "Berlin", yearBuilt: 1928, floors: 3 },
  { name: "Am Stadtpark", street: "Parkallee 7", postalCode: "20144", city: "Hamburg", yearBuilt: 1962, floors: 4 },
  { name: "Schillerhaus", street: "Schillerstraße 31", postalCode: "80336", city: "München", yearBuilt: 1995, floors: 2 },
  { name: "Rheinblick", street: "Rheinuferstraße 22", postalCode: "50668", city: "Köln", yearBuilt: 1974, floors: 3 },
  { name: "Mainterrassen", street: "Schweizer Straße 58", postalCode: "60594", city: "Frankfurt am Main", yearBuilt: 2008, floors: 2 },
  { name: "Gartenstadt", street: "Birkenweg 3", postalCode: "04277", city: "Leipzig", yearBuilt: 1911, floors: 3 },
  { name: "Neckarhöfe", street: "Neckarstraße 120", postalCode: "70190", city: "Stuttgart", yearBuilt: 1983, floors: 3 },
  { name: "Elbquartier", street: "Königsbrücker Straße 45", postalCode: "01099", city: "Dresden", yearBuilt: 2016, floors: 3 },
];

export type KbSeed = {
  title: string;
  category: "house_rules" | "faq" | "procedures";
  body: string;
  buildingIndex?: number; // index into BUILDINGS; unset = global
};

export const KNOWLEDGE_BASE: KbSeed[] = [
  // ---------------------------------------------------------------- house rules
  {
    title: "Quiet hours and Sunday rest",
    category: "house_rules",
    body: `Quiet hours apply in all of our buildings every night from 22:00 to 06:00. During this time, please keep noise at room volume: no loud music, no drilling or hammering, no running washing machines or dryers, and please close doors quietly in the stairwell. In addition, the midday rest from 13:00 to 15:00 should be respected where possible.

Sundays and public holidays are rest days all day long (Sonntagsruhe). Noisy work such as drilling, sawing, vacuuming balconies with a leaf blower or mowing the lawn is not permitted. Small, quiet household activities are of course fine.

Parties are possible but should be announced to your neighbours in advance with a note in the stairwell, and the quiet hours still apply from 22:00. Musical instruments may be played for up to two hours per day outside the quiet hours.

If you are repeatedly disturbed by noise, please first speak to your neighbour in a friendly way. If that does not help, keep a short noise log (date, time, type of noise) and send it to the property management by email so we can follow up in writing.`,
  },
  {
    title: "Rubbish separation and collection days",
    category: "house_rules",
    body: `Please separate your waste correctly. Every building has the following bins in the bin area by the courtyard:

- Black bin (Restmüll): general household waste that cannot be recycled, e.g. vacuum cleaner bags, hygiene products, cold ash.
- Yellow bin / yellow bag (Gelber Sack): packaging made of plastic, metal and composite materials such as tins, yoghurt pots, drinks cartons.
- Blue bin (Papier): paper and cardboard. Please flatten boxes before putting them in the bin.
- Brown bin (Bio): food scraps, coffee grounds, fruit and vegetable peel, garden waste. No plastic bags, including "compostable" ones.
- Glass is not collected at the building. Please use the public glass containers (white, green, brown) in the neighbourhood and observe their usage times (weekdays 07:00–20:00).

Collection days: black bin every Tuesday, brown bin every Thursday, yellow bin and paper bin every second Friday. The exact dates may differ by building and around public holidays; the current calendar of the city waste service hangs on the notice board in the entrance hall.

Bulky waste (Sperrmüll) such as furniture or mattresses must not be left in the courtyard or basement. Please book a bulky-waste collection with the city yourself. Costs for removing improperly disposed items will be passed on to the person responsible or, if unknown, to all tenants via the service charges.`,
  },
  {
    title: "Bicycle and stroller storage",
    category: "house_rules",
    body: `Bicycles must be stored in the bicycle room in the basement or in the bike racks in the courtyard. Bicycles may not be parked in the stairwell, the entrance hall or in front of the letterboxes, because these areas are escape routes and must be kept clear for fire-safety reasons.

Strollers (prams) and walking frames may be parked in the entrance hall in the marked area under the stairs, as long as they do not block the way or the letterboxes. Please do not leave toys, shoes, shoe racks or other items in the stairwell.

E-bikes and e-scooters may be stored in the bicycle room, but batteries must not be charged in the basement or in shared rooms. Please charge batteries inside your own apartment and never leave them charging unattended overnight.

Once a year, usually in spring, we label and remove abandoned bicycles. Bicycles that are clearly no longer used receive a red tag; if the tag is not removed within four weeks, the bicycle will be taken away. Please make sure your bike has the building's sticker or a label with your name and unit.`,
  },
  {
    title: "Balconies and grilling",
    category: "house_rules",
    body: `Grilling on balconies and terraces is only allowed with electric grills. Charcoal grills and gas grills are not permitted on balconies because of smoke nuisance and fire risk. In buildings with a shared garden, charcoal grilling is allowed in the designated grill area in the courtyard until 22:00, provided the embers are fully extinguished afterwards.

Please be considerate of your neighbours when grilling: avoid heavy smoke and strong smells drifting into other apartments, and keep the noise down after 22:00.

Flower boxes must be attached to the inside of the balcony railing so they cannot fall. When watering plants, make sure water does not drip onto the balconies or windows below. Feeding pigeons on balconies or windowsills is not allowed.

Satellite dishes, awnings, privacy screens or any permanent structures on the balcony require prior written approval of the property management, because they change the façade of the building. Washing may be dried on the balcony as long as it is below the height of the railing.`,
  },
  {
    title: "Pets policy",
    category: "house_rules",
    body: `Small animals that are kept in cages or tanks, such as hamsters, guinea pigs, budgies, fish or turtles, may be kept without asking permission, as long as the number is normal for a household and they do not disturb other tenants.

Dogs and cats require the prior written consent of the property management. Please send us a short request by email with the type of animal, breed and size. Consent is usually granted but can be refused or withdrawn if the animal causes repeated disturbances, damage or hygiene problems, or if it is a dog breed classified as dangerous under the state law.

Dogs must be kept on a lead in the stairwell, courtyard and shared garden. Dog owners are responsible for removing dog waste immediately. Cats should not be allowed to roam in the stairwell or basement.

Exotic or dangerous animals (e.g. venomous snakes, large reptiles) are not allowed. Tenants are liable for any damage caused by their animals, so we strongly recommend pet liability insurance (Tierhalterhaftpflicht) for dog owners.`,
  },
  {
    title: "Smoking in the building",
    category: "house_rules",
    body: `Smoking, including e-cigarettes and vaporisers, is not permitted in any shared areas of the building. This includes the stairwell, entrance hall, lift, basement, laundry room, bicycle room, attic and underground car park.

Smoking inside your own apartment is generally allowed. However, please ventilate in a way that smoke does not enter the stairwell, for example by opening a window rather than the apartment door. Heavy smoking can cause yellowing of walls, ceilings and doors; when you move out, you may be required to repaint or pay for additional renovation if the discolouration goes beyond normal wear and tear.

On balconies and terraces, smoking is permitted, but please be considerate of neighbours above you and next to you, especially in summer when windows are open. Cigarette butts must never be thrown off the balcony or left in flower boxes, the courtyard or in front of the entrance. Please use an ashtray and dispose of butts in the black bin once they are fully extinguished.`,
  },
  {
    title: "Laundry room rules and opening hours",
    category: "house_rules",
    body: `Buildings with a shared laundry room (Waschküche) in the basement may use it every day from 07:00 to 21:00, except on Sundays and public holidays. Washing machines and dryers must not be started after 20:00 so that the cycle finishes before the quiet hours begin at 22:00.

Where a booking list hangs at the laundry room door, please enter your name and unit for the time slot you want to use. Each household may book a maximum of two slots of three hours per week. Unused slots can be used by others if the booked tenant has not appeared within 30 minutes.

Please remove your laundry promptly after the cycle has finished, clean the lint filter of the dryer after every use and wipe the detergent drawer. Leave the room tidy and close the window when you leave in winter to avoid frost damage to the pipes.

Private washing machines in the basement may only be connected to the dedicated sockets with individual electricity meters. Defects of shared machines should be reported to the property management with a short description of the problem.`,
  },

  // ---------------------------------------------------------------- FAQ
  {
    title: "How do I pay my rent?",
    category: "faq",
    body: `Rent (Kaltmiete plus the monthly advance payment for service charges) is due in advance on the third working day of each month. The easiest way to pay is by SEPA direct debit (Lastschrift): send us the signed SEPA mandate form and we will collect the amount automatically each month. You can request the form by email or download it from the tenant portal.

Alternatively, you can set up a standing order (Dauerauftrag) with your bank. Please always use the reference shown in your rental contract, which contains your tenant number and unit, for example "MIETE 0423-1OGR". Without the correct reference, we cannot assign your payment automatically and it may be marked as late.

If your bank details change, please send us a new SEPA mandate at least two weeks before the next due date. If you are temporarily unable to pay the full rent, please contact us as early as possible; we can often agree on an instalment plan. Late payments can result in reminder fees and, in the case of repeated arrears of two months' rent, termination of the tenancy.`,
  },
  {
    title: "When will I receive the service charge statement (Nebenkostenabrechnung)?",
    category: "faq",
    body: `Every tenant receives an annual service charge statement (Nebenkostenabrechnung / Betriebskostenabrechnung) for the previous calendar year. By law, the statement must reach you within twelve months after the end of the billing period, so the statement for the year 2025 will be sent by 31 December 2026 at the latest. We usually send statements between June and September once all supplier invoices (heating, water, waste, insurance, caretaker) are available.

The statement compares the advance payments you made during the year with your share of the actual costs. If you paid too much, the credit is transferred to your account or offset against the next rent payment. If there is an additional payment (Nachzahlung), it is due 30 days after you receive the statement. We may also adjust your monthly advance payment based on the result.

Heating and hot water costs are split according to your measured consumption (at least 50–70 %) and the size of your apartment. Other costs are typically split by living area (sqm).

You have the right to inspect the original invoices. Please send us an email to arrange an appointment. Objections must be raised in writing within twelve months of receiving the statement.`,
  },
  {
    title: "What is the notice period for terminating my lease?",
    category: "faq",
    body: `For standard residential leases with an indefinite term, the statutory notice period for tenants is three months. The notice must be received by us at the latest on the third working day of a month for that month to count. Example: if your notice reaches us by 3 March, the tenancy ends on 31 May.

The notice must be given in writing (Schriftform) and signed by hand by all tenants named in the rental contract. Notice by email, WhatsApp, SMS or phone is not legally valid. Please send a signed letter by post or hand it in at our office; a scanned PDF can be sent in advance by email, but the original letter is what counts.

If your contract contains a temporary waiver of the right to terminate (Kündigungsverzicht), notice can only be given after this period has expired. If you want to leave earlier, you may suggest a suitable replacement tenant (Nachmieter); we will review the application, but we are not obliged to accept it.

After receiving your notice, we will confirm the end date in writing and contact you to arrange the pre-inspection and the final handover of the apartment.`,
  },
  {
    title: "Can I sublet my apartment or part of it?",
    category: "faq",
    body: `Subletting (Untervermietung) all or part of your apartment always requires the prior written consent of the property management. This also applies to short-term rentals through platforms such as Airbnb, which are generally not permitted in our buildings and may also be prohibited by city regulations on misuse of residential space.

If you want to sublet a room, for example because a partner moves in or you are going abroad for a limited time, please send us a request by email that includes: the name of the subtenant, the planned start and end date, which rooms will be sublet, and the reason for the subletting. We normally answer within two weeks. Consent can only be refused for important reasons, for example if the apartment would become overcrowded.

Please note that you remain fully responsible for the rent and for any damage caused by the subtenant. The subtenant must register at the address with the local registration office (Bürgeramt). In some cases a moderate rent surcharge may be agreed for subletting.

Subletting without consent is a breach of contract and can lead to a warning or termination of the lease.`,
  },
  {
    title: "Lost keys and key replacement costs",
    category: "faq",
    body: `If you lose a key, please inform the property management immediately by email or phone. Keys for our buildings are part of a security locking system (Schließanlage); a single key opens your apartment door, the front door, the basement and the letterbox.

Replacement keys can only be ordered by the property management through the authorised locksmith, using the security card for the locking system. You cannot have security keys copied at a normal key service. A replacement key usually takes 7–10 working days and costs between 35 and 60 euros per key, depending on the system. Letterbox keys cost around 15 euros.

If there is a risk of misuse, for example if your keys were stolen together with a document showing your address, it may be necessary to replace the lock cylinder of your apartment door or, in severe cases, parts of the locking system. These costs are charged to the tenant; many personal liability insurance policies cover the loss of keys, so please check your policy.

If you are locked out outside office hours, you can call a locksmith yourself. Please use a locksmith that charges transparent prices and ask for the price before the work starts. Our partner locksmith is listed in the emergency numbers article.`,
  },
  {
    title: "How do I report damage or a repair?",
    category: "faq",
    body: `Please report any damage or defect in your apartment or in the shared areas as soon as you notice it. As a tenant you are legally obliged to report defects promptly so that further damage can be avoided.

The quickest way is to send us a message by email or WhatsApp with:
- your name, building and unit (e.g. "Lindenhof, 2.OG links"),
- a short description of the problem and since when it exists,
- one or two photos, if possible,
- your phone number and times when a craftsman can access the apartment.

We will create a repair ticket, commission one of our partner companies and the craftsman will contact you directly to arrange an appointment. Normal repairs are usually scheduled within 3–10 working days.

Small repairs (Kleinreparaturen) such as replacing a tap washer or a light switch may be charged to the tenant up to the amount stated in your rental contract (typically up to 100 euros per repair and 8 % of the annual net rent per year).

For emergencies such as burst pipes, total heating failure in winter, a power outage in the whole building or a gas smell, do not wait for an email reply: please call the emergency numbers listed in the article "Emergency numbers".`,
  },
  {
    title: "Emergency numbers",
    category: "faq",
    body: `In a life-threatening situation, always call 112 (fire brigade and ambulance) or 110 (police) first.

For building emergencies outside our office hours (Monday to Thursday 08:00–17:00, Friday 08:00–14:00), please use the following numbers:

- Property management emergency line (24/7): +49 30 1234 5670
- Water damage / burst pipe: plumbing partner, 24/7 emergency service, reachable via the emergency line
- Heating failure: heating service partner, reachable via the emergency line
- Gas smell: leave the building immediately without using light switches or phones inside, then call the gas supplier's emergency number 0800 1234 567 (free of charge) and 112.
- Power outage affecting the whole street: contact the local grid operator; their number is on the notice board.
- Locked out: call a locksmith of your choice; ask for a fixed price before work starts.
- Lift emergency: press the alarm button in the lift cabin; it is connected to a 24/7 service centre.

What counts as an emergency: water leaking that cannot be stopped, no heating at all when outside temperatures are below 5 °C, no water or electricity in the whole apartment, a gas smell, a front door that cannot be locked after a break-in. Other issues should be reported during office hours by email or WhatsApp.`,
  },
  {
    title: "Can I renovate or make changes to my apartment?",
    category: "faq",
    body: `Minor cosmetic changes inside your apartment, such as painting walls in neutral colours, hanging pictures or putting up shelves, are allowed without asking for permission. Drill holes should be made in the joints of tiles rather than in the tiles themselves.

Structural changes or changes to installations require our prior written consent. This includes removing or adding walls, changing floor coverings permanently (e.g. glued parquet), replacing the kitchen or bathroom fittings, installing an air conditioner, changing electrical installations or connecting additional appliances to the gas supply. Please send a short description and, if available, a quote from a specialist company.

When you move out, you must generally return the apartment in its original condition unless we have agreed otherwise in writing. Walls painted in strong colours must be repainted in a light, neutral colour.

Installing a wallbox for an electric car in the underground car park or barrier-free conversions are generally approved, but must be carried out by a licensed specialist company and coordinated with us in advance.`,
  },

  // ---------------------------------------------------------------- procedures
  {
    title: "Emergency procedure: water leak or burst pipe",
    category: "procedures",
    body: `If water is leaking in your apartment, act quickly to limit the damage:

1. Shut off the water. Close the main stopcock of your apartment; it is usually located in the bathroom, kitchen or behind a small access panel near the water meters. For a leak at a single tap or the toilet, you can close the small angle valve under the sink or behind the toilet.
2. Switch off electricity in affected rooms at the fuse box if water is near sockets, lights or electrical appliances. Do not touch wet electrical devices.
3. Collect the water with buckets and towels and move furniture and valuables out of the wet area.
4. Inform the property management immediately via the 24/7 emergency line (+49 30 1234 5670). Outside office hours the call is forwarded to our plumbing partner.
5. Warn your neighbours below, as water may already be coming through their ceiling.
6. Take photos of the damage and the source of the leak for the insurance claim.

If the water is coming from the apartment above and nobody opens the door, call the emergency line; in urgent cases the fire brigade (112) may open the apartment.

Damage to the building is covered by the building insurance. Damage to your own furniture and belongings is only covered by your household contents insurance (Hausratversicherung).`,
  },
  {
    title: "Heating outage checklist",
    category: "procedures",
    body: `Before reporting a heating failure, please go through this short checklist. Many problems can be solved in a few minutes.

1. Check the thermostats. Turn all radiator thermostats to level 3–5. Thermostatic valves can stick after the summer; turn them fully open and closed a few times.
2. Bleed the radiators. If a radiator is warm at the bottom but cold at the top or makes gurgling noises, there is air in it. Use a bleed key to open the valve at the top until water comes out, then close it.
3. Check the whole apartment. Is only one radiator cold, or all of them? Is there hot water? This information helps the technician.
4. Ask your neighbours. If the whole building has no heating, the central boiler may have a fault, and one report is enough.
5. For apartments with their own gas boiler (Gastherme): check the display for an error code and the water pressure (should be 1.0–2.0 bar). Note the error code. You may press the reset button once.

If the heating still does not work, report it to us with the building, unit, which rooms are affected and since when. During the heating season (1 October to 30 April) the apartment must reach at least 20–22 °C during the day. If temperatures outside are below 5 °C and the whole building is without heating, please use the emergency line. We can provide electric heaters on loan if a repair takes longer than one day.`,
  },
  {
    title: "Preventing mould: heating and ventilation",
    category: "procedures",
    body: `Mould develops when warm, humid air condenses on cold surfaces, typically in corners of exterior walls, behind wardrobes and around windows. A normal household produces 8–12 litres of moisture per day through cooking, showering, drying laundry and breathing. Regular ventilation removes this moisture.

How to ventilate correctly:
- Air the apartment 3–4 times a day for 5–10 minutes with windows fully open (Stoßlüften), ideally with a cross draught. In winter, 5 minutes is enough.
- Do not keep windows tilted for hours in winter; this cools down the walls without exchanging much air.
- Ventilate immediately after showering and cooking and keep the bathroom door closed while doing so.
- Keep all rooms heated to at least 16–18 °C, including bedrooms and rooms you rarely use.
- Leave a gap of at least 5–10 cm between large furniture and exterior walls.
- Avoid drying laundry inside if possible; if necessary, ventilate more often.
- An inexpensive hygrometer helps: indoor humidity should stay between 40 % and 60 %.

If you discover mould, please report it to us with photos. Do not paint over it. Small spots on silicone joints can be cleaned with a 70 % alcohol solution; larger areas (more than a postcard) must be assessed by a specialist so that the cause, such as a leak or thermal bridge, can be identified.`,
  },
  {
    title: "Move-out and apartment handover",
    category: "procedures",
    body: `After we have confirmed your notice, we will contact you to arrange two appointments:

1. Pre-inspection (Vorabnahme), about 4–6 weeks before the end of the tenancy. We walk through the apartment together and note which work, if any, needs to be done before handover, for example repairing damage or repainting walls in strong colours.

2. Final handover (Wohnungsübergabe) on or shortly before the last day of the tenancy. Please make sure that:
- the apartment is completely empty and broom-clean (besenrein), including the basement compartment and attic storage;
- all fixtures you installed have been removed and drill holes filled, unless otherwise agreed;
- all keys are available, including letterbox, basement and any copies you made;
- the meter readings for electricity, water and heating can be read.

During the handover we fill in a handover protocol (Übergabeprotokoll) with meter readings, the condition of each room and the number of keys returned. Both sides sign it, and you receive a copy.

Please do not forget to deregister your electricity contract, to set up a mail forwarding order with the post office, and to register your new address with the Bürgeramt within two weeks. The rental deposit is returned after the final service charge statement has been prepared; part of it may be retained for up to six months to cover a possible additional payment.`,
  },

  // ---------------------------------------------------------------- building-specific
  {
    title: "Lindenhof: courtyard, bike room and bin collection days",
    category: "house_rules",
    buildingIndex: 0,
    body: `This article applies only to the Lindenhof building, Lindenstraße 14, Berlin.

The rear courtyard is shared with the neighbouring building Lindenstraße 16. The gate to Lindenstraße 16 must be kept closed at all times; it is opened only by the caretaker for the bin collection on Tuesday and Thursday mornings.

The bicycle room is located in the basement of the side wing (Seitenflügel) and can be reached via the courtyard door with your building key. Space is limited to about 30 bicycles, so cargo bikes should be parked in the covered rack in the courtyard. Please do not lock bicycles to the drainpipes.

The bin area is next to the courtyard gate. Collection days at Lindenhof differ from the general calendar because the bins are shared with Lindenstraße 16: the black bins (Restmüll), the yellow bins (packaging / recycling) and the blue paper bins are all emptied every Tuesday morning; the brown bins (Bio) are emptied every Thursday morning. There is no Friday collection at Lindenhof. Please put out nothing next to the bins; if a bin is full, keep your bags until after Tuesday. Because the courtyard is used by children from both buildings, please do not leave glass bottles or sharp objects next to the bins.

The caretaker for Lindenhof, Mr Schulte, is on site Monday and Wednesday from 08:00 to 12:00 and can be reached through the property management.`,
  },
  {
    title: "Am Stadtpark: lift, heating system and underground garage",
    category: "procedures",
    buildingIndex: 1,
    body: `This article applies only to Am Stadtpark, Parkallee 7, Hamburg.

The building has a central gas condensing boiler in the basement that supplies heating and hot water to all ten apartments. The heating season starts on 1 October; the system switches automatically to night setback between 23:00 and 05:00, so radiators may be slightly cooler early in the morning. This is normal. If the whole building has no hot water, the most common cause is a pressure drop in the system, which the heating partner can fix the same day.

The lift is serviced every three months. In case of a breakdown, press the alarm button in the cabin; the call goes to the 24/7 service centre of the lift company. Please report other lift problems, such as doors closing too quickly, to the property management.

The underground garage gate opens with the remote control handed out with the parking space rental contract. Replacement remote controls cost 45 euros. Washing cars, changing oil and storing tyres or other items outside your parking space is not permitted in the garage. The garage is cleaned twice a year; dates are announced two weeks in advance, and all vehicles must be moved on these days.`,
  },
  {
    title: "Elbquartier: parcel lockers and shared roof terrace",
    category: "house_rules",
    buildingIndex: 7,
    body: `This article applies only to Elbquartier, Königsbrücker Straße 45, Dresden.

The building has smart parcel lockers in the entrance hall. Deliveries from the major parcel services are placed in a free locker, and you receive a pickup code by email or SMS. Please collect your parcel within 72 hours; after that the courier may take it back. If you have not received a code, contact the courier first. Large parcels that do not fit in a locker are left with a neighbour or at the nearest parcel shop.

The shared roof terrace on the 4th floor is open to all residents daily from 08:00 to 22:00. Grilling is allowed only with the electric grill provided on the terrace; please clean it after use. Glass is not allowed on the terrace, and children under 12 must be accompanied by an adult. The terrace can be reserved for private events of up to 15 people for a maximum of four hours via the booking list next to the terrace door; the terrace must be left clean and quiet hours start at 22:00.

The terrace furniture is stored in the box next to the door from November to March.`,
  },
];

// ---------------------------------------------------------------- conversations

export type ScriptMessage = {
  from: "contact" | "staff" | "agent"; // agent messages are drafts (awaiting approval)...
  sent?: boolean; // ...unless `sent`: an agent draft that staff already approved
  hoursAgo: number;
  body: string;
};

// ---------------------------------------------------------------- demo agent runs
// A scripted agent run attached to a conversation. seed.ts replays it through the real
// tool backends (agentRuns.*Impl), so args/results look exactly like a live run.
// Text fields may use the same {placeholders} as messages.

export type DemoToolCall =
  | { name: "lookup_tenant"; query: string | null; durationMs: number }
  | { name: "get_unit_info"; durationMs: number } // unit_id = the sender's unit from lookup_tenant
  | {
      name: "search_knowledge_base";
      query: string;
      category: "house_rules" | "faq" | "procedures" | null;
      durationMs: number;
    }
  | {
      name: "create_maintenance_ticket";
      title: string;
      description: string;
      category: "plumbing" | "electrical" | "heating" | "appliance" | "structural" | "pest" | "other";
      priority: "low" | "medium" | "high" | "urgent";
      durationMs: number;
    }
  // reply omitted = the body of the script's agent message (the draft this run produced)
  | { name: "draft_reply"; reply?: string; confidence: number; reasoning: string }
  | { name: "handoff_to_human"; reason: string; summary: string; suggested_reply: string | null };

export type DemoTurn = {
  text: string; // visible model text in this turn ("" when it only called tools)
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  tools: DemoToolCall[]; // tool_use blocks of this turn, in order (terminal last)
};

export type DemoRun = {
  turns: DemoTurn[];
  feedback?: {
    rating: "up" | "down";
    rootCause?: "wrong_tool" | "bad_tool_args" | "retrieval_miss" | "missing_knowledge" | "reasoning" | "tone" | "should_have_handed_off" | "other";
    blameTool?: DemoToolCall["name"]; // stepIndex = first step calling this tool
    note?: string;
    resolved?: boolean;
    hoursAgo: number;
  };
};

export type ConversationScript = {
  channel: "email" | "whatsapp" | "phone";
  // Which contact sent it: index into the generated tenant list, an owner, or unknown.
  sender: { kind: "tenant"; index: number } | { kind: "owner"; index: number } | { kind: "unknown"; name?: string; handle: string };
  subject?: string;
  status: "open" | "awaiting_approval" | "needs_human" | "closed";
  unread: boolean;
  messages: ScriptMessage[];
  // Agent run triggered by the last contact message before the first agent message
  // (or the last contact message when there is none). Its draft = that agent message.
  demoRun?: DemoRun;
  ticket?: {
    title: string;
    description: string;
    category: "plumbing" | "electrical" | "heating" | "appliance" | "structural" | "pest" | "other";
    priority: "low" | "medium" | "high" | "urgent";
    status: "open" | "in_progress" | "resolved";
  };
};

// Placeholders replaced at seed time: {first} {last} {name} {unit} {building} {street} {city} {staff} {staffFirst}
export const STAFF_NAMES = ["Jana Krüger", "Tobias Brandt", "Miriam Vogel"];

export const CONVERSATIONS: ConversationScript[] = [
  {
    channel: "email",
    sender: { kind: "tenant", index: 2 },
    subject: "Heating not working since yesterday",
    status: "open",
    unread: true,
    messages: [
      {
        from: "contact",
        hoursAgo: 52,
        body: `Hello,

since yesterday evening the heating in our apartment ({building}, {unit}) is not working at all. All radiators are cold, even when I turn the thermostats to 5. Hot water still works. It's getting really cold at night, especially in the children's room.

Could you please send someone as soon as possible?

Best regards,
{name}`,
      },
      {
        from: "staff",
        hoursAgo: 49,
        body: `Dear {name},

thank you for letting us know, and sorry for the inconvenience. We have informed our heating partner, who will contact you today to arrange a visit for tomorrow morning. In the meantime, could you please check whether your neighbours are affected too, and try bleeding the radiators once?

If it gets too cold, we can bring you an electric heater on loan, just reply to this email.

Kind regards,
{staff}
PropInbox Hausverwaltung`,
      },
      {
        from: "contact",
        hoursAgo: 3,
        body: `Hi {staffFirst},

the technician came yesterday and replaced a valve, but this morning the radiators are cold again. The neighbours on our floor say theirs are only lukewarm. Could we get the electric heater after all? And will the technician come back today?

Thanks,
{first}`,
      },
    ],
    ticket: {
      title: "Heating failure – radiators cold again after valve repair",
      description: "All radiators cold in the apartment, hot water OK. Heating partner replaced a valve but the problem returned the next morning; neighbours on the same floor report lukewarm radiators. Possibly a building-wide pressure issue. Tenant requests an electric heater on loan.",
      category: "heating",
      priority: "high",
      status: "in_progress",
    },
  },
  {
    channel: "whatsapp",
    sender: { kind: "tenant", index: 7 },
    status: "needs_human",
    unread: true,
    messages: [
      {
        from: "contact",
        hoursAgo: 6,
        body: `Hello, water is dripping from the pipe under my kitchen sink 😟 there's already a puddle on the floor. {unit}, {building}`,
      },
      {
        from: "staff",
        hoursAgo: 5.8,
        body: `Hi {first}, thanks for the quick message. Please close the small angle valve under the sink (turn clockwise) and put a bucket under the pipe. Is the water still coming after closing it?`,
      },
      {
        from: "contact",
        hoursAgo: 5.5,
        body: `I closed it, it's less but still dripping slowly. And the cabinet bottom is soaked, the wood is swelling. The neighbour below says there's a wet spot on her ceiling now`,
      },
    ],
    ticket: {
      title: "Leaking pipe under kitchen sink – water reaching apartment below",
      description: "Drain/supply pipe under kitchen sink leaking. Angle valve closed but still dripping. Kitchen base cabinet soaked; tenant below reports wet spot on ceiling. Plumber needed urgently; possible insurance claim.",
      category: "plumbing",
      priority: "urgent",
      status: "open",
    },
  },
  {
    channel: "email",
    sender: { kind: "tenant", index: 11 },
    subject: "Question about my Nebenkostenabrechnung 2025",
    status: "awaiting_approval",
    unread: false,
    messages: [
      {
        from: "contact",
        hoursAgo: 20,
        body: `Dear Sir or Madam,

I received the service charge statement for 2025 last week and I have to pay an additional 412 euros. Last year I got money back. Why is it so much higher this year? I haven't changed anything about how I heat.

Also, is it possible to pay the amount in two instalments?

Kind regards,
{name}
{street}, {unit}`,
      },
      {
        from: "agent",
        hoursAgo: 19.5,
        body: `Dear {name},

thank you for your message about the service charge statement for 2025.

The additional payment is mainly due to higher heating costs: the gas price for the building rose significantly in 2025 compared to the previous year, and heating costs are split partly by your measured consumption and partly by living area. Your monthly advance payment had not yet been adjusted to the new prices, which is why there is a difference this year.

You are welcome to inspect the original invoices; just let us know and we will arrange an appointment. Paying the 412 euros in two instalments is generally possible – please confirm and we will send you the dates. The additional payment is otherwise due 30 days after you received the statement.

Kind regards,
PropInbox Hausverwaltung`,
      },
    ],
  },
  {
    channel: "whatsapp",
    sender: { kind: "tenant", index: 15 },
    status: "awaiting_approval",
    unread: false,
    messages: [
      {
        from: "contact",
        hoursAgo: 30,
        body: `Hi, I lost my keys yesterday on the way home 🙈 I'm staying with a friend for now. How can I get a new key and how much does it cost?`,
      },
      {
        from: "staff",
        hoursAgo: 28,
        body: `Hi {first}, sorry to hear that! Were there any documents with your address on the key ring, or was your wallet lost too?`,
      },
      {
        from: "contact",
        hoursAgo: 26,
        body: `No, just the keys, nothing with the address. It's the apartment key, front door and letterbox key.`,
      },
      {
        from: "agent",
        hoursAgo: 25.8,
        body: `Thanks {first}. Since there was nothing with your address, the lock does not need to be replaced. We will order replacement keys through our locksmith using the security card – this takes about 7–10 working days. Costs are approx. 35–60 € per security key and about 15 € for the letterbox key. Many personal liability insurances cover lost keys, so it's worth checking your policy. Shall we place the order for one apartment/front-door key and one letterbox key?

Your PropInbox property team`,
      },
    ],
    demoRun: {
      turns: [
        {
          text: "",
          inputTokens: 3618,
          outputTokens: 142,
          durationMs: 2380,
          tools: [{ name: "lookup_tenant", query: null, durationMs: 18 }],
        },
        {
          text: "Known tenant with a unit on file. Checking the unit for open issues and the policy for replacement keys.",
          inputTokens: 4107,
          outputTokens: 196,
          durationMs: 2910,
          tools: [
            { name: "get_unit_info", durationMs: 24 },
            { name: "search_knowledge_base", query: "lost key replacement", category: "faq", durationMs: 41 },
          ],
        },
        {
          text: "",
          inputTokens: 5862,
          outputTokens: 388,
          durationMs: 4720,
          tools: [
            {
              name: "draft_reply",
              confidence: 0.91,
              reasoning:
                "Process, 7–10 working days and costs (35–60 € per security key, ~15 € letterbox key) come from the 'Lost keys and key replacement costs' FAQ. Nothing with the address was lost, so per the same article no cylinder change is needed.",
            },
          ],
        },
      ],
    },
  },
  {
    channel: "phone",
    sender: { kind: "tenant", index: 20 },
    subject: "Voicemail: noise complaint",
    status: "open",
    unread: true,
    messages: [
      {
        from: "contact",
        hoursAgo: 9,
        body: `[Voicemail, 1:12] Yes, hello, this is {name} from {building}, {unit}. I'm calling again about the noise from the apartment above me. Last night there was loud music and people stomping around until almost two in the morning, and it's the third weekend in a row. I've already spoken to them twice and they just laugh it off. I really need to sleep, I start work at six. Please call me back or do something about this. Thank you.`,
      },
      {
        from: "staff",
        hoursAgo: 7,
        body: `[Call note] Called {first} back. Explained that we need a short noise log (dates, times, type of noise) to send a written warning to the upstairs tenant. {first} will email the log by the end of the week.`,
      },
      {
        from: "contact",
        hoursAgo: 1.5,
        body: `[Voicemail, 0:34] Hi, {first} again. Just wanted to say it's happening again right now, at half past eleven on a Tuesday. Music, bass, everything. I'm writing it down. Please call me tomorrow.`,
      },
    ],
  },
  {
    channel: "email",
    sender: { kind: "tenant", index: 4 },
    subject: "Request: subletting a room for 6 months",
    status: "closed",
    unread: false,
    messages: [
      {
        from: "contact",
        hoursAgo: 230,
        body: `Hello,

I will be working in Lyon from January to June next year for a project. I would like to sublet my second room to a colleague, Ms Petra Lindqvist, during this time. I would keep the bedroom for myself and come back some weekends.

Is that possible? What do you need from me?

Best wishes,
{name}`,
      },
      {
        from: "staff",
        hoursAgo: 210,
        body: `Dear {name},

thank you for asking in advance. Subletting part of the apartment requires our written consent. Please send us the following: the full name of the subtenant, the start and end date, which room will be sublet, and a short confirmation that you will remain responsible for the rent.

Once we have this information, we will send you the written consent within two weeks.

Kind regards,
{staff}
PropInbox Hausverwaltung`,
      },
      {
        from: "contact",
        hoursAgo: 190,
        body: `Dear {staffFirst},

here are the details: subtenant Petra Lindqvist, 1 January to 30 June, the small room facing the courtyard (approx. 11 sqm). I confirm that I remain the main tenant and responsible for the rent.

Thank you!
{first}`,
      },
      {
        from: "staff",
        hoursAgo: 170,
        body: `Dear {name},

thank you. We hereby grant consent to sublet the room described for the period 1 January to 30 June. The formal consent letter is attached as a PDF. Please remind Ms Lindqvist to register the address with the Bürgeramt.

Have a good time in Lyon!

{staff}
PropInbox Hausverwaltung`,
      },
    ],
  },
  {
    channel: "whatsapp",
    sender: { kind: "tenant", index: 26 },
    status: "closed",
    unread: false,
    messages: [
      {
        from: "contact",
        hoursAgo: 140,
        body: `Hi! The DHL guy says he left a parcel for me "with the property management"? Is it with you? It's a big box from a furniture shop`,
      },
      {
        from: "staff",
        hoursAgo: 138,
        body: `Hi {first}, we don't accept parcels at the office, sorry. According to the caretaker the courier left a big box with your neighbour on the ground floor (EG rechts). The delivery note should be in your letterbox.`,
      },
      {
        from: "contact",
        hoursAgo: 136,
        body: `Found it, thank you so much! 🙏`,
      },
    ],
  },
  {
    channel: "whatsapp",
    sender: { kind: "unknown", handle: "+4917623458810" },
    status: "open",
    unread: true,
    messages: [
      {
        from: "contact",
        hoursAgo: 14,
        body: `Hello, I got this number from the sign on the house. Is the apartment in the building still available? I'm looking for 2 rooms from January.`,
      },
      {
        from: "staff",
        hoursAgo: 12,
        body: `Hello, thanks for your interest! Which building do you mean (street and city)? Then we can tell you which apartments are currently free.`,
      },
      {
        from: "contact",
        hoursAgo: 0.7,
        body: `Sorry for the late reply. It's the one on Schillerstraße in München, the white building with the green balconies. My name is Daniel Okafor btw. Can I come for a viewing this week?`,
      },
    ],
  },
  {
    channel: "email",
    sender: { kind: "tenant", index: 30 },
    subject: "Black mould in the bathroom",
    status: "needs_human",
    unread: false,
    messages: [
      {
        from: "contact",
        hoursAgo: 75,
        body: `Hello,

we have black mould in the bathroom, in the corner of the ceiling above the shower and now also behind the wardrobe in the bedroom on the outside wall. We ventilate every day and heat normally. I'm worried about our baby's health. I've attached photos.

What are you going to do about this? Honestly, I think the rent should be reduced until it's fixed.

{name}
{building}, {unit}`,
      },
      {
        from: "staff",
        hoursAgo: 70,
        body: `Dear {name},

thank you for the photos. We take this seriously and will send a building surveyor to check the cause (e.g. thermal bridge or moisture from outside). Please don't paint over the affected areas until then. We will get back to you about the appointment.

Kind regards,
{staff}`,
      },
      {
        from: "contact",
        hoursAgo: 22,
        body: `It has now been three days and nobody has contacted us. The spot behind the wardrobe is getting bigger. I want a date in writing, and I'd like to know how much the rent will be reduced. Otherwise I will contact the Mieterverein.

{first}`,
      },
    ],
    ticket: {
      title: "Mould in bathroom ceiling and bedroom exterior wall",
      description: "Black mould above shower and behind wardrobe on exterior wall in bedroom. Tenant ventilates daily; infant in household. Surveyor needed to determine cause (thermal bridge vs. moisture ingress). Tenant is requesting a rent reduction and a written appointment date.",
      category: "structural",
      priority: "high",
      status: "open",
    },
  },
  {
    channel: "whatsapp",
    sender: { kind: "tenant", index: 34 },
    status: "open",
    unread: false,
    messages: [
      {
        from: "contact",
        hoursAgo: 100,
        body: `Hi, quick question: can I keep my e-bike in the stairwell under the stairs? The bike room is really full and the battery is heavy to carry down.`,
      },
      {
        from: "staff",
        hoursAgo: 98,
        body: `Hi {first}, unfortunately not – the stairwell is an escape route and must stay clear. The e-bike can go in the bike room or in the courtyard rack. Please charge the battery in your apartment, not in the basement.`,
      },
      {
        from: "contact",
        hoursAgo: 40,
        body: `Ok understood. But the bike room really is full, half of the bikes there have flat tyres and look abandoned for years. Can you clear them out?`,
      },
    ],
  },
  {
    channel: "email",
    sender: { kind: "tenant", index: 38 },
    subject: "New bank account for rent payment",
    status: "open",
    unread: true,
    messages: [
      {
        from: "contact",
        hoursAgo: 18,
        body: `Good morning,

I have changed banks. Until now the rent has been collected by direct debit from my old account. What do I need to do so that the November rent is taken from the new account? The old account will be closed at the end of the month.

My new IBAN is DE89 3704 0044 0532 0130 00.

Thank you and best regards,
{name}`,
      },
      {
        from: "staff",
        hoursAgo: 16,
        body: `Dear {name},

thank you for letting us know in good time. For data protection reasons we need a new signed SEPA mandate for the new account – an IBAN by email alone is not enough. I've attached the form; please send it back signed (a scan is fine).

Kind regards,
{staff}`,
      },
      {
        from: "contact",
        hoursAgo: 2,
        body: `Hello {staffFirst},

attached is the signed mandate. Could you please confirm that it will be in place for the November payment? I don't want to get a reminder fee.

Best,
{first}`,
      },
    ],
  },
  {
    channel: "phone",
    sender: { kind: "tenant", index: 42 },
    subject: "Call: doorbell / intercom broken",
    status: "open",
    unread: false,
    messages: [
      {
        from: "contact",
        hoursAgo: 60,
        body: `[Call transcript, 2:05] Tenant {name}, {building} {unit}: "Hi, our doorbell hasn't worked for about a week. When someone rings downstairs, nothing happens upstairs, and the button to open the front door also does nothing. I've missed two deliveries already. Can someone look at it?"`,
      },
      {
        from: "staff",
        hoursAgo: 59.5,
        body: `[Call note] Told {first} we will send the electrician. Asked whether other apartments are affected – {first} doesn't know. Ticket created; electrician to call {first} directly.`,
      },
      {
        from: "contact",
        hoursAgo: 4,
        body: `[Voicemail, 0:41] Hello, this is {name} again from {unit}. Nobody has called me yet about the doorbell. Could you please give me an update? Thanks.`,
      },
    ],
    ticket: {
      title: "Intercom / doorbell and door opener not working",
      description: "Doorbell does not ring in the apartment and the door-opener button has no function for about a week. Unknown whether other units are affected. Electrician to contact tenant directly.",
      category: "electrical",
      priority: "medium",
      status: "open",
    },
  },
  {
    channel: "email",
    sender: { kind: "tenant", index: 46 },
    subject: "Termination of my rental agreement",
    status: "open",
    unread: true,
    messages: [
      {
        from: "contact",
        hoursAgo: 28,
        body: `Dear Sir or Madam,

I would like to terminate my rental agreement for the apartment {unit} in {street}, {city}, as of 31 January. I'm moving to another city for a new job.

Is this email enough, or do I need to send something by post? And when can we do the handover?

Kind regards,
{name}`,
      },
      {
        from: "staff",
        hoursAgo: 25,
        body: `Dear {name},

thank you for your message, and congratulations on the new job. Please note that a termination must be in writing with your handwritten signature – an email is unfortunately not legally sufficient. With the statutory notice period of three months, a letter received by us by 3 November would end the tenancy on 31 January.

Kind regards,
{staff}`,
      },
      {
        from: "contact",
        hoursAgo: 5,
        body: `Thank you for the information. I put the signed letter in your letterbox at the office this morning. Could you confirm that you received it and that the end date is 31 January? Also, I have a nice kitchen that the next tenant might want to take over – is that possible?

{first}`,
      },
    ],
  },
  {
    channel: "whatsapp",
    sender: { kind: "tenant", index: 50 },
    status: "open",
    unread: true,
    messages: [
      {
        from: "contact",
        hoursAgo: 46,
        body: `Hello, which day is the yellow bin collected? It's overflowing and people are putting bags next to it`,
      },
      {
        from: "staff",
        hoursAgo: 45,
        body: `Hi {first}, the yellow bin is emptied every second Friday – the next collection is this Friday. The full calendar hangs on the notice board in the entrance hall. We'll ask the caretaker to tidy up the bags.`,
      },
      {
        from: "contact",
        hoursAgo: 8,
        body: `Thanks. Could we maybe get a second yellow bin? It's full again after a week every time, and now there are rats in the courtyard at night 🐀`,
      },
    ],
  },
  {
    channel: "email",
    sender: { kind: "owner", index: 0 },
    subject: "Owners' meeting and roof repair quote",
    status: "open",
    unread: false,
    messages: [
      {
        from: "contact",
        hoursAgo: 120,
        body: `Dear {staffFirst},

could you please send me the date for this year's owners' meeting (Eigentümerversammlung) and the agenda as soon as it is available? I'd also like to see the second quote for the roof repair before the meeting, as I find the first one quite expensive.

Kind regards,
{name}`,
      },
      {
        from: "staff",
        hoursAgo: 96,
        body: `Dear {name},

the owners' meeting is planned for Thursday, 26 November, 18:30 in the community room. The official invitation with the agenda will be sent at least three weeks in advance. We have requested a second and a third quote for the roof repair and will forward them as soon as they arrive.

Kind regards,
{staff}`,
      },
      {
        from: "contact",
        hoursAgo: 11,
        body: `Thank you. Have the other quotes arrived yet? I'd like to compare them before the invitation goes out, and I may want to add an agenda item on the courtyard lighting.

{name}`,
      },
    ],
  },

  // ---------------------------------------------------------------- with demo agent runs
  // Bad answer (thumbs-down): vague KB query missed the Lindenhof-specific schedule.
  {
    channel: "whatsapp",
    sender: { kind: "tenant", index: 6 }, // Lindenhof
    status: "closed",
    unread: false,
    messages: [
      {
        from: "contact",
        hoursAgo: 74,
        body: `Hi, I moved in two weeks ago. Which day are the yellow bin and the paper bin collected here? Both are full and I don't want to leave my bags next to them`,
      },
      {
        from: "agent",
        sent: true,
        hoursAgo: 73.6,
        body: `Hi {first}, welcome to {building}! The yellow bin and the blue paper bin are emptied every second Friday. The current collection calendar of the city also hangs on the notice board in the entrance hall.

Your PropInbox property team`,
      },
      {
        from: "contact",
        hoursAgo: 23,
        body: `I put my bags out on Friday like you said but nothing was collected and the bins are still full. My neighbour says recycling here is picked up on Tuesdays?`,
      },
      {
        from: "staff",
        hoursAgo: 21,
        body: `Hi {first}, sorry, your neighbour is right and our earlier message was wrong: at {building} the yellow and the paper bins are emptied every Tuesday morning (brown bin on Thursdays). There is no Friday collection in your building. Apologies for the trouble!

{staff}`,
      },
    ],
    demoRun: {
      turns: [
        {
          text: "",
          inputTokens: 3544,
          outputTokens: 128,
          durationMs: 2210,
          tools: [{ name: "lookup_tenant", query: null, durationMs: 16 }],
        },
        {
          text: "",
          inputTokens: 3981,
          outputTokens: 104,
          durationMs: 1840,
          tools: [{ name: "search_knowledge_base", query: "waste", category: null, durationMs: 37 }],
        },
        {
          text: "",
          inputTokens: 5316,
          outputTokens: 251,
          durationMs: 3360,
          tools: [
            {
              name: "draft_reply",
              confidence: 0.86,
              reasoning:
                "Collection days from the 'Rubbish separation and collection days' house rule: yellow bin and paper bin every second Friday.",
            },
          ],
        },
      ],
      feedback: {
        rating: "down",
        rootCause: "retrieval_miss",
        blameTool: "search_knowledge_base",
        note: "Searched 'waste' — missed the building-specific collection schedule (Tuesday). Reply said Friday.",
        resolved: false,
        hoursAgo: 20.5,
      },
    },
  },
  // Handoff: rent reduction request.
  {
    channel: "email",
    sender: { kind: "tenant", index: 36 },
    subject: "Rent reduction because of construction noise and heating outage",
    status: "needs_human",
    unread: true,
    messages: [
      {
        from: "contact",
        hoursAgo: 10,
        body: `Dear Sir or Madam,

for three weeks now there has been scaffolding in front of our windows and the roof works start at 7 in the morning, including Saturdays. There is drilling and hammering all day, and I work from home. On top of that, the heating in the whole building was out from Monday to Thursday last week, and we had to borrow electric heaters from friends.

I think this justifies a rent reduction. I would like a reduction of 20 % for October and for every month the construction work continues. Please confirm in writing.

Kind regards,
{name}
{street}, {unit}`,
      },
    ],
    ticket: {
      title: "Building-wide heating outage – boiler fault",
      description: "Central boiler fault, whole building without heating Monday to Thursday. Heating partner replaced the ignition module; system running normally again.",
      category: "heating",
      priority: "urgent",
      status: "resolved",
    },
    demoRun: {
      turns: [
        {
          text: "I'll identify the sender first.",
          inputTokens: 3796,
          outputTokens: 151,
          durationMs: 2560,
          tools: [{ name: "lookup_tenant", query: null, durationMs: 15 }],
        },
        {
          text: "",
          inputTokens: 4268,
          outputTokens: 133,
          durationMs: 2190,
          tools: [{ name: "get_unit_info", durationMs: 22 }],
        },
        {
          text: "This is a rent reduction request; per policy a staff member has to decide. No open repair ticket is needed: the heating is working again and the roof works are planned.",
          inputTokens: 4734,
          outputTokens: 467,
          durationMs: 5240,
          tools: [
            {
              name: "handoff_to_human",
              reason: "Rent reduction request (construction noise + heating outage)",
              summary:
                "{name} ({building}, {unit}) asks for a 20 % rent reduction for October and for every further month of the roof works, citing scaffolding and construction noise from 7:00 incl. Saturdays and last week's four-day building-wide heating outage. Wants written confirmation. No ticket created: the heating is working again and no open ticket exists for the unit.",
              suggested_reply:
                "Dear {name},\n\nthank you for your message, and we are sorry for the disruption caused by the roof works and last week's heating outage. We have passed your request for a rent reduction on to the responsible colleague, who will review it and get back to you in writing.\n\nKind regards,\nYour PropInbox property team",
            },
          ],
        },
      ],
    },
  },
  // Drafted + urgent ticket: active leak through the ceiling.
  {
    channel: "whatsapp",
    sender: { kind: "tenant", index: 22 },
    status: "awaiting_approval",
    unread: true,
    messages: [
      {
        from: "contact",
        hoursAgo: 1.2,
        body: `Help, water is dripping from my bathroom ceiling, right next to the lamp!! It's getting faster. I rang upstairs but nobody is home. {building}, {unit}`,
      },
      {
        from: "agent",
        hoursAgo: 1.18,
        body: `Hi {first}, thanks for telling us right away. Please switch off the bathroom light at the fuse box and don't touch the lamp while water is near it. Put a bucket under the drip, move towels and valuables out of the way and take a few photos for the insurance.

We have opened an urgent maintenance request and our plumbing partner will contact you shortly to come out. If the water gets heavier in the meantime, call our 24/7 emergency line: +49 30 1234 5670.

Your PropInbox property team`,
      },
    ],
    demoRun: {
      turns: [
        {
          text: "",
          inputTokens: 3581,
          outputTokens: 139,
          durationMs: 2050,
          tools: [{ name: "lookup_tenant", query: null, durationMs: 17 }],
        },
        {
          text: "Active leak next to a light fitting. Checking for an existing ticket on the unit and the leak procedure.",
          inputTokens: 4072,
          outputTokens: 212,
          durationMs: 2840,
          tools: [
            { name: "get_unit_info", durationMs: 21 },
            { name: "search_knowledge_base", query: "water leak ceiling", category: "procedures", durationMs: 44 },
          ],
        },
        {
          text: "No open ticket for this unit. Creating an urgent plumbing ticket (active leak, electrical hazard).",
          inputTokens: 5794,
          outputTokens: 318,
          durationMs: 3980,
          tools: [
            {
              name: "create_maintenance_ticket",
              title: "Water dripping through bathroom ceiling next to light",
              description:
                "Active leak: water dripping from the bathroom ceiling next to the ceiling lamp, getting faster. Source is most likely the apartment above (tenant rang, nobody home). Electrical hazard because of the lamp. Plumber needed urgently; access to the apartment above may be required.",
              category: "plumbing",
              priority: "urgent",
              durationMs: 29,
            },
          ],
        },
        {
          text: "",
          inputTokens: 6143,
          outputTokens: 486,
          durationMs: 5610,
          tools: [
            {
              name: "draft_reply",
              confidence: 0.88,
              reasoning:
                "Safety steps, photos and the 24/7 emergency number come from 'Emergency procedure: water leak or burst pipe'. Urgent plumbing ticket created; no appointment time promised.",
            },
          ],
        },
      ],
    },
  },
];

// A resolved ticket that has no conversation attached.
export const EXTRA_TICKETS = [
  {
    tenantIndex: 9,
    title: "Dishwasher not draining",
    description: "Built-in dishwasher (part of the fitted kitchen) leaves standing water after every cycle. Appliance technician cleaned the drain pump and replaced the filter.",
    category: "appliance" as const,
    priority: "low" as const,
    status: "resolved" as const,
  },
];
