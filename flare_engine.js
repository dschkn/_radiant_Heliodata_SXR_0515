/*
 * _radiant_Heliodata_SXR_0515
 * Deterministic Max JavaScript control engine
 * Copyright © 2026 Dmitrii Shchukin. All rights reserved.
 */

autowatch = 1;
inlets = 1;
outlets = 4;

setoutletassist(0, "synthesis control messages");
setoutletassist(1, "normalized flux profile");
setoutletassist(2, "jit.cellblock messages");
setoutletassist(3, "status text");

var DEFAULT_DATA = "data/flare_events_2026-05-15_2026-07-15.json";
var events = [];
var metadata = {};
var selectedIndex = 0;
var durationMinutes = 4.0;
var playIndex = 0;
var weights = [];
var weightSum = 1.0;
var timelineTask = null;
var taskOwner = this;

function loadbang() {
    initialise();
}

function initialise() {
    stopTask();
    if (!loadData(DEFAULT_DATA)) {
        installFallbackData();
        status("READY / FALLBACK DATA / " + events.length + " EVENTS");
    } else {
        status("READY / " + events.length + " EVENTS / " + shortWindow());
    }
    refreshDisplays();
    if (events.length > 0) emitEvent(selectedIndex, true, false);
}

function reload() {
    initialise();
}

function loadData(relativePath) {
    var absolutePath = resolvePath(relativePath);
    var file = new File(absolutePath, "read");
    if (!file.isopen) {
        post("_radiant_Heliodata: cannot open " + absolutePath + "\n");
        return false;
    }

    var source = "";
    while (file.position < file.eof) {
        source += file.readline(32768);
    }
    file.close();

    try {
        var parsed = JSON.parse(source);
        metadata = parsed.metadata || {};
        events = sanitiseEvents(parsed.events || []);
        sortEvents(events);
        selectedIndex = clamp(selectedIndex, 0, Math.max(0, events.length - 1));
        calculateWeights();
        return events.length > 0;
    } catch (error) {
        post("_radiant_Heliodata: JSON error: " + error + "\n");
        return false;
    }
}

function resolvePath(relativePath) {
    var patchPath = "";
    try {
        patchPath = this.patcher.filepath || "";
    } catch (ignore) {
        patchPath = "";
    }
    if (!patchPath) return relativePath;
    var slash = Math.max(patchPath.lastIndexOf("/"), patchPath.lastIndexOf("\\"));
    if (slash < 0) return relativePath;
    return patchPath.substring(0, slash + 1) + relativePath;
}

function sanitiseEvents(input) {
    var output = [];
    var i;
    for (i = 0; i < input.length; i++) {
        if (input[i] && input[i].class_type && (input[i].peak_time || input[i].begin_time)) {
            output.push(input[i]);
        }
    }
    return output;
}

function sortEvents(list) {
    list.sort(function (a, b) { return eventTime(a) - eventTime(b); });
}

function installFallbackData() {
    metadata = { window_start: "2026-05-15T00:00:00Z", window_end: "2026-07-15T23:59:59Z" };
    events = [
        fallback("FALLBACK-X1", "2026-06-03T11:28:00Z", "X1.0", 1.0e-4, "NASA"),
        fallback("FALLBACK-M67", "2026-07-03T18:11:00Z", "M6.7", 6.7e-5, "NASA"),
        fallback("FALLBACK-M42", "2026-07-07T04:02:00Z", "M4.2", 4.2e-5, "NOAA"),
        fallback("FALLBACK-C33", "2026-07-15T10:20:00Z", "C3.3", 3.3e-6, "NOAA")
    ];
    selectedIndex = 0;
    calculateWeights();
}

function fallback(id, peak, classType, flux, source) {
    return { id: id, peak_time: peak, class_type: classType, peak_flux_w_m2: flux, provenance: source };
}

function duration(value) {
    durationMinutes = clamp(Number(value) || 4.0, 0.5, 30.0);
    status("TIMELINE DURATION / " + durationMinutes.toFixed(1) + " MIN");
}

function choose(value) {
    if (!events.length) return;
    selectedIndex = clamp(Math.floor(Number(value) || 0), 0, events.length - 1);
    emitEvent(selectedIndex, true, false);
}

function bang() {
    play();
}

function play() {
    if (!events.length) {
        status("NO DATA / PRESS RELOAD");
        return;
    }
    stopTask();
    playIndex = 0;
    status("PLAYING TIMELINE / " + durationMinutes.toFixed(1) + " MIN");
    timelineStep();
}

function timelineStep() {
    if (playIndex >= events.length) {
        timelineTask = null;
        outlet(0, "release", 1600);
        outlet(0, "progress", 1.0);
        status("TIMELINE COMPLETE / " + events.length + " EVENTS");
        return;
    }

    var current = playIndex;
    selectedIndex = current;
    emitEvent(current, false, true);
    playIndex += 1;

    var delay;
    if (playIndex < events.length) {
        delay = clamp((weights[current] / weightSum) * durationMinutes * 60000.0, 250.0, 90000.0);
    } else {
        delay = 3200.0;
    }
    timelineTask = new Task(timelineStep, taskOwner);
    timelineTask.schedule(delay);
}

function focus() {
    if (!events.length) return;
    stopTask();
    emitEvent(selectedIndex, true, true);
    status("FOCUS / " + eventLabel(events[selectedIndex], selectedIndex));
}

function stop() {
    stopTask();
    outlet(0, "release", 400);
    status("STOPPED");
}

function stopTask() {
    if (timelineTask) {
        timelineTask.cancel();
        timelineTask = null;
    }
}

function refreshDisplays() {
    emitFluxProfile();
    emitTable();
}

function calculateWeights() {
    weights = [];
    weightSum = 0.0;
    if (events.length < 2) {
        weights.push(1.0);
        weightSum = 1.0;
        return;
    }
    var i;
    for (i = 0; i < events.length - 1; i++) {
        var gapHours = Math.max(0.001, (eventTime(events[i + 1]) - eventTime(events[i])) / 3600000.0);
        var weight = Math.log(1.0 + gapHours);
        weights.push(weight);
        weightSum += weight;
    }
    weights.push(0.5);
    weightSum += 0.5;
}

function emitEvent(index, previewOnly, triggerEnvelope) {
    var flare = events[index];
    if (!flare) return;

    var flux = Number(flare.peak_flux_w_m2) || classToFlux(flare.class_type);
    var normalized = fluxNorm(flux);
    var seed = hashString(flare.id || flare.peak_time || String(index));
    var registerBias = latitudeBias(flare.source_location, seed);
    var baseFrequency = 42.0 * Math.pow(2.0, 4.45 * normalized + registerBias);
    var difference = 0.6 + (seed % 180) / 100.0 + normalized * 4.2;
    var frequencyA = clamp(baseFrequency, 34.0, 7600.0);
    var frequencyB = clamp(baseFrequency + difference, 35.0, 7700.0);
    var highFrequency = clamp(3900.0 + normalized * 8800.0 + (seed % 800), 3900.0, 15500.0);
    var noiseAmplitude = 0.006 + Math.pow(normalized, 1.4) * 0.18;
    var pulseInterval = Math.round(clamp(720.0 - normalized * 640.0 + (seed % 71), 45.0, 790.0));
    var peakAmplitude = 0.11 + normalized * 0.31;
    var filterFrequency = 550.0 + normalized * 9800.0;
    var pan = longitudePan(flare.source_location, seed);
    var leftGain = Math.sqrt((1.0 - pan) * 0.5);
    var rightGain = Math.sqrt((1.0 + pan) * 0.5);
    var wet = 0.015 + normalized * 0.065;
    var envelope = envelopeTimes(flare, normalized, previewOnly);
    var progress = events.length > 1 ? index / (events.length - 1.0) : 0.0;

    outlet(0, "freq1", frequencyA);
    outlet(0, "freq2", frequencyB);
    outlet(0, "freq3", highFrequency);
    outlet(0, "noise", noiseAmplitude);
    outlet(0, "filter", filterFrequency);
    outlet(0, "pulse", pulseInterval);
    outlet(0, "pan", leftGain, rightGain);
    outlet(0, "wet", wet);
    outlet(0, "progress", progress);
    outlet(0, "current", index);
    if (triggerEnvelope) outlet(0, "env", peakAmplitude, envelope.attack, envelope.decay);
    status(eventLabel(flare, index) + " / NORM " + normalized.toFixed(3));
}

function envelopeTimes(flare, normalized, focusMode) {
    var total = focusMode ? 18000.0 + normalized * 10000.0 : 1200.0 + normalized * 4300.0;
    var attackRatio = 0.28;
    if (flare.begin_time && flare.peak_time && flare.end_time) {
        var begin = Date.parse(flare.begin_time);
        var peak = Date.parse(flare.peak_time);
        var end = Date.parse(flare.end_time);
        if (end > begin && peak >= begin && peak <= end) {
            attackRatio = clamp((peak - begin) / (end - begin), 0.08, 0.82);
        }
    } else {
        attackRatio = 0.16 + normalized * 0.22;
    }
    return { attack: Math.round(total * attackRatio), decay: Math.round(total * (1.0 - attackRatio)) };
}

function emitFluxProfile() {
    var profile = [];
    var i;
    for (i = 0; i < events.length; i++) {
        profile.push(fluxNorm(Number(events[i].peak_flux_w_m2) || classToFlux(events[i].class_type)));
    }
    outlet(1, profile);
}

function emitTable() {
    outlet(2, "clear", "all");
    outlet(2, "cols", 6);
    outlet(2, "rows", events.length + 1);
    var headers = ["#", "UTC PEAK", "CLASS", "FLUX W/M2", "REGION", "SOURCE"];
    var col;
    for (col = 0; col < headers.length; col++) outlet(2, "set", col, 0, headers[col]);
    var row;
    for (row = 0; row < events.length; row++) {
        var flare = events[row];
        var flux = Number(flare.peak_flux_w_m2) || classToFlux(flare.class_type);
        outlet(2, "set", 0, row + 1, row);
        outlet(2, "set", 1, row + 1, compactDate(flare.peak_time || flare.begin_time));
        outlet(2, "set", 2, row + 1, flare.class_type);
        outlet(2, "set", 3, row + 1, exponential(flux));
        outlet(2, "set", 4, row + 1, flare.active_region || "-");
        outlet(2, "set", 5, row + 1, flare.provenance || "-");
    }
}

function eventTime(item) { return Date.parse(item.peak_time || item.begin_time); }

function classToFlux(classType) {
    var match = /^([ABCMX])(\d+(?:\.\d+)?)$/i.exec(classType || "");
    if (!match) return 1.0e-8;
    var bases = { A: 1.0e-8, B: 1.0e-7, C: 1.0e-6, M: 1.0e-5, X: 1.0e-4 };
    return bases[match[1].toUpperCase()] * Number(match[2]);
}

function fluxNorm(flux) {
    var value = Math.log(Math.max(1.0e-8, Number(flux))) / Math.LN10;
    return clamp((value + 8.0) / 4.0, 0.0, 1.0);
}

function longitudePan(location, seed) {
    var match = /[NS]\d{1,2}([EW])(\d{1,3})/i.exec(location || "");
    if (match) {
        var sign = match[1].toUpperCase() === "E" ? -1.0 : 1.0;
        return clamp(sign * Number(match[2]) / 90.0, -1.0, 1.0);
    }
    return ((seed % 101) / 100.0 - 0.5) * 0.8;
}

function latitudeBias(location, seed) {
    var match = /^([NS])(\d{1,2})/i.exec(location || "");
    if (match) return (match[1].toUpperCase() === "N" ? 1 : -1) * Number(match[2]) / 180.0;
    return ((seed % 31) - 15) / 180.0;
}

function hashString(value) {
    var hash = 2166136261;
    var i;
    for (i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return Math.abs(hash >>> 0);
}

function eventLabel(flare, index) {
    var region = flare.active_region ? " / AR " + flare.active_region : "";
    return pad(index, 2) + " / " + compactDate(flare.peak_time || flare.begin_time) + " / " + flare.class_type + region;
}

function compactDate(value) { return String(value || "-").replace("T", " ").replace(":00Z", "Z"); }
function exponential(value) { return isFinite(value) ? Number(value).toExponential(2) : "-"; }
function shortWindow() {
    var start = metadata.window_start ? metadata.window_start.slice(0, 10) : "-";
    var end = metadata.window_end ? metadata.window_end.slice(0, 10) : "-";
    return start + " / " + end;
}
function pad(value, width) {
    var text = String(value);
    while (text.length < width) text = "0" + text;
    return text;
}
function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }
function status(text) { outlet(3, text); }
