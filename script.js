async function loadRooms() {
    const time = document.getElementById("timeInput").value;
    const building = document.getElementById("building").value;
    const capacity = document.getElementById("capacity").value;

    const response = await fetch(
        `/api/rooms?time=${time}&building=${building}&capacity=${capacity}`
    );

    const rooms = await response.json();

    const container = document.getElementById("rooms");
    container.innerHTML = "";

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

        card.innerHTML = `
            <h3>${room.name}</h3>
            <p>${room.building}</p>
            <p>Capacity: ${room.capacity}</p>
            <p class="status ${statusClass}">${statusText}</p>
            <button onclick="bookRoom('${room.name}')">Book Now</button>
        `;

        container.appendChild(card);
    });

    document.getElementById("updated").innerText =
        "Last updated: " + new Date().toLocaleTimeString();
}

function bookRoom(roomName) {
    window.open(
        "https://library.ucalgary.ca/services/bookings/workrooms",
        "_blank"
    );
}

// Load on page start
loadRooms();