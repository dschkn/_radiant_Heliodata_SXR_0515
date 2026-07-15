/*
 * _radiant_Heliodata_SXR_0515 — deterministic Max JS control engine
 * Copyright © 2026 Dmitrii Shchukin. All rights reserved.
 */

autowatch = 1;
inlets = 1;
outlets = 4;

setoutletassist(0, "synthesis control messages");
setoutletassist(1, "normalized flux profile list");
setoutletassist(2, "jit.cellblock messages");
setoutletassist(3, "status text");

var DEFAULT_DATA = "data/flare_events_2026-05-15_2026-07-15.json";
var events = [];
var metadata = {};
var selectedIndex = 0;
var durationMinutes = 4.0;
var playIndex = 0;
var timelineWeights = [];
var timelineWeightSum = 1.0;
var timelineTask = null;
var loadedPath = "";

function loadbang() {
    load(DEFAULT_DATA);
}

function resolvePath(relativePath) {
    if (!relativePath) return relativePath;
    if (/^(\/|[A-Za-z]:[\\\/])/.test(relativePath)) return relativePath;

    var patchPath = this.patcher && this.patcher.filepath ? this.patcher.filepath : "";
    if (!patchPath) return relativePath;
    return patchPath.replace(/[^\\\/]+$/, "") + relativePath;
}

function load(pathValue) {
    stop();
    var path = arrayfromargs(arguments).join(" ") || DEFAULT_DATA;
    var absolutePath = resolvePath(path);
    var file = new File(absolutePath, "read");

    if (!file.isopen) {
        outlet(3, "DATA ERROR | cannot open " + path);
        post("_radiant_Heliodata: cannot open " + absolutePath + "\n");
        return;
    }

    var source = "";
    while (file.position < file.eof) source += file.readline(32768);
    file.close();

    try {
        var parsed = JSON.parse(source);
        metadata = parsed.metadata || {};
        events = (parsed.events || []).filter(validEvent);
        events.sort(compareEvents);
        loadedPath = path;
        selectedIndex = clamp(selectedIndex, 0, Math.max(0, events.length - 1));
        computeTimelineWeights();
        emitFluxProfile();
        emitTable();
        outlet(0, "eventmax", Math.max(0, events.length - 1));
        outlet(3, "READY | " + events.length + " EVENTS | " + shortWindow());
        if (events.length) emitEvent(selectedIndex, false, true);
    } catch (error) {
        events = [];
        outlet(3, "DATA ERROR | invalid JSON");
        post("_radiant_Heliodata JSON error: " + error + "\n");
    }
}

function validEvent(event) {
    return event && event.class_type && (event.peak_time || event.begin_time);
}

function compareEvents(a, b) {
    return eventTime(a) - eventTime(b);
}

function eventTime(event) {
    return Date.parse(event.peak_time || event.begin_time);
}

function duration(value) {
    durationMinutes = clamp(Number(value) || 4.0, 0.5, 30.0);
    outlet(3, "TIMELINE DURATION | " + durationMinutes.toFixed(1) + " MIN");
}

function event(value) {
    if (!events.length) return;
    selectedIndex = clamp(Math.floor(Number(value) || 0), 0, events.length - 1);
    emitEvent(selectedIndex, false, true);
}

function bang() {
    play();
}

function play() {
    if (!events.length) {
        outlet(3, "NO DATA LOADED");
        return;
    }
    stop(false);
    playIndex = 0;
    outlet(3, "PLAYING TIMELINE | " + durationMinutes.toFixed(1) + " MIN");
    timelineStep();
}

function timelineStep() {
    if (playIndex >= events.length) {
        timelineTask = null;
        outlet(0, "release", 1800);
        outlet(0, "progress", 1.0);
        outlet(3, "TIMELINE COMPLETE | " + events.length + " EVENTS");
        return;
    }

    var current = playIndex;
    selectedIndex = current;
    emitEvent(current, false, false);
    playIndex += 1;

    if (playIndex < events.length) {
        var fraction = timelineWeights[current] / timelineWeightSum;
        var delay = clamp(fraction * durationMinutes * 60000.0, 180.0, 90000.0);
        timelineTask = new Task(timelineStep, this);
        timelineTask.schedule(delay);
    } else {
        timelineTask = new Task(timelineStep, this);
        timelineTask.schedule(3500);
    }
}

function focus(value) {
    if (arguments.length) event(value);
    if (!events.length) return;
    stop(false);
    emitEvent(selectedIndex, true, false);
    outlet(3, "FOCUS | " + eventLabel(events[selectedIndex], selectedIndex));
}

function stop(showStatus) {
    if (timelineTask) {
        timelineTask.cancel();
        timelineTask = null;
    }
    outlet(0, "release", 500);
    if (showStatus !== false) outlet(3, "STOPPED");
}

function computeTimelineWeights() {
    timelineWeights = [];
    timelineWeightSum = 0.0;
    if (events.length < 2) {
        timelineWeights.push(1.0);
        timelineWeightSum = 1.0;
        return;
    }

    var i;
    for (i = 0; i < events.length - 1; i++) {
        var gapHours = Math.max(0.001, (eventTime(events[i + 1]) - eventTime(events[i])) / 3600000.0);
        var weight = Math.log(1.0 + gapHours);
        timelineWeights.push(weight);
        timelineWeightSum += weight;
    }
    timelineWeights.push(0.5);
    timelineWeightSum += 0.5;
}

function emitEvent(index, focusMode, previewOnly) {
    var flare = events[index];
    if (!flare) return;

    var flux = Number(flare.peak_flux_w_m2) || classToFlux(flare.class_type);
    var normalized = fluxNorm(flux);
    var seed = hashString(flare.id || flare.peak_time || String(index));
    var registerBias = latitudeBias(flare.source_location, seed);
    var baseFrequency = 38.0 * Math.pow(2.0, 4.7 * normalized + registerBias);
    var difference = 0.55 + (seed % 170) / 100.0 + normalized * 4.8;
    var frequencyA = clamp(baseFrequency, 32.0, 7800.0);
    var frequencyB = clamp(baseFrequency + difference, 33.0, 7900.0);
    var highFrequency = clamp(4200.0 + normalized * 9200.0 + (seed % 900), 4200.0, 16500.0);
    var noiseAmplitude = 0.008 + Math.pow(normalized, 1.45) * 0.23;
    var pulseInterval = Math.round(clamp(690.0 - normalized * 625.0 + (seed % 61), 38.0, 760.0));
    var peakAmplitude = 0.10 + normalized * 0.34;
    var filterFrequency = 600.0 + normalized * 10400.0;
    var pan = longitudePan(flare.source_location, seed);
    var leftGain = Math.sqrt((1.0 - pan) * 0.5);
    var rightGain = Math.sqrt((1.0 + pan) * 0.5);
    var wet = 0.018 + normalized * 0.075;
    var envelope = envelopeTimes(flare, normalized, focusMode);
    var progress = events.length > 1 ? index / (events.length - 1.0) : 0.0;

    outlet(0, "sine1", frequencyA);
    outlet(0, "sine2", frequencyB);
    outlet(0, "sine3", highFrequency);
    outlet(0, "noise", noiseAmplitude);
    outlet(0, "click", pulseInterval);
    outlet(0, "filter", filterFrequency);
    outlet(0, "pan", leftGain, rightGain);
    outlet(0, "wet", wet);
    outlet(0, "progress", progress);
    outlet(0, "current", index);

    if (!previewOnly) outlet(0, "env", peakAmplitude, envelope.attack, envelope.decay);

    outlet(3, eventLabel(flare, index) + " | NORM " + normalized.toFixed(3));
}

function envelopeTimes(flare, normalized, focusMode) {
    var total = focusMode ? 28000.0 + normalized * 12000.0 : 1400.0 + normalized * 5200.0;
    var attackRatio = 0.32;

    if (flare.begin_time && flare.peak_time && flare.end_time) {
        var begin = Date.parse(flare.begin_time);
        var peak = Date.parse(flare.peak_time);
        var end = Date.parse(flare.end_time);
        if (end > begin && peak >= begin && peak <= end) attackRatio = clamp((peak - begin) / (end - begin), 0.08, 0.82);
    } else {
        attackRatio = 0.18 + normalized * 0.20;
    }

    return {
        attack: Math.round(total * attackRatio),
        decay: Math.round(total * (1.0 - attackRatio))
    };
}

function emitFluxProfile() {
    var profile = [];
    var i;
    for (i = 0; i < events.length; i++) {
        var flux = Number(events[i].peak_flux_w_m2) || classToFlux(events[i].class_type);
        profile.push(fluxNorm(flux));
    }
    outlet(1, profile);
}

function emitTable() {
    outlet(2, "clear", "all");
    outlet(2, "cols", 6);
    outlet(2, "rows", events.length + 1);

    var headers = ["#", "UTC PEAK", "CLASS", "FLUX W/m2", "REGION", "SOURCE"];
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
        outlet(2, "set", 4, row + 1, flare.active_region || "—");
        outlet(2, "set", 5, row + 1, flare.provenance || "—");
    }
}

function classToFlux(classType) {
    var match = /^([ABCMX])(\d+(?:\.\d+)?)$/i.exec(classType || "");
    if (!match) return 1e-8;
    var bases = { A: 1e-8, B: 1e-7, C: 1e-6, M: 1e-5, X: 1e-4 };
    return bases[match[1].toUpperCase()] * Number(match[2]);
}

function fluxNorm(flux) {
    var value = Math.log(Math.max(1e-8, Number(flux))) / Math.LN10;
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
    var region = flare.active_region ? " | AR " + flare.active_region : "";
    return pad(index, 2) + " | " + compactDate(flare.peak_time || flare.begin_time) + " | " + flare.class_type + region;
}

function compactDate(value) {
    return String(value || "—").replace("T", " ").replace(":00Z", "Z");
}

function exponential(value) {
    if (!isFinite(value)) return "—";
    return Number(value).toExponential(2);
}

function shortWindow() {
    var start = metadata.window_start ? metadata.window_start.slice(0, 10) : "—";
    var end = metadata.window_end ? metadata.window_end.slice(0, 10) : "—";
    return start + " / " + end;
}

function pad(value, width) {
    var text = String(value);
    while (text.length < width) text = "0" + text;
    return text;
}

function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
}
