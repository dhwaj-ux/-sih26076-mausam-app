/**
 * MAUSAM — persona-scoped CONTEXT builder.
 * Shared by the browser (standalone mode) and the Node backend.
 *
 * IMPORTANT: only the ACTIVE persona's data is included. Sending the full
 * agriculture context to every persona made the model answer everything like a
 * crop advisory — that bug is fixed here.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MAUSAM_CONTEXT = api;
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';

  var isNode = typeof module === 'object' && module.exports;
  var D = isNode ? require('./data.js') : root.MAUSAM_DATA;
  var E = isNode ? require('./engine.js') : root.MAUSAM_ENGINE;

  function buildContext(personaKey, bundle, profile) {
    bundle = bundle || {};
    profile = profile || { state: 'Maharashtra', land: 2 };
    var WX = bundle.weather || null, AQ = bundle.air || null, MAR = bundle.marine || null;

    E.setWeather(WX); E.setAir(AQ); E.setMarine(MAR);
    E.setPersona(personaKey); E.setProfile(profile.state, profile.land);

    var p = D.PERSONAS[personaKey];
    var out = [];
    out.push('ACTIVE PERSONA: ' + p.name + ' (' + p.tag + ')');
    out.push('Persona brief: ' + p.about);

    out.push('\n-- WEATHER (shared) --');
    if (WX) {
      out.push('City: ' + WX.city + (WX.state ? ', ' + WX.state : '') +
        ' | Temp ' + WX.temp + '\u00B0C (feels ' + WX.feels + '\u00B0C)' +
        ' | Humidity ' + WX.hum + '% | Wind ' + WX.wind + ' km/h' +
        ' | Rain now ' + WX.rain + 'mm' +
        ' | Rain next 3 days ' + Number(WX.rain3 || 0).toFixed(1) + 'mm' +
        ' | UV max ' + WX.duv[0]);
      out.push('Next 8h hourly: ' + E.nextHours(8).map(function (h) {
        return E.hhmm(h.t) + ' ' + h.temp + '\u00B0 ' + h.rain.toFixed(1) + 'mm ' + h.prob + '%';
      }).join(' | '));
      out.push('5-day: ' + WX.dtime.map(function (t, i) {
        return t + ' ' + Math.round(WX.dmax[i]) + '/' + Math.round(WX.dmin[i]) + '\u00B0 rain ' +
          Number(WX.dsum[i] || 0).toFixed(1) + 'mm';
      }).join(' | '));
    } else {
      out.push('Not loaded — tell the user to search their city on the Home tab.');
    }

    if (personaKey === 'agri') {
      var st = D.STATES[profile.state] || {};
      var sk = E.curSeason();
      out.push('\n-- AGRI CONTEXT --');
      out.push('State: ' + profile.state + ' | Soil: ' + (st.soil || '-') +
        ' | Season: ' + D.SEASONS[sk].name + ' (' + D.SEASONS[sk].when + ')');
      out.push('Kharif: ' + (st.kharif || []).join(', '));
      out.push('Rabi: ' + (st.rabi || []).join(', '));
      out.push('Zaid: ' + (st.zaid || []).join(', '));
      out.push('Tip: ' + (st.tip || ''));
      out.push('Land: ' + profile.land + ' acre');
    }
    if (personaKey === 'run') {
      var b = E.bestWindow();
      out.push('\n-- FITNESS CONTEXT --');
      out.push('Best outdoor window: ' + (b ? E.hhmm(b.from.t) + '-' + E.hhmm(b.to.t) +
        ' (feels ' + b.from.feels + '\u00B0C, AQI ' + (b.from.aqi != null ? b.from.aqi : (AQ ? AQ.aqi : '-')) +
        ', rain ' + b.from.rain.toFixed(1) + 'mm)' : 'n/a'));
      out.push('Heat risk: ' + (WX ? (WX.feels > 32 ? 'HIGH' : WX.feels > 27 ? 'MODERATE' : 'LOW') : 'n/a'));
    }
    if (personaKey === 'school' || personaKey === 'commute') {
      var rs = E.rainSummary(E.nextHours(3));
      out.push('\n-- NOWCAST CONTEXT --');
      out.push('Next 6h: ' + E.nextHours(6).map(function (h) {
        return E.hhmm(h.t) + ' ' + h.rain.toFixed(1) + 'mm ' + h.prob + '%';
      }).join(' | '));
      out.push('Rain next 3h: ' + (rs.wet ? rs.html : 'none expected'));
    }
    if (personaKey === 'school') {
      out.push('Best family outing day: ' + (WX ? E.bestDayText() : '-'));
    }
    if (personaKey === 'travel') {
      out.push('\n-- TRAVEL CONTEXT --');
      out.push('Suggested packing: ' + (WX ? E.packText() : '-'));
      out.push('Best travel day: ' + (WX ? E.bestDayText() : '-'));
      out.push('Delay risk factors: rain ' + (WX ? Number(WX.rain3).toFixed(1) : '-') +
        'mm next 3d, wind ' + (WX ? WX.wind : '-') + ' km/h');
    }
    if (personaKey === 'aqi') {
      out.push('\n-- AIR QUALITY CONTEXT --');
      out.push(AQ ? 'US AQI ' + AQ.aqi + ' (' + E.aqiCat(AQ.aqi).c + ') | PM2.5 ' + AQ.pm25 +
        ' \u00B5g/m\u00B3 | PM10 ' + AQ.pm10 + ' \u00B5g/m\u00B3' : 'AQI unavailable');
    }
    if (personaKey === 'beach') {
      out.push('\n-- MARINE CONTEXT --');
      if (MAR) {
        var t = E.tideInfo();
        out.push('Wave height ' + MAR.wave + ' m | Period ' + MAR.per + ' s | Swell ' + MAR.swell +
          ' m | Direction ' + E.dirName(MAR.dir) + ' | Sea temp ' + MAR.sst +
          '\u00B0C | Surf rating ' + E.surfRating(MAR.wave).c);
        out.push('Tides: ' + (t ? 'next high ' + (t.high ? E.hhmm(t.high.t) + ' (' + t.high.v.toFixed(2) + ' m)' : '-') +
          ', next low ' + (t.low ? E.hhmm(t.low.t) + ' (' + t.low.v.toFixed(2) + ' m)' : '-') +
          ', tide ' + (t.rising ? 'rising' : 'falling') : 'n/a'));
      } else {
        out.push('No marine data — inland location. Tell the user to search a coastal city.');
      }
    }
    if (personaKey === 'event') {
      var nc = E.nowComfort(), eb = E.bestEventWindow();
      out.push('\n-- EVENT COMFORT CONTEXT --');
      out.push('Comfort Index now: ' + (nc != null ? nc + '/100 (' + E.comfortInfo(nc).label + ')' : 'n/a'));
      out.push('Best event window (next 24h): ' + (eb ? E.hhmm(eb.t) + ' — comfort ' + eb.sc +
        '/100, rain ' + eb.prob + '%' : 'n/a'));
      out.push('5-day comfort: ' + (WX ? WX.dtime.map(function (t, i) {
        return t + ' ' + E.dayComfort(i);
      }).join(' | ') : 'n/a'));
    }
    if (['run', 'school', 'travel', 'commute'].indexOf(personaKey) !== -1) {
      out.push('Air quality: ' + (AQ ? 'AQI ' + AQ.aqi + ' (' + E.aqiCat(AQ.aqi).c + '), PM2.5 ' + AQ.pm25 : 'unavailable'));
    }

    return out.join('\n');
  }

  /**
   * Persona-locked system prompt.
   * Rule 2 is the fix for the "AI only talks about crops" bug: agriculture is
   * only in scope for the agriculture persona.
   */
  function systemPrompt(persona) {
    return [
      'You are "MAUSAM", a persona-based weather intelligence assistant inside the MAUSAM weather app (SIH26076).',
      '',
      'ACTIVE PERSONA: ' + persona.name + ' — ' + persona.about,
      'The user is a "' + persona.tag + '" type of person.',
      '',
      'HARD RULES — follow strictly:',
      '1. Answer ONLY as a ' + persona.name + ' expert. Every sentence must be useful to a "' + persona.tag + '" user.',
      '2. NEVER talk about farming, crops, soil, seeds, sowing, fertilizer, pesticides or mandi UNLESS the active persona is "Agriculture & Crop Advisory". This is critical — do not drift into agriculture for other personas.',
      '3. Do not answer for other personas. If the user asks something outside your persona, say in one line that you can switch persona, then give the closest useful answer.',
      '4. Use only the numbers present in the CONTEXT block. Never invent weather values.',
      '5. LANGUAGE OF THE ANSWER: always reply in ENGLISH ONLY. The user may write in Hindi (Devanagari), Hinglish or English — understand all three, but your final answer must be written in clear English.',
      '6. Be practical and specific: short bullet points, concrete numbers, timings and actions. Max ~200 words.',
    ].join('\n');
  }

  /** Minimal, safe markdown -> HTML for chat bubbles. */
  function markdownToHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.+?)\*/g, '<i>$1</i>')
      .replace(/^[-•]\s?(.+)$/gm, '<li>$1</li>')
      .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
      .replace(/<\/ul>\s*<ul>/g, '')
      .replace(/\n{2,}/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  return { buildContext: buildContext, systemPrompt: systemPrompt, markdownToHtml: markdownToHtml };
});
