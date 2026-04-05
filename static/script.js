async function loadRooms() {
    const dateInput = document.getElementById("dateInput").value;
    const timeInput = document.getElementById("timeInput").value;
    const buildingFilter = document.getElementById("building").value;
    const container = document.getElementById("rooms");

    if (!dateInput || !timeInput) {
        container.innerHTML = "<p>Please select date and time first.</p>";
        return;
    }

    container.innerHTML = "<div class='loader'>Checking availability...</div>";

    const start = `${dateInput} ${timeInput}:00`;
    const end = new Date(new Date(start).getTime() + 60*60*1000).toISOString().slice(0, 19).replace('T', ' ');

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
            card.className = `room-card ${room.available ? 'available' : 'busy'}`;

            const statusEmoji = room.available ? "🟢" : "🔴";
            const statusText = room.available ? "AVAILABLE" : "OCCUPIED";

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