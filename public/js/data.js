/**
 * MAUSAM AI - shared reference data.
 * Single source of truth for BOTH the browser and the Node backend.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MAUSAM_DATA = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

const PERSONAS = {
  agri:{icon:"🌾",name:"Agriculture & Crop Advisory",tag:"Soil · Crop · Season · Fertilizer",
    about:"For farmers — soil type, seasonal crops, fertilizer, irrigation, pests and government schemes.",
    chips:["Which soil does my state have and which crop should I grow?","Which crop should I sow this season?","How much fertilizer and water does my crop need?","My crop has a pest problem — what should I do?","Tell me about government schemes and MSP","What field work should I do today based on the weather?"]},
  run:{icon:"🏃",name:"Running & Workout Guide",tag:"Best time · Heat · Hydration",
    about:"For runners and fitness lovers — safe training window, heat index, hydration and air-quality safety.",
    chips:["What is the best time to run today?","How should I adjust my pace in heat and humidity?","How much water should I drink, and when?","Is it safe to run outdoors with this AQI?","Gym or outdoor — which is better today?","Give me clothing, footwear and warm-up advice"]},
  school:{icon:"🎒",name:"School Commute & Family Outing",tag:"Kids · Umbrella · Picnic",
    about:"For parents — the school run, umbrella and raincoat decisions, and weekend family outing planning.",
    chips:["Should I pack an umbrella or raincoat today?","What should I watch out for when sending kids to school?","Plan a family outing for this weekend","How do I keep kids safe in this heat?","Which day is best for a picnic?","School bus and auto timing advice for rain"]},
  travel:{icon:"✈️",name:"Traveler & Destination Weather",tag:"Packing · Best time · Trip",
    about:"For travellers — destination weather, packing list, best time to visit and travel advisories.",
    chips:["What will the weather be at my destination?","Build me a packing list for my trip","What is the best time to visit?","Is it safe to travel during the monsoon?","Which day is good for sightseeing?","Is there a risk of flight or train delays?"]},
  aqi:{icon:"😷",name:"Air Quality & Health Risk",tag:"AQI · Mask · Asthma",
    about:"Health-focused — AQI reading, mask decisions, asthma and allergy risk, and indoor air guidance.",
    chips:["What is the AQI today and how risky is it?","Should I wear a mask?","Advice for an asthma or allergy patient","Do I need an air purifier at home?","Should I keep the windows open or closed?","Is it safe for children and the elderly?"]},
  commute:{icon:"🚗",name:"Daily Commuter & Nowcast",tag:"Next 2 hours · Leave time",
    about:"For daily commuters — the next 2-hour rain nowcast and the right time to leave.",
    chips:["Will it rain in the next 2 hours?","When should I leave home?","Bike or car — which is better today?","Is there a traffic or rain delay risk?","Is it safe to go out in the afternoon?","Travel time and route advice"]},
  beach:{icon:"🏖️",name:"Beachgoers & Surfers",tag:"Waves · Tide · Sea temp",
    about:"For beach trips and surfing — wave height, tide timing, sea temperature and safety advisories.",
    chips:["What are the wave height and surf conditions today?","When will the tide rise or fall?","Is the sea temperature good for swimming?","Is it safe to swim or surf today?","What is the best time for a beach day?","What should I know about rip currents and safety?"]},
  event:{icon:"🎉",name:"Event Planners & Gatherings",tag:"Comfort Index · Rain % · Timing",
    about:"For weddings, parties and outdoor events — Comfort Index, rain probability and the best window.",
    chips:["What is the Comfort Index today?","What is the best time for an outdoor event?","What is the probability of rain?","Which day this week is best?","Should I choose an indoor or outdoor venue?","Build me an event planning checklist"]}
};

const STATES={
"Punjab":{soil:"Alluvial (fertile, well-drained)",kharif:["Rice (Paddy)","Maize","Cotton","Sugarcane","Bajra"],rabi:["Wheat","Mustard","Gram (Chana)","Barley","Potato"],zaid:["Moong","Watermelon","Fodder"],tip:"Grow moong after the rice-wheat cycle — it restores nitrogen to the soil."},
"Haryana":{soil:"Alluvial + sandy patches",kharif:["Rice","Bajra","Cotton","Sugarcane","Jowar"],rabi:["Wheat","Mustard","Gram","Barley"],zaid:["Moong","Cucumber","Fodder"],tip:"Use drip or sprinkler irrigation — the water table is falling."},
"Uttar Pradesh":{soil:"Alluvial (Ganga plain)",kharif:["Rice","Sugarcane","Maize","Bajra","Tur (Arhar)"],rabi:["Wheat","Mustard","Gram","Potato","Peas"],zaid:["Moong","Watermelon","Vegetables"],tip:"Intercrop sugarcane with potato or mustard to increase income."},
"Bihar":{soil:"Alluvial + calcareous",kharif:["Rice","Maize","Sugarcane","Jute"],rabi:["Wheat","Gram","Mustard","Lentil"],zaid:["Moong","Maize (fodder)","Vegetables"],tip:"In flood-prone belts, choose early-maturing rice varieties."},
"West Bengal":{soil:"Alluvial / Deltaic",kharif:["Rice","Jute","Maize","Sugarcane"],rabi:["Rice (boro)","Potato","Mustard","Lentil"],zaid:["Vegetables","Sesame","Moong"],tip:"The Aman-Boro-Aus rice rotation is a classic; follow jute with potato."},
"Madhya Pradesh":{soil:"Black (Regur) + Alluvial",kharif:["Soybean","Rice","Maize","Cotton","Tur"],rabi:["Wheat","Gram (Chana)","Garlic","Mustard"],zaid:["Moong","Watermelon"],tip:"Soybean-chana rotation is the most profitable in MP."},
"Maharashtra":{soil:"Black (Regur) — moisture retentive",kharif:["Cotton","Soybean","Jowar","Bajra","Tur"],rabi:["Wheat","Gram","Jowar (rabi)","Onion"],zaid:["Onion","Watermelon","Groundnut"],tip:"Cotton with tur intercropping works best on black soil."},
"Gujarat":{soil:"Black + Alluvial + Sandy",kharif:["Cotton","Groundnut","Bajra","Castor","Sesame"],rabi:["Wheat","Mustard","Gram","Cumin (Jeera)"],zaid:["Groundnut","Watermelon","Fodder"],tip:"Follow groundnut with cumin — a high-value rabi crop."},
"Rajasthan":{soil:"Sandy / Arid (low organic matter)",kharif:["Bajra","Moth bean","Moong","Cotton","Guar"],rabi:["Wheat","Mustard","Barley","Gram","Cumin"],zaid:["Moong","Watermelon","Fodder"],tip:"Drip irrigation and mulching are a must; bajra-moth is the safest combination."},
"Karnataka":{soil:"Red loam + Black",kharif:["Ragi (Finger millet)","Rice","Maize","Cotton","Sugarcane"],rabi:["Wheat","Jowar","Gram","Groundnut"],zaid:["Groundnut","Vegetables","Watermelon"],tip:"Ragi is drought-hardy — the best choice for low-rainfall areas."},
"Tamil Nadu":{soil:"Red + Alluvial + Black",kharif:["Rice","Maize","Cotton","Sugarcane","Groundnut"],rabi:["Rice","Banana","Pulses","Groundnut"],zaid:["Rice (kuruvai)","Vegetables","Cotton"],tip:"Short-duration rice in the delta gives 2-3 crops per year."},
"Andhra Pradesh":{soil:"Black + Alluvial + Red",kharif:["Rice","Cotton","Maize","Chilli","Tur"],rabi:["Rice","Pulses","Groundnut","Sugarcane"],zaid:["Vegetables","Sesame","Moong"],tip:"Drip plus mulching can raise chilli yields by up to 30%."},
"Telangana":{soil:"Black + Red sandy",kharif:["Rice","Cotton","Maize","Turmeric","Chilli"],rabi:["Rice","Maize","Groundnut","Pulses"],zaid:["Vegetables","Watermelon"],tip:"Cotton with pigeon pea (tur) intercropping is recommended."},
"Kerala":{soil:"Laterite (acidic, low fertility)",kharif:["Rice","Banana","Coconut","Rubber","Ginger"],rabi:["Rice","Vegetables","Pepper","Tapioca"],zaid:["Vegetables","Banana"],tip:"Laterite soil needs lime and organic compost."},
"Odisha":{soil:"Red + Alluvial + Laterite",kharif:["Rice","Jute","Groundnut","Tur"],rabi:["Rice","Pulses","Mustard","Groundnut"],zaid:["Moong","Vegetables","Sesame"],tip:"In the coastal belt, choose saline-tolerant rice varieties."},
"Jharkhand":{soil:"Red + Laterite (acidic)",kharif:["Rice","Maize","Groundnut","Tur"],rabi:["Wheat","Gram","Mustard","Peas"],zaid:["Moong","Vegetables"],tip:"Maize or ragi on uplands, rice on lowlands; apply lime for soil acidity."},
"Chhattisgarh":{soil:"Red + Yellow (Matasi)",kharif:["Rice","Maize","Soybean","Tur"],rabi:["Gram","Wheat","Linseed","Mustard"],zaid:["Moong","Vegetables"],tip:"Follow rice with gram — it uses the residual soil moisture."},
"Assam":{soil:"Alluvial (Brahmaputra, acidic)",kharif:["Rice","Jute","Sugarcane","Maize"],rabi:["Rice (boro)","Mustard","Potato","Pulses"],zaid:["Vegetables","Sesame"],tip:"The soil is acidic — add lime and increase organic matter."},
"Himachal Pradesh":{soil:"Brown / Hilly (sloping)",kharif:["Maize","Rice","Potato","Vegetables"],rabi:["Wheat","Barley","Peas","Mustard"],zaid:["Off-season vegetables","Fodder"],tip:"Off-season vegetables give high profits."},
"Uttarakhand":{soil:"Hilly / Brown forest",kharif:["Rice","Maize","Mandua (Ragi)","Soybean"],rabi:["Wheat","Barley","Mustard","Peas"],zaid:["Vegetables","Fodder"],tip:"Mandua (finger millet) is a traditional and nutritious cash crop."},
"Jammu and Kashmir":{soil:"Hilly / Karewa (silt loam)",kharif:["Rice","Maize","Vegetables"],rabi:["Wheat","Mustard","Barley","Apple"],zaid:["Vegetables","Fodder"],tip:"Saffron and apple are high-value crops on Karewa soil."},
"Goa":{soil:"Laterite + Coastal alluvial",kharif:["Rice","Cashew","Coconut","Sugarcane"],rabi:["Rice","Pulses","Vegetables"],zaid:["Vegetables","Banana"],tip:"Cashew-coconut intercropping gives additional income."},
"Sikkim":{soil:"Mountain / Brown",kharif:["Maize","Rice","Ginger","Large cardamom"],rabi:["Wheat","Barley","Buckwheat"],zaid:["Vegetables"],tip:"A 100% organic state — certification earns a premium price."},
"Tripura":{soil:"Red / Laterite",kharif:["Rice","Jute","Sugarcane"],rabi:["Rice","Mustard","Pulses"],zaid:["Vegetables","Pineapple"],tip:"Diversify with pineapple and rubber plantations."},
"Manipur":{soil:"Alluvial / Brown",kharif:["Rice","Maize","Soybean"],rabi:["Rice","Mustard","Pulses"],zaid:["Vegetables"],tip:"Focus on terrace farming and horticulture."},
"Meghalaya":{soil:"Red / Laterite (acidic)",kharif:["Rice","Maize","Turmeric","Potato"],rabi:["Potato","Mustard","Pulses"],zaid:["Vegetables","Ginger"],tip:"Lakadong turmeric is GI-tagged — a high-value export crop."},
"Mizoram":{soil:"Red / Laterite",kharif:["Rice","Maize","Ginger"],rabi:["Rice","Mustard","Pulses"],zaid:["Vegetables"],tip:"Bamboo and ginger agro-forestry is profitable."},
"Nagaland":{soil:"Red / Laterite",kharif:["Rice","Maize","Jhum crops"],rabi:["Rice","Mustard","Pulses"],zaid:["Vegetables"],tip:"Shift from jhum to permanent terrace rice cultivation."},
"Arunachal Pradesh":{soil:"Hilly / Forest",kharif:["Rice","Maize","Millet"],rabi:["Wheat","Barley","Mustard"],zaid:["Vegetables","Fruits"],tip:"The kiwi and orange horticulture belt is strong."},
"Delhi":{soil:"Alluvial (urban)",kharif:["Vegetables","Fodder"],rabi:["Wheat","Mustard","Vegetables"],zaid:["Vegetables","Fodder"],tip:"Vegetables are the most profitable in peri-urban farming."},
"Puducherry":{soil:"Coastal alluvial",kharif:["Rice","Sugarcane","Groundnut"],rabi:["Rice","Pulses"],zaid:["Vegetables"],tip:"Make full use of the delta irrigation canals."},
"Chandigarh":{soil:"Alluvial",kharif:["Maize","Fodder"],rabi:["Wheat","Mustard"],zaid:["Vegetables"],tip:"Kitchen gardening with organic vegetables works well."}
};

const CROPS={
"Wheat":{s:"Rabi",sow:"Oct–Nov",harv:"Mar–Apr",water:"4–6 irrigations",soil:"Alluvial, loam",fert:"NPK 120:60:40 kg/ha + zinc",tip:"Irrigate at the CRI stage (20–25 days) — this can raise yield by 25%."},
"Rice (Paddy)":{s:"Kharif",sow:"Jun–Jul",harv:"Oct–Nov",water:"Standing water 5cm",soil:"Clay loam, alluvial",fert:"NPK 100:50:50",tip:"Alternate wetting and drying saves about 30% of water."},
"Maize":{s:"Kharif/Rabi",sow:"Jun–Jul / Oct–Nov",harv:"Sep–Oct / Mar–Apr",water:"Moderate; tasseling critical",soil:"Well-drained loam",fert:"NPK 120:60:40",tip:"Water shortage at the tasseling-silking stage reduces yield."},
"Cotton":{s:"Kharif",sow:"Apr–Jun",harv:"Oct–Jan",water:"Moderate; avoid waterlogging",soil:"Black (Regur)",fert:"NPK 100:50:50 + boron",tip:"Use pheromone traps for pink bollworm."},
"Sugarcane":{s:"Annual",sow:"Feb–Mar / Oct–Nov",harv:"12–18 months",water:"High (~2000 mm)",soil:"Deep loam, alluvial",fert:"NPK 250:100:120",tip:"Trench planting with drip irrigation saves about 40% of water."},
"Soybean":{s:"Kharif",sow:"Jun–Jul",harv:"Oct",water:"450–700 mm",soil:"Black, loam",fert:"NPK 30:60:40 + rhizobium",tip:"Rhizobium + PSB seed treatment saves nitrogen."},
"Groundnut":{s:"Kharif/Zaid",sow:"Jun–Jul / Jan–Feb",harv:"Oct / May",water:"500–600 mm",soil:"Sandy loam, red",fert:"NPK 25:50:75 + gypsum",tip:"Apply gypsum after flowering for better pod filling."},
"Bajra":{s:"Kharif",sow:"Jun–Jul",harv:"Sep–Oct",water:"Low (~400 mm)",soil:"Sandy, arid",fert:"NPK 80:40:40",tip:"Drought-hardy — the best choice for low-rainfall belts."},
"Jowar":{s:"Kharif/Rabi",sow:"Jun–Jul / Sep–Oct",harv:"Oct / Feb",water:"Low–moderate",soil:"Black, red loam",fert:"NPK 80:40:40",tip:"Rabi jowar gives a good yield with just 2 irrigations."},
"Tur (Arhar)":{s:"Kharif",sow:"Jun–Jul",harv:"Dec–Jan",water:"Low–moderate",soil:"Black, loam",fert:"NPK 25:50:25 + rhizobium",tip:"Best when intercropped with cotton or soybean."},
"Gram (Chana)":{s:"Rabi",sow:"Oct–Nov",harv:"Feb–Mar",water:"1–2 irrigations",soil:"Black, loam",fert:"NPK 20:40:20 + rhizobium",tip:"Use wilt-resistant varieties and avoid excess water."},
"Mustard":{s:"Rabi",sow:"Sep–Oct",harv:"Feb–Mar",water:"1–2 irrigations",soil:"Loam, sandy loam",fert:"NPK 60:40:40 + sulphur",tip:"Sulphur increases oil content."},
"Potato":{s:"Rabi",sow:"Oct–Nov",harv:"Jan–Feb",water:"6–8 irrigations",soil:"Well-drained sandy loam",fert:"NPK 150:100:100",tip:"Follow earthing up and a late blight spray schedule."},
"Onion":{s:"Rabi/Kharif",sow:"Jun–Jul / Oct–Nov",harv:"4–5 months",water:"Moderate; stop before harvest",soil:"Well-drained loam",fert:"NPK 100:50:50 + sulphur",tip:"Stop irrigation 15 days before harvest — it improves storage life."},
"Moong":{s:"Zaid/Kharif",sow:"Mar–Apr",harv:"Jun",water:"Low (~350 mm)",soil:"Loam, sandy loam",fert:"NPK 20:40:20 + rhizobium",tip:"A short 60–65 day crop — a perfect fit in gaps."},
"Banana":{s:"Annual",sow:"Feb–Mar / Sep–Oct",harv:"11–14 months",water:"High; drip best",soil:"Deep alluvial, loam",fert:"High K; NPK 200:200:300",tip:"Sucker treatment plus drip fertigation can double the yield."},
"Coconut":{s:"Perennial",sow:"Jun–Jul",harv:"Year-round (after 5-7 years)",water:"Drip + basin",soil:"Laterite, coastal sand",fert:"Organic + NPK in basins",tip:"Mulching and intercropping (banana/pineapple) are recommended."}
};

const SEASONS={kharif:{name:"Kharif",when:"June–October (Monsoon)",desc:"Crops grown with the monsoon rains."},
 rabi:{name:"Rabi",when:"October–March (Winter)",desc:"Winter crops — less water, high quality grain."},
 zaid:{name:"Zaid",when:"March–June (Summer)",desc:"Short-duration summer crops and vegetables."}};

  return { PERSONAS: PERSONAS, STATES: STATES, CROPS: CROPS, SEASONS: SEASONS };
});
