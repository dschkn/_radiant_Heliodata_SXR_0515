#!/usr/bin/env node

/**
 * Dependency-free NASA DONKI snapshot updater.
 * Copyright © 2026 Dmitrii Shchukin. All rights reserved.
 */

import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const start = process.argv[2] || "2026-05-15";
const end = process.argv[3] || "2026-07-15";
const destination = process.argv[4] || path.join("data", "nasa_donki_latest.json");
const apiKey = process.env.NASA_API_KEY || "DEMO_KEY";

function isoDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return date;
}

function dayString(date) {
  return date.toISOString().slice(0, 10);
}

function splitRange(startDate, endDate) {
  const ranges = [];
  let cursor = isoDate(startDate);
  const finalDate = isoDate(endDate);

  while (cursor <= finalDate) {
    const chunkEnd = new Date(cursor);
    chunkEnd.setUTCDate(chunkEnd.getUTCDate() + 30);
    if (chunkEnd > finalDate) chunkEnd.setTime(finalDate.getTime());
    ranges.push([dayString(cursor), dayString(chunkEnd)]);
    cursor = new Date(chunkEnd);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return ranges;
}

function classToFlux(classType) {
  const match = /^([ABCMX])(\d+(?:\.\d+)?)$/i.exec(classType || "");
  if (!match) return null;
  const base = { A: 1e-8, B: 1e-7, C: 1e-6, M: 1e-5, X: 1e-4 }[match[1].toUpperCase()];
  return base * Number(match[2]);
}

function normalize(event) {
  return {
    id: event.flrID,
    begin_time: event.beginTime,
    peak_time: event.peakTime,
    end_time: event.endTime,
    class_type: event.classType,
    peak_flux_w_m2: classToFlux(event.classType),
    source_location: event.sourceLocation || null,
    active_region: event.activeRegionNum || null,
    goes_ratio: null,
    timing_quality: event.beginTime && event.endTime ? "complete" : "peak_only",
    provenance: "NASA_DONKI",
    linked_events: event.linkedEvents || [],
    instruments: event.instruments || []
  };
}

async function requestRange([from, to]) {
  const url = new URL("https://api.nasa.gov/DONKI/FLR");
  url.searchParams.set("startDate", from);
  url.searchParams.set("endDate", to);
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`NASA DONKI ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

const chunks = splitRange(start, end);
const responses = [];

for (const chunk of chunks) {
  responses.push(...await requestRange(chunk));
}

const unique = new Map();
for (const event of responses) unique.set(event.flrID, normalize(event));

const events = [...unique.values()].sort((a, b) =>
  new Date(a.peak_time || a.begin_time) - new Date(b.peak_time || b.begin_time)
);

const snapshot = {
  schema_version: 1,
  metadata: {
    title: "NASA DONKI solar flare snapshot",
    window_start: `${start}T00:00:00Z`,
    window_end: `${end}T23:59:59Z`,
    created_utc: new Date().toISOString(),
    completeness: "NASA DONKI API result",
    time_standard: "UTC",
    flux_unit: "W/m^2; derived from flare class when necessary"
  },
  events
};

await writeFile(destination, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(`Wrote ${events.length} events to ${destination}`);
