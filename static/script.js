async function loadRooms() {
    const dateInput = document.getElementById("dateInput").value;
    const timeInput = document.getElementById("timeInput").value;
    const buildingFilter = document.getElementById("building").value;
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
        const response = await fetch('/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start, end })
        });

        const rooms = await response.json();
        container.innerHTML = "";

        const filteredRooms = buildingFilter
            ? rooms.filter(r => r.name.toLowerCase().includes(buildingFilter.toLowerCase()))
            : rooms;

        if (filteredRooms.length === 0) {
            container.innerHTML = "<p>No rooms available at this time.</p>";
            return;
        }

        filteredRooms.forEach(room => {
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
            bookingUrl = buildingLinks[room.building] || "https://workrooms.ucalgary.ca/";

            // Override logic for TFDL
            if (room.building === "TFDL") {
                if (room.name == "150A (Capacity 4)") {
                    bookingUrl = "https://workrooms.ucalgary.ca/space/9578";
                } else {
                    bookingUrl = buildingLinks[room.building];
                }
            }
                    
            card.innerHTML = `
                <h3>${room.name}</h3>
                <p>Time: ${start} - ${end}</p>
                <div class="status-badge">${statusEmoji} ${statusText}</div>
                ${room.available ? `<a href="${room.booking_url}" target="_blank" class="book-btn">Book Room</a>` 
                                   : `<button class="book-btn disabled" disabled>Unavailable</button>`}
            `;
            container.appendChild(card);
        });

    } catch (e) {
        console.error(e);
        container.innerHTML = "<p>Error connecting to the server. Please try again.</p>";
    }
}