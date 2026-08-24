function stablefordPoints(grossScore, par, strokesReceived = 0) {
  const netDifference = grossScore - strokesReceived - par;
  return Math.max(0, 2 - netDifference);
}

function strokesForHole(courseHandicap, holeHandicap) {
  if (courseHandicap <= 0) {
    return 0;
  }

  const base = Math.floor(courseHandicap / 18);
  const extra = courseHandicap % 18;
  return base + (holeHandicap <= extra ? 1 : 0);
}

function parseNumbers(rawValue, count, minimum = 1) {
  const values = rawValue
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(Number);

  if (values.length !== count || values.some((value) => !Number.isInteger(value) || value < minimum)) {
    throw new Error(`Enter exactly ${count} whole numbers (minimum ${minimum}).`);
  }

  return values;
}

function getHoleHandicaps(expectedHoles, rawValue) {
  const value = rawValue.trim();

  if (!value) {
    return Array.from({ length: expectedHoles }, (_, index) => index + 1);
  }

  const values = value.split(/\s+/).map(Number);
  if (values.length !== expectedHoles || values.some((num) => !Number.isInteger(num) || num < 1)) {
    throw new Error("Stroke indexes must contain one positive number per hole.");
  }
  if (new Set(values).size !== values.length) {
    throw new Error("Hole stroke indexes cannot be repeated.");
  }

  return values;
}

function validatePars(pars) {
  if (pars.some((par) => ![3, 4, 5].includes(par))) {
    throw new Error("Par must be 3, 4, or 5 for every hole.");
  }
}

function validateScores(scores) {
  if (scores.some((score) => !Number.isInteger(score) || score < 1)) {
    throw new Error("Scores must be positive whole numbers for every hole.");
  }
}

function validateCourseData(course) {
  if (![9, 18].includes(course.holes)) {
    throw new Error("Course must contain 9 or 18 holes.");
  }

  const pars = parseNumbers(course.pars, course.holes, 1);
  validatePars(pars);
  getHoleHandicaps(course.holes, course.holeHandicaps);
}

function clearParErrors() {
  document.querySelectorAll(".par-input").forEach((input) => input.classList.remove("invalid-par"));
}

function markParErrors(individual) {
  if (!individual) {
    return;
  }

  document.querySelectorAll(".par-input").forEach((input) => {
    if (!["3", "4", "5"].includes(input.value)) {
      input.classList.add("invalid-par");
    }
  });
}

function updateNineSelection() {
  const isNineHoleCourse = Number(document.getElementById("holesSelect").value) === 9
    && document.getElementById("courseSelect").value;
  document.getElementById("nineSelectLabel").classList.toggle("hidden", !isNineHoleCourse);
}

function updateCustomCourseControls() {
  const isCustomCourse = !document.getElementById("courseSelect").value;
  document.getElementById("customCourseNameLabel").classList.toggle("hidden", !isCustomCourse);
  document.getElementById("saveCourseButton").classList.toggle("hidden", !isCustomCourse);
}

function updateAdvancedMode() {
  const advanced = document.getElementById("advancedInput").checked;
  document.getElementById("advancedOptions").classList.toggle("hidden", !advanced);
}

function switchToCustomCourseOnEdit() {
  const courseSelect = document.getElementById("courseSelect");
  if (!courseSelect.value) {
    return;
  }

  courseSelect.value = "";
  nineHoleEntrySource = null;
  activeNine = null;
  updateNineSelection();
  updateCustomCourseControls();
}

function applyNineSelection() {
  const nine = document.getElementById("nineSelect").value;
  if (!nine) {
    return;
  }

  if (nineHoleEntrySource && activeNine) {
    updateNineHoleSourceFromCurrent(activeNine);
  } else if (!nineHoleEntrySource) {
    nineHoleEntrySource = getEntryValues();
  }
  const source = nineHoleEntrySource || getEntryValues();
  const selectedEntries = Object.entries(source).reduce((values, [id, entries]) => {
    const entryValues = entries.trim().split(/\s+/).filter(Boolean);
    const start = nine === "second" ? 9 : 0;
    values[id] = entryValues.slice(start, start + 9).join(" ");
    return values;
  }, {});
  buildHoleRows(selectedEntries);
  activeNine = nine;
}

let nineHoleEntrySource = null;
let activeNine = null;

function getEntryValues() {
  return {
    pars: [...document.querySelectorAll(".par-input")].map((input) => input.value).join(" "),
    scores: [...document.querySelectorAll(".score-input")].map((input) => input.value).join(" "),
    holeHandicaps: [...document.querySelectorAll(".handicap-input")].map((input) => input.value).join(" ")
  };
}

function updateNineHoleSourceFromCurrent(nine) {
  if (!nineHoleEntrySource || !nine) {
    return;
  }

  const start = nine === "second" ? 9 : 0;
  const current = getEntryValues();
  Object.entries(current).forEach(([id, entries]) => {
    const currentEntries = entries.trim().split(/\s+/).filter(Boolean);
    const sourceEntries = nineHoleEntrySource[id].trim().split(/\s+/).filter(Boolean);
    currentEntries.slice(0, 9).forEach((entry, index) => {
      sourceEntries[start + index] = entry;
    });
    nineHoleEntrySource[id] = sourceEntries.join(" ");
  });
}

function restoreFullRoundEntries() {
  if (nineHoleEntrySource) {
    buildHoleRows(nineHoleEntrySource);
    nineHoleEntrySource = null;
  }
  activeNine = null;
}

function saveFullRoundEntries() {
  if (!nineHoleEntrySource) {
    nineHoleEntrySource = getEntryValues();
  }
}

function handleHolesChange() {
  const holes = Number(document.getElementById("holesSelect").value);
  const courseSelected = document.getElementById("courseSelect").value;

  if (holes === 9 && courseSelected) {
    saveFullRoundEntries();
  } else if (holes === 18) {
    restoreFullRoundEntries();
  }

  updateNineSelection();
  buildHoleRows();
}

function handleCourseChange() {
  applyCoursePreset();
  nineHoleEntrySource = null;
  activeNine = null;
  updateNineSelection();
  updateCustomCourseControls();
}

const coursePresets = {
  kalumbila: {
    pars: "4 3 5 3 4 5 4 3 5 4 4 3 4 5 4 5 4 3",
    holeHandicaps: "7 15 5 9 17 1 13 11 3 12 4 14 18 10 2 6 8 16"
  }
};

const customCourseCookieName = "stablefordCustomCourse";

function getSavedCustomCourse() {
  const cookie = document.cookie.split("; ").find((value) => value.startsWith(`${customCourseCookieName}=`));
  if (!cookie) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(cookie.split("=").slice(1).join("=")));
  } catch (error) {
    return null;
  }
}

function addSavedCourseOption(course) {
  const courseSelect = document.getElementById("courseSelect");
  const savedOption = document.getElementById("savedCourseOption");

  if (savedOption) {
    savedOption.remove();
  }

  const option = document.createElement("option");
  option.id = "savedCourseOption";
  option.value = "savedCustom";
  option.textContent = course.name;
  courseSelect.appendChild(option);
  coursePresets.savedCustom = course;
}

function loadSavedCustomCourse() {
  const savedCourse = getSavedCustomCourse();
  if (!savedCourse || !savedCourse.name || !savedCourse.pars || !savedCourse.holeHandicaps) {
    return;
  }

  try {
    validateCourseData(savedCourse);
    addSavedCourseOption(savedCourse);
  } catch (error) {
    return;
  }
}

function saveCustomCourse() {
  const errorMessage = document.getElementById("errorMessage");
  const name = document.getElementById("customCourseName").value.trim();
  const holes = Number(document.getElementById("holesSelect").value);

  try {
    if (!name) {
      throw new Error("Enter a name for the custom course.");
    }

    const pars = [...document.querySelectorAll(".par-input")].map((input) => Number(input.value));
    if (pars.length !== holes || pars.some((par) => !Number.isInteger(par))) {
      throw new Error(`Enter valid par values for all ${holes} holes.`);
    }
    validatePars(pars);
    const scores = [...document.querySelectorAll(".score-input")].map((input) => Number(input.value));
    if (scores.length !== holes) {
      throw new Error(`Enter valid scores for all ${holes} holes.`);
    }
    validateScores(scores);
    const holeHandicaps = getHoleHandicaps(
      holes,
      [...document.querySelectorAll(".handicap-input")].map((input) => input.value).join(" ")
    );

    const course = { name, holes, pars: pars.join(" "), holeHandicaps: holeHandicaps.join(" ") };
    document.cookie = `${customCourseCookieName}=${encodeURIComponent(JSON.stringify(course))}; max-age=31536000; path=/`;
    addSavedCourseOption(course);
    document.getElementById("courseSelect").value = "savedCustom";
    errorMessage.textContent = "";
  } catch (error) {
    errorMessage.textContent = error.message;
  }
}

function buildHoleRows(values = {}) {
  const firstNineRows = document.getElementById("firstNineRows");
  const secondNineRows = document.getElementById("secondNineRows");
  const secondNineTable = document.getElementById("secondNineTable");
  const holes = Number(document.getElementById("holesSelect").value);
  const pars = (values.pars || "").trim().split(/\s+/).filter(Boolean);
  const scores = (values.scores || "").trim().split(/\s+/).filter(Boolean);
  const holeHandicaps = (values.holeHandicaps || "").trim().split(/\s+/).filter(Boolean);

  firstNineRows.innerHTML = "";
  secondNineRows.innerHTML = "";
  secondNineTable.classList.toggle("hidden", holes === 9);

  for (let hole = 1; hole <= holes; hole += 1) {
    const row = document.createElement("tr");
    const par = pars.length === holes ? pars[hole - 1] : 4;
    const score = scores.length === holes ? scores[hole - 1] : 5;
    const holeHandicap = holeHandicaps.length === holes ? holeHandicaps[hole - 1] : hole;
    row.innerHTML = `
      <td>${hole}</td>
      <td><input class="par-input" type="number" min="3" step="1" value="${par}" aria-label="Par for hole ${hole}" /></td>
      <td><input class="handicap-input" type="number" min="1" step="1" value="${holeHandicap}" aria-label="Stroke index for hole ${hole}" /></td>
      <td><input class="score-input" type="number" min="1" step="1" value="${score}" aria-label="# strokes for hole ${hole}" /></td>
      <td class="points-output"></td>
      <td class="strokes-output"></td>
    `;
    (hole <= 9 ? firstNineRows : secondNineRows).appendChild(row);
  }
}

function applyCoursePreset() {
  const preset = coursePresets[document.getElementById("courseSelect").value];
  if (!preset) {
    return;
  }

  document.getElementById("holesSelect").value = String(preset.holes || 18);
  document.getElementById("nineSelect").value = "";
  buildHoleRows({ pars: preset.pars, holeHandicaps: preset.holeHandicaps });
}

function getScoringScores(pars, scores, holeHandicaps, courseHandicap, capScores) {
  if (!capScores) {
    return scores;
  }

  return scores.map((score, index) => {
    const received = strokesForHole(courseHandicap, holeHandicaps[index]);
    return Math.min(score, pars[index] + received + 2);
  });
}

function calculateScore(pars, scores, holeHandicaps, courseHandicap, capScores = false) {
  const scoringScores = getScoringScores(pars, scores, holeHandicaps, courseHandicap, capScores);

  return pars.map((par, index) => {
    const received = strokesForHole(courseHandicap, holeHandicaps[index]);
    return stablefordPoints(scoringScores[index], par, received);
  });
}

function renderResults(points, scores, advanced = false) {
  const results = document.getElementById("results");
  const total = points.reduce((sum, value) => sum + value, 0);
  const holes = points.length;

  document.querySelectorAll(".points-output").forEach((cell, index) => {
    cell.textContent = points[index] ?? "";
  });
  document.querySelectorAll(".strokes-output").forEach((cell, index) => {
    cell.textContent = scores[index] ?? "";
  });
  document.querySelectorAll(".strokes-output-column, .strokes-output").forEach((element) => {
    element.classList.toggle("hidden", !advanced);
  });
  const firstNinePoints = points.slice(0, 9).reduce((sum, value) => sum + value, 0);
  const secondNinePoints = points.slice(9).reduce((sum, value) => sum + value, 0);
  const firstNineStrokes = scores.slice(0, 9).reduce((sum, value) => sum + value, 0);
  const secondNineStrokes = scores.slice(9).reduce((sum, value) => sum + value, 0);
  document.querySelectorAll(".overall-total-row").forEach((row) => {
    row.classList.add("hidden");
  });
  ["secondNineOverallTotals", "secondNineTotalStrokes"].forEach((id) => {
    document.getElementById(id).classList.toggle("hidden", holes !== 18);
  });
  document.getElementById("firstNineTotalsLabel").textContent = holes === 9 ? "Nine-hole totals" : "Top nine totals";
  document.getElementById("firstNinePointsTotal").textContent = firstNinePoints;
  document.getElementById("secondNinePointsTotal").textContent = holes === 18 ? secondNinePoints : "";
  document.getElementById("firstNineStrokesTotal").textContent = firstNineStrokes;
  document.getElementById("secondNineStrokesTotal").textContent = holes === 18 ? secondNineStrokes : "";
  document.getElementById("secondNineOverallPoints").textContent = holes === 18 ? total : "";
  document.getElementById("secondNineOverallStrokes").textContent = holes === 18 ? scores.reduce((sum, value) => sum + value, 0) : "";

  results.innerHTML = "";
  results.classList.add("hidden");
}

function calculateRound() {
  const holes = Number(document.getElementById("holesSelect").value);
  const courseHandicap = Number(document.getElementById("courseHandicap").value || 0);
  const errorMessage = document.getElementById("errorMessage");
  const advanced = document.getElementById("advancedInput").checked;
  const capScores = advanced && document.getElementById("capScoresInput").checked;
  clearParErrors();

  try {
    let pars;
    let scores;
    let holeHandicaps;

    const holeData = Array.from(document.querySelectorAll(".par-input")).map((parInput, index) => {
      const par = Number(parInput.value);
      const scoreInput = document.querySelectorAll(".score-input")[index];
      const score = Number(scoreInput.value);
      return { par, score };
    });

    if (holeData.some(({ par, score }) => Number.isNaN(par) || Number.isNaN(score) || score < 1)) {
      throw new Error("Enter valid par and score values for every hole.");
    }

    pars = holeData.map(({ par }) => par);
    try {
      validatePars(pars);
    } catch (error) {
      markParErrors(true);
      throw error;
    }
    scores = holeData.map(({ score }) => score);
    validateScores(scores);
    holeHandicaps = getHoleHandicaps(
      holes,
      [...document.querySelectorAll(".handicap-input")].map((input) => input.value).join(" ")
    );

    const scoringScores = getScoringScores(pars, scores, holeHandicaps, courseHandicap, capScores);
    const points = calculateScore(pars, scores, holeHandicaps, courseHandicap, capScores);
    errorMessage.textContent = "";
    renderResults(points, scoringScores, advanced);
  } catch (error) {
    document.getElementById("results").classList.add("hidden");
    errorMessage.textContent = error.message;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const holesSelect = document.getElementById("holesSelect");
  const courseSelect = document.getElementById("courseSelect");
  const calculateButton = document.getElementById("calculateButton");
  const saveCourseButton = document.getElementById("saveCourseButton");
  const advancedInput = document.getElementById("advancedInput");

  loadSavedCustomCourse();
  updateCustomCourseControls();

  holesSelect.addEventListener("change", handleHolesChange);

  const nineSelect = document.getElementById("nineSelect");
  courseSelect.addEventListener("change", handleCourseChange);
  nineSelect.addEventListener("change", applyNineSelection);
  calculateButton.addEventListener("click", calculateRound);
  saveCourseButton.addEventListener("click", saveCustomCourse);
  advancedInput.addEventListener("change", updateAdvancedMode);

  document.addEventListener("input", (event) => {
    if (event.target.classList.contains("par-input")) {
      event.target.classList.remove("invalid-par");
      switchToCustomCourseOnEdit();
    } else if (event.target.classList.contains("handicap-input") || event.target.classList.contains("score-input")) {
      switchToCustomCourseOnEdit();
    }
  });

  buildHoleRows();
  updateNineSelection();
  updateAdvancedMode();
});
