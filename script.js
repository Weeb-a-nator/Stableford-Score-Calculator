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
  document.getElementById("parsInput").classList.remove("invalid-par");
  document.querySelectorAll(".par-input").forEach((input) => input.classList.remove("invalid-par"));
}

function markParErrors(individual) {
  if (!individual) {
    document.getElementById("parsInput").classList.add("invalid-par");
    return;
  }

  document.querySelectorAll(".par-input").forEach((input) => {
    if (!["3", "4", "5"].includes(input.value)) {
      input.classList.add("invalid-par");
    }
  });
}

function limitTextareaEntries(textarea, maximumEntries) {
  const entries = textarea.value.trim().split(/\s+/).filter(Boolean);
  if (entries.length > maximumEntries) {
    textarea.value = entries.slice(0, maximumEntries).join(" ");
  }
}

function selectNineEntries(textarea, nine) {
  const entries = textarea.value.trim().split(/\s+/).filter(Boolean);
  if (entries.length >= 18) {
    const start = nine === "second" ? 9 : 0;
    textarea.value = entries.slice(start, start + 9).join(" ");
  }
}

function requiresNineSelection() {
  return Number(document.getElementById("holesSelect").value) === 9
    && document.getElementById("courseSelect").value
    && !document.getElementById("nineSelect").value;
}

function updateEntryLimits() {
  const holes = Number(document.getElementById("holesSelect").value);
  if (requiresNineSelection()) {
    return;
  }

  ["parsInput", "scoresInput", "holeHandicaps", "individualHandicaps"].forEach((id) => {
    limitTextareaEntries(document.getElementById(id), holes);
  });
}

function updateScorePlaceholder() {
  const holes = Number(document.getElementById("holesSelect").value);
  const scoreExamples = holes === 9
    ? "5 4 6 3 5 4 5 4 4"
    : "5 4 6 3 5 4 5 4 4 7 5 4 6 4 5 3 5 4";
  const parExamples = holes === 9
    ? "4 4 5 3 4 4 5 3 4"
    : "4 4 5 3 4 4 5 3 4 4 5 3 4 4 5 3 4 4";
  document.getElementById("parsInput").placeholder = `Example: ${parExamples}`;
  document.getElementById("scoresInput").placeholder = `Example: ${scoreExamples}`;
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
  const bulkInput = document.getElementById("bulkInput");
  if (!advanced) {
    bulkInput.checked = false;
  }
  document.getElementById("advancedOptions").classList.toggle("hidden", !advanced);
  updateEntryMode();
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
  if (requiresNineSelection()) {
    return;
  }

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
  setEntryValues(selectedEntries);
  if (!document.getElementById("bulkInput").checked) {
    buildHoleRows();
  }
  activeNine = nine;
  updateEntryLimits();
}

let nineHoleEntrySource = null;
let activeNine = null;

function getEntryValues() {
  const values = {
    parsInput: document.getElementById("parsInput").value,
    scoresInput: document.getElementById("scoresInput").value,
    holeHandicaps: document.getElementById("holeHandicaps").value,
    individualHandicaps: document.getElementById("individualHandicaps").value
  };

  if (!document.getElementById("bulkInput").checked) {
    values.parsInput = [...document.querySelectorAll(".par-input")].map((input) => input.value).join(" ");
    values.scoresInput = [...document.querySelectorAll(".score-input")].map((input) => input.value).join(" ");
  }

  return values;
}

function setEntryValues(values) {
  Object.entries(values).forEach(([id, value]) => {
    document.getElementById(id).value = value;
  });
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
    setEntryValues(nineHoleEntrySource);
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
  updateEntryLimits();
  if (!document.getElementById("bulkInput").checked) {
    buildHoleRows();
  }
}

function handleCourseChange() {
  applyCoursePreset();
  nineHoleEntrySource = null;
  activeNine = null;
  updateNineSelection();
  updateCustomCourseControls();
  updateEntryLimits();
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

    let pars;
    let holeHandicaps;
    if (!document.getElementById("bulkInput").checked) {
      pars = [...document.querySelectorAll(".par-input")].map((input) => Number(input.value));
      if (pars.length !== holes || pars.some((par) => !Number.isInteger(par))) {
        throw new Error(`Enter valid par values for all ${holes} holes.`);
      }
      validatePars(pars);
      const scores = [...document.querySelectorAll(".score-input")].map((input) => Number(input.value));
      if (scores.length !== holes) {
        throw new Error(`Enter valid scores for all ${holes} holes.`);
      }
      validateScores(scores);
      holeHandicaps = getHoleHandicaps(holes, document.getElementById("individualHandicaps").value);
      pars = pars.join(" ");
    } else {
      const parsedPars = parseNumbers(document.getElementById("parsInput").value, holes, 1);
      validatePars(parsedPars);
      pars = parsedPars.join(" ");
      holeHandicaps = getHoleHandicaps(holes, document.getElementById("holeHandicaps").value).join(" ");
    }

    const course = { name, holes, pars, holeHandicaps };
    document.cookie = `${customCourseCookieName}=${encodeURIComponent(JSON.stringify(course))}; max-age=31536000; path=/`;
    addSavedCourseOption(course);
    document.getElementById("courseSelect").value = "savedCustom";
    errorMessage.textContent = "";
  } catch (error) {
    errorMessage.textContent = error.message;
  }
}

function buildHoleRows() {
  const holeRows = document.getElementById("holeRows");
  const holes = Number(document.getElementById("holesSelect").value);
  const pars = document.getElementById("parsInput").value.trim().split(/\s+/).filter(Boolean);
  const scores = document.getElementById("scoresInput").value.trim().split(/\s+/).filter(Boolean);

  holeRows.innerHTML = "";

  for (let hole = 1; hole <= holes; hole += 1) {
    const row = document.createElement("tr");
    const par = pars.length === holes ? pars[hole - 1] : 4;
    const score = scores.length === holes ? scores[hole - 1] : 5;
    row.innerHTML = `
      <td>${hole}</td>
      <td><input class="par-input" type="number" min="3" step="1" value="${par}" aria-label="Par for hole ${hole}" /></td>
      <td><input class="score-input" type="number" min="1" step="1" value="${score}" aria-label="Score for hole ${hole}" /></td>
    `;
    holeRows.appendChild(row);
  }
}

function syncIndividualEntries() {
  const pars = [...document.querySelectorAll(".par-input")].map((input) => input.value);
  const scores = [...document.querySelectorAll(".score-input")].map((input) => input.value);
  if (pars.length && scores.length) {
    document.getElementById("parsInput").value = pars.join(" ");
    document.getElementById("scoresInput").value = scores.join(" ");
  }
}

function updateEntryMode() {
  const isIndividual = !document.getElementById("bulkInput").checked;
  const bulkEntry = document.getElementById("bulkEntry");
  const individualEntry = document.getElementById("individualEntry");

  bulkEntry.classList.toggle("hidden", isIndividual);
  individualEntry.classList.toggle("hidden", !isIndividual);

  if (isIndividual) {
    buildHoleRows();
  } else {
    syncIndividualEntries();
  }
}

function applyCoursePreset() {
  const preset = coursePresets[document.getElementById("courseSelect").value];
  if (!preset) {
    return;
  }

  document.getElementById("holesSelect").value = String(preset.holes || 18);
  document.getElementById("nineSelect").value = "";
  document.getElementById("parsInput").value = preset.pars;
  document.getElementById("holeHandicaps").value = preset.holeHandicaps;
  document.getElementById("individualHandicaps").value = preset.holeHandicaps;

  if (!document.getElementById("bulkInput").checked) {
    buildHoleRows();
    document.querySelectorAll(".par-input").forEach((input, index) => {
      input.value = preset.pars.split(" ")[index];
    });
  }
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

  const holeList = points.map((point, index) => `<span>H${index + 1}: ${point}</span>`).join(" ");

  let extraSummary = "";
  if (holes === 18) {
    const firstNine = scores.slice(0, 9).reduce((sum, value) => sum + value, 0);
    const secondNine = scores.slice(9).reduce((sum, value) => sum + value, 0);
    const totalStrokes = scores.reduce((sum, value) => sum + value, 0);
    extraSummary = `
      <h2>First 9 strokes: ${firstNine}</h2>
      <h2>Second 9 strokes: ${secondNine}</h2>
      <h2>Total strokes: ${totalStrokes}</h2>
    `;
  } else {
    const totalStrokes = scores.reduce((sum, value) => sum + value, 0);
    extraSummary = `<h2>Total strokes: ${totalStrokes}</h2>`;
  }

  const advancedSummary = advanced ? `
    <h2>Strokes for each hole</h2>
    <div class="summary">${scores.map((score, index) => `<span>H${index + 1}: ${score}</span>`).join(" ")}</div>
  ` : "";

  results.innerHTML = `
    <h2>Hole-by-hole points</h2>
    <div class="summary">${holeList}</div>
    <div class="result-spacer"></div>
    <h2>Stableford total: ${total} points</h2>
    <div class="result-spacer"></div>
    ${advancedSummary}
    <div class="result-spacer"></div>
    ${extraSummary}
  `;

  results.classList.remove("hidden");
}

function calculateRound() {
  const holes = Number(document.getElementById("holesSelect").value);
  const courseHandicap = Number(document.getElementById("courseHandicap").value || 0);
  const errorMessage = document.getElementById("errorMessage");
  const individual = !document.getElementById("bulkInput").checked;
  const advanced = document.getElementById("advancedInput").checked;
  const capScores = advanced && document.getElementById("capScoresInput").checked;
  clearParErrors();

  try {
    let pars;
    let scores;
    let holeHandicaps;

    if (individual) {
      const rows = [...document.querySelectorAll(".hole-row")];
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
      holeHandicaps = getHoleHandicaps(holes, document.getElementById("individualHandicaps").value);
    } else {
      pars = parseNumbers(document.getElementById("parsInput").value, holes, 1);
      try {
        validatePars(pars);
      } catch (error) {
        markParErrors(false);
        throw error;
      }
      scores = parseNumbers(document.getElementById("scoresInput").value, holes, 1);
      validateScores(scores);
      holeHandicaps = getHoleHandicaps(holes, document.getElementById("holeHandicaps").value);
    }

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
  const bulkInput = document.getElementById("bulkInput");
  const calculateButton = document.getElementById("calculateButton");
  const saveCourseButton = document.getElementById("saveCourseButton");
  const advancedInput = document.getElementById("advancedInput");

  loadSavedCustomCourse();
  updateCustomCourseControls();

  holesSelect.addEventListener("change", handleHolesChange);
  holesSelect.addEventListener("change", updateScorePlaceholder);

  const nineSelect = document.getElementById("nineSelect");
  courseSelect.addEventListener("change", handleCourseChange);
  nineSelect.addEventListener("change", applyNineSelection);
  bulkInput.addEventListener("change", updateEntryMode);
  calculateButton.addEventListener("click", calculateRound);
  saveCourseButton.addEventListener("click", saveCustomCourse);
  advancedInput.addEventListener("change", updateAdvancedMode);

  ["parsInput", "scoresInput", "holeHandicaps", "individualHandicaps"].forEach((id) => {
    document.getElementById(id).addEventListener("input", updateEntryLimits);
  });
  ["parsInput", "holeHandicaps", "individualHandicaps"].forEach((id) => {
    document.getElementById(id).addEventListener("input", switchToCustomCourseOnEdit);
  });
  document.getElementById("parsInput").addEventListener("input", clearParErrors);
  document.addEventListener("input", (event) => {
    if (event.target.classList.contains("par-input")) {
      event.target.classList.remove("invalid-par");
      switchToCustomCourseOnEdit();
    } else if (event.target.id === "individualHandicaps") {
      switchToCustomCourseOnEdit();
    }
  });

  updateEntryMode();
  updateNineSelection();
  updateEntryLimits();
  updateScorePlaceholder();
  updateAdvancedMode();
});
