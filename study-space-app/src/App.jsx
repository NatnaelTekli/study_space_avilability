import React, { useState, useEffect } from 'react';

export default function RoomFinder() {
  // 1. State variables for input fields
  const [time, setTime] = useState("12:00 PM");
  const [building, setBuilding] = useState("TFDL");
  const [capacity, setCapacity] = useState("4");

  // 2. State variables for results, timestamps, and errors
  const [rooms, setRooms] = useState([]);
  const [lastUpdated, setLastUpdated] = useState("");
  const [error, setError] = useState(null);

  const buildingLinks = {
    "TFDL": "https://workrooms.ucalgary.ca/reserve/workrooms",
    "HSL": "https://workrooms.ucalgary.ca/reserve/hsl",
    "Gallagher": "https://workrooms.ucalgary.ca/reserve/gallagher",
    "EEEL": "https://workrooms.ucalgary.ca/reserve/eeel",
    "Law": "https://workrooms.ucalgary.ca/reserve/law"
  };

  // 3. Main fetch function
  const loadRooms = async () => {
    setError(null);
    try {
      const response = await fetch(
        `/api/rooms?time=${time}&building=${building}&capacity=${capacity}`
      );

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      setRooms(data || []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message);
      setRooms([]);
      setLastUpdated("");
    }
  };

  // Run on component mount (equivalent to loadRooms() at page start)
  useEffect(() => {
    loadRooms();
  }, []);

  // Helper logic for booking URLs
  const getBookingUrl = (room) => {
    let bookingUrl = buildingLinks[room.building] || "https://workrooms.ucalgary.ca/";
    if (room.building === "TFDL") {
      if (room.name === "150A (Capacity 4)") {
        bookingUrl = "https://workrooms.ucalgary.ca/space/9578";
      }
    }
    return bookingUrl;
  };

  // Helper logic for status text
  const getStatusText = (status) => {
    if (status === "available") return "🟢 Available";
    if (status === "limited") return "🟡 Limited";
    return "🔴 Busy";
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>UCalgary Workroom Finder</h1>

      {/* Input Controls */}
      <div style={{ marginBottom: "20px", display: "flex", gap: "10px", alignItems: "center" }}>
        <label>
          Time:{" "}
          <input
            type="text"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>

        <label>
          Building:{" "}
          <select
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
          >
            <option value="TFDL">TFDL</option>
            <option value="HSL">HSL</option>
            <option value="Gallagher">Gallagher</option>
            <option value="EEEL">EEEL</option>
            <option value="Law">Law</option>
          </select>
        </label>

        <label>
          Capacity:{" "}
          <input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </label>

        <button onClick={loadRooms}>Check Rooms</button>
      </div>

      {/* Last Updated Timestamp */}
      {lastUpdated && <p id="updated">Last updated: {lastUpdated}</p>}

      {/* Error State */}
      {error && <p className="no-results" style={{ color: "red" }}>Error loading rooms: {error}</p>}

      {/* Rooms Container */}
      <div id="rooms">
        {!error && rooms.length === 0 && (
          <p className="no-results">No rooms found. Try a different time or filter.</p>
        )}

        {rooms.map((room, index) => {
          const bookingUrl = getBookingUrl(room);
          const statusText = getStatusText(room.status);

          return (
            <div key={index} className="room-card" style={{ border: "1px solid #ddd", padding: "15px", marginBottom: "10px", borderRadius: "5px" }}>
              <h3>{room.name}</h3>
              <p>{room.building}</p>
              <p>Capacity: {room.capacity}</p>
              <p className={`status ${room.status}`}>{statusText}</p>
              <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className="book-btn">
                Book Now
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}