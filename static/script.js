async function loadRooms() {
    const time = document.getElementById("timeInput").value;
    const building = document.getElementById("building").value;
    const capacity = document.getElementById("capacity").value;

    const container = document.getElementById("rooms");
    container.innerHTML = "";

    const buildingLinks = {
    "TFDL": "https://workrooms.ucalgary.ca/reserve/workrooms",
    "HSL": "https://workrooms.ucalgary.ca/reserve/hsl",
    "Gallagher": "https://workrooms.ucalgary.ca/reserve/gallagher",
    "EEEL": "https://workrooms.ucalgary.ca/reserve/eeel",
    "Law": "https://workrooms.ucalgary.ca/reserve/law"
}; //Links for each building

    try {
        const response = await fetch(
            `/api/rooms?time=${time}&building=${building}&capacity=${capacity}`
        );

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const rooms = await response.json();

        if (!rooms || rooms.length === 0) {
            container.innerHTML = `
                <p class="no-results">No rooms found. Try a different time or filter.</p>
            `;
            document.getElementById("updated").innerText = "";
            return;
        }

        rooms.forEach(room => {
            const card = document.createElement("div");
            card.classList.add("room-card");

            let statusClass = room.status;
            let statusText = "";

            if (room.status === "available") {
                statusText = "🟢 Available";
            } else if (room.status === "limited") {
                statusText = "🟡 Limited";
            } else {
                statusText = "🔴 Busy";
            }

            // Get the specific link for this building, or a default one if not found
            const bookingUrl = buildingLinks[room.building] || "https://workrooms.ucalgary.ca/";

            card.innerHTML = `
            <h3>${room.name}</h3>
            <p>${room.building}</p>
            <p>Capacity: ${room.capacity}</p>
            <p class="status ${room.status}">${statusText}</p>
            <a href="${bookingUrl}" target="_blank" class="book-btn">Book Now</a>
            `;

            container.appendChild(card);
        });

        document.getElementById("updated").innerText =
            "Last updated: " + new Date().toLocaleTimeString();
    } catch (error) {
        container.innerHTML = `
            <p class="no-results">Error loading rooms: ${error.message}</p>
        `;
        document.getElementById("updated").innerText = "";
    }
}

function bookRoom(roomName) {
    window.open(
        "https://library.ucalgary.ca/services/bookings/workrooms",
        "_blank"
    );
}

// Load on page start
loadRooms();
