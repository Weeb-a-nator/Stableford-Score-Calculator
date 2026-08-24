"""Command-line Stableford golf score calculator."""

import json
from pathlib import Path


SAVED_COURSE_FILE = Path.home() / ".stableford_custom_course.json"
COURSE_PRESETS = {
	"Trident Country Club course": {
		"holes": 18,
		"pars": [4, 3, 5, 3, 4, 5, 4, 3, 5, 4, 4, 3, 4, 5, 4, 5, 4, 3],
		"hole_handicaps": [7, 15, 5, 9, 17, 1, 13, 11, 3, 12, 4, 14, 18, 10, 2, 6, 8, 16],
	},
}


def stableford_points(gross_score: int, par: int, strokes_received: int = 0) -> int:
	"""Return Stableford points for one hole using the net score."""
	net_difference = gross_score - strokes_received - par
	return max(0, 2 - net_difference)


def strokes_for_hole(course_handicap: int, hole_handicap: int) -> int:
	"""Distribute a course handicap according to each hole's stroke index."""
	if course_handicap <= 0:
		return 0
	base, extra = divmod(course_handicap, 18)
	return base + (1 if hole_handicap <= extra else 0)


def calculate_score(pars, scores, hole_handicaps, course_handicap, cap_scores=False):
	"""Calculate each hole's points, optionally capping zero-point scores."""
	points = []
	for par, score, hole_handicap in zip(pars, scores, hole_handicaps):
		received = strokes_for_hole(course_handicap, hole_handicap)
		if cap_scores:
			score = min(score, par + received + 2)
		points.append(stableford_points(score, par, received))
	return points


def effective_scores(pars, scores, hole_handicaps, course_handicap, cap_scores=False):
	if not cap_scores:
		return list(scores)
	return [
		min(score, par + strokes_for_hole(course_handicap, hole_handicap) + 2)
		for par, score, hole_handicap in zip(pars, scores, hole_handicaps)
	]


def validate_pars(pars, holes=None):
	if holes is not None and len(pars) != holes:
		raise ValueError(f"Enter exactly {holes} par values.")
	if any(par not in (3, 4, 5) for par in pars):
		raise ValueError("Par must be 3, 4, or 5 for every hole.")


def validate_scores(scores, holes=None):
	if holes is not None and len(scores) != holes:
		raise ValueError(f"Enter exactly {holes} scores.")
	if any(not isinstance(score, int) or score < 1 for score in scores):
		raise ValueError("Scores must be positive whole numbers for every hole.")


def validate_hole_handicaps(hole_handicaps, holes=None):
	if holes is not None and len(hole_handicaps) != holes:
		raise ValueError(f"Enter exactly {holes} hole stroke indexes.")
	if any(not isinstance(index, int) or index < 1 for index in hole_handicaps):
		raise ValueError("Stroke indexes must be positive whole numbers.")
	if len(set(hole_handicaps)) != len(hole_handicaps):
		raise ValueError("Hole stroke indexes cannot be repeated.")


def validate_course(course):
	holes = course.get("holes")
	pars = course.get("pars")
	hole_handicaps = course.get("hole_handicaps")
	if holes not in (9, 18) or not isinstance(pars, list) or not isinstance(hole_handicaps, list):
		raise ValueError("Course must contain valid 9- or 18-hole data.")
	validate_pars(pars, holes)
	validate_hole_handicaps(hole_handicaps, holes)


def read_numbers(prompt, count, minimum=1, allowed=None, default=None):
	while True:
		try:
			raw_value = input(prompt).strip()
			values = list(default) if not raw_value and default is not None else [int(value) for value in raw_value.split()]
			if len(values) != count or any(value < minimum for value in values):
				raise ValueError
			if allowed is not None and any(value not in allowed for value in values):
				raise ValueError
			return values
		except ValueError:
			allowed_text = " (allowed: " + ", ".join(map(str, allowed)) + ")" if allowed else ""
			print(f"Enter exactly {count} whole numbers (minimum {minimum}){allowed_text}.")


def read_yes_no(prompt, default=False):
	answer = input(prompt).strip().lower()
	return answer == "y" if answer else default


def load_saved_course():
	try:
		course = json.loads(SAVED_COURSE_FILE.read_text(encoding="utf-8"))
		validate_course(course)
		return course
	except (OSError, json.JSONDecodeError, TypeError, ValueError):
		return None


def save_custom_course(course):
	validate_course(course)
	SAVED_COURSE_FILE.write_text(json.dumps(course), encoding="utf-8")


def choose_course():
	saved_course = load_saved_course()
	options = [("Custom course", None), *COURSE_PRESETS.items()]
	if saved_course:
		options.append((saved_course["name"], saved_course))

	print("\nCourses:")
	for number, (name, _) in enumerate(options, start=1):
		print(f"{number}. {name}")
	while True:
		try:
			choice = int(input(f"Choose a course (1-{len(options)}): "))
			if 1 <= choice <= len(options):
				return options[choice - 1]
		except ValueError:
			pass
		print("Choose one of the listed course numbers.")


def get_course_data(course_name, course, holes):
	if course is None:
		custom_name = input("Custom course name: ").strip() or "Custom course"
		pars = read_numbers(f"Enter the par for each of the {holes} holes: ", holes, 1, (3, 4, 5))
		hole_handicaps = read_numbers(
			f"Enter hole stroke indexes, or press Enter for 1..{holes}: ",
			holes,
			1,
			default=list(range(1, holes + 1)),
		)
		course = {"name": custom_name, "holes": holes, "pars": pars, "hole_handicaps": hole_handicaps}
		validate_course(course)
		if read_yes_no("Remember this custom course? (y/N): "):
			save_custom_course(course)
		return course

	validate_course(course)
	if course["holes"] == 9 and holes == 18:
		holes = 9
	if holes == 9 and course["holes"] == 18:
		nine = ""
		while nine not in ("first", "second"):
			nine = input("Choose the first or second nine: ").strip().lower()
		start = 9 if nine == "second" else 0
		return {
			"name": course_name,
			"holes": 9,
			"pars": course["pars"][start:start + 9],
			"hole_handicaps": course["hole_handicaps"][start:start + 9],
		}
	return {
		**course,
		"pars": list(course["pars"]),
		"hole_handicaps": list(course["hole_handicaps"]),
	}


def main():
	print("Stableford Score Calculator")
	holes = read_numbers("Number of holes (9 or 18) [18]: ", 1, allowed=(9, 18), default=[18])[0]
	course_name, selected_course = choose_course()
	course = get_course_data(course_name, selected_course, holes)
	holes = course["holes"]
	pars = course["pars"]
	hole_handicaps = course["hole_handicaps"]
	individual_holes = read_yes_no("Enter each hole individually? (y/N): ")

	if individual_holes:
		scores = []
		for hole, par in enumerate(pars, start=1):
			pars[hole - 1] = read_numbers(
				f"Hole {hole} par [{par}]: ", 1, 1, (3, 4, 5), [par]
			)[0]
			scores.append(read_numbers(f"Hole {hole} score: ", 1, 1)[0])
	else:
		pars = read_numbers("Enter the par for each hole: ", len(pars), 1, (3, 4, 5), pars)
		scores = read_numbers("Enter your score for each hole: ", len(pars), 1)

	course_handicap = read_numbers("Course handicap [0]: ", 1, 0, default=[0])[0]
	advanced = read_yes_no("Advanced mode? (y/N): ")
	cap_scores = read_yes_no("Cap scores at the zero-point maximum? (y/N): ") if advanced else False
	validate_pars(pars, holes)
	validate_scores(scores, holes)
	validate_hole_handicaps(hole_handicaps, holes)
	points = calculate_score(pars, scores, hole_handicaps, course_handicap, cap_scores)
	displayed_scores = effective_scores(pars, scores, hole_handicaps, course_handicap, cap_scores)

	print("\nHole:   " + " ".join(f"{i:2}" for i in range(1, holes + 1)))
	print("Points: " + " ".join(f"{point:2}" for point in points))
	print(f"\nStableford total: {sum(points)} points")
	print(f"Total strokes: {sum(displayed_scores)}")
	if advanced:
		print("Strokes for each hole: " + " ".join(f"H{index}: {score}" for index, score in enumerate(displayed_scores, start=1)))


if __name__ == "__main__":
	main()
