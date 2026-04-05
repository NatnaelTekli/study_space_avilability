from flask import Flask, render_template, request, jsonify
import requests

app = Flask(__name__)

# Endpoint to fetch all rooms dynamically from API
API_URL = "https://workrooms.ucalgary.ca/spaces/availability/grid"

# Example: Fetch initial rooms data from API or a "room list" endpoint
# For this example, we simulate a dynamic fetch
def get_all_rooms():
    # Ideally, the API provides a room listing endpoint; otherwise, maintain a dynamic cache
    # Here we simulate fetching dynamic room list
    return [
        {"name": "TFDL Small Workrooms (4-6)", "itemId": 9580, "checksum": "365c334fb074aaceeb243197e34ff729"},
        {"name": "TFDL Large Meeting Rooms (6+)", "itemId": 7556, "checksum": "612045f86a0099e8eeaac89d00e96de0"},
        {"name": "HSL", "itemId": 9600, "checksum": "64042d2d0f4cc599720899d59722d691"},
        {"name": "Gallagher Library", "itemId": 34486, "checksum": "50d75a93f6a0068a9bfb9a57ccef39f8"},
        {"name": "Lab NEXT", "itemId": 9549, "checksum": "eed16f7092b81755bbb777bc81516ee5"}
    ]


@app.route('/')
def index():
    return render_template("index.html")


@app.route('/check', methods=['POST'])
def check_availability():
    data = request.json
    start_time = data.get("start")
    end_time = data.get("end")

    rooms = get_all_rooms()
    results = []

    for room in rooms:
        payload = {
            "start": start_time,
            "end": end_time,
            "itemId": room["itemId"],
            "checksum": room["checksum"]
        }

        try:
            response = requests.post(API_URL, json=payload)
            resp_json = response.json()

            # Example: API returns {"available": true/false, "booking_url": "..."}
            available = resp_json.get("available", False)
            booking_url = resp_json.get("booking_url", "#")  # fallback if URL is not provided

            results.append({
                "name": room["name"],
                "available": available,
                "booking_url": booking_url
            })
        except Exception as e:
            results.append({
                "name": room["name"],
                "available": False,
                "booking_url": "#",
                "error": str(e)
            })

    return jsonify(results)


if __name__ == "__main__":
    app.run(debug=True)