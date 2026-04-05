from flask import Flask, render_template, request, jsonify
import requests

app = Flask(__name__)

API_URL = "https://workrooms.ucalgary.ca/spaces/availability/grid"

# Hardcoded rooms with direct booking URLs
def get_all_rooms():
    return [
        {
            "name": "TFDL Small Workrooms (4-6)",
            "itemId": 9580,
            "checksum": "365c334fb074aaceeb243197e34ff729",
            "booking_url": "https://workrooms.ucalgary.ca/reserve/workrooms"
        },
        {
            "name": "TFDL Large Meeting Rooms (6+)",
            "itemId": 7556,
            "checksum": "612045f86a0099e8eeaac89d00e96de0",
            "booking_url": "https://workrooms.ucalgary.ca/reserve/meeting-rooms"
        },
        {
            "name": "HSL",
            "itemId": 9600,
            "checksum": "64042d2d0f4cc599720899d59722d691",
            "booking_url": "https://workrooms.ucalgary.ca/reserve/hsl-workrooms"
        },
        {
            "name": "Gallagher Library",
            "itemId": 34486,
            "checksum": "50d75a93f6a0068a9bfb9a57ccef39f8",
            "booking_url": "https://workrooms.ucalgary.ca/reserve/gallagher"
        },
        {
            "name": "Lab NEXT",
            "itemId": 9549,
            "checksum": "eed16f7092b81755bbb777bc81516ee5",
            "booking_url": "https://workrooms.ucalgary.ca/reserve/labnext-workrooms"
        }
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

            available = resp_json.get("available", False)

            # Use the hardcoded booking URL
            results.append({
                "name": room["name"],
                "available": available,
                "booking_url": room["booking_url"]
            })
        except:
            # fallback if API fails
            results.append({
                "name": room["name"],
                "available": False,
                "booking_url": room["booking_url"]
            })

    return jsonify(results)

if __name__ == "__main__":
    app.run(debug=True)