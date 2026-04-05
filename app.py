from flask import Flask, jsonify, request, render_template
import requests
import datetime

app = Flask(__name__)

# -----------------------------------
# CONFIG
# -----------------------------------
API_URL = "https://workrooms.ucalgary.ca/spaces/availability/grid"

DEFAULT_PAYLOAD = {
    "lid": "1035",
    "gid": "7947",
    "eid": "-1",
    "seat": "0",
    "seatId": "0",
    "zone": "0",
    "pageIndex": "0",
    "pageSize": "18"
}

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Referer": "https://workrooms.ucalgary.ca/",
    "Content-Type": "application/x-www-form-urlencoded"
}

# -----------------------------------
# PROCESS REAL DATA
# -----------------------------------
def process_slots(data, selected_hour=None):
    rooms = {}

    for slot in data.get("slots", []):
        room_id = slot["itemId"]

        if room_id not in rooms:
            rooms[room_id] = {
                "name": f"Room {room_id}",
                "available": 0,
                "total": 0,
                "matching_available": 0,
                "matching_total": 0
            }

        start_time = slot["start"]
        hour = int(start_time.split(" ")[1].split(":")[0])

        is_booked = slot.get("className") == "s-lc-eq-checkout"

        rooms[room_id]["total"] += 1
        if not is_booked:
            rooms[room_id]["available"] += 1

        # If user selected a specific time
        if selected_hour is not None:
            if hour == selected_hour:
                rooms[room_id]["matching_total"] += 1
                if not is_booked:
                    rooms[room_id]["matching_available"] += 1

    result = []

    for room_id, room in rooms.items():

        # Use specific time if selected
        if selected_hour is not None and room["matching_total"] > 0:
            ratio = room["matching_available"] / room["matching_total"]
        else:
            ratio = room["available"] / room["total"]

        if ratio > 0.7:
            status = "available"
        elif ratio > 0.3:
            status = "limited"
        else:
            status = "busy"

        result.append({
            "name": room["name"],
            "capacity": 4,  # placeholder for now
            "building": "TFDL",
            "status": status,
            "available_slots": room["available"],
            "total_slots": room["total"]
        })

    return result

# -----------------------------------
# FALLBACK (if API fails)
# -----------------------------------
def fallback_data():
    return [
        {"name": "150A (Capacity 4)", "capacity": 4, "building": "TFDL", "status": "available"},
        {"name": "TFDL 310B", "capacity": 6, "building": "TFDL", "status": "limited"},
        {"name": "Science 115", "capacity": 6, "building": "Science", "status": "busy"}
    ]

# -----------------------------------
# ROUTES
# -----------------------------------

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/rooms")
def get_rooms():
    try:
        # Get user-selected time and filters
        time_str = request.args.get("time")
        building_filter = request.args.get("building")
        capacity_filter = request.args.get("capacity")

        selected_hour = None
        if time_str:
            selected_hour = int(time_str.split(":")[0])

        today = datetime.date.today().strftime("%Y-%m-%d")

        payload = DEFAULT_PAYLOAD.copy()
        payload["start"] = today
        payload["end"] = today

        response = requests.post(API_URL, data=payload, headers=HEADERS, timeout=5)
        raw_data = response.json()

        if not raw_data.get("slots"):
            return jsonify(fallback_data())

        rooms = process_slots(raw_data, selected_hour)

        if building_filter:
            rooms = [room for room in rooms if room["building"] == building_filter]

        if capacity_filter:
            try:
                required_capacity = int(capacity_filter)
                rooms = [room for room in rooms if room["capacity"] >= required_capacity]
            except ValueError:
                pass

        return jsonify(rooms)

    except Exception as e:
        print("API failed:", e)
        return jsonify(fallback_data())

# -----------------------------------
# RUN
# -----------------------------------
if __name__ == "__main__":
    app.run(debug=True)