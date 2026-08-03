function parseRoomAvailability(jsonData) {
    // Map through each object, checking for the className indicator
    const statusString = jsonData.map(item => {
        if (item.className === "s-lc-eq-checkout") {
            return "X"; // Booked / Checked out
        } else {
            return "0"; // Available / No checkout indicator
        }
    }).join(""); // Combine the array elements into a single string

    return statusString;
}

async function getGridData() {
    try {
        const formData = new URLSearchParams();
        formData.append('lid', '1035');
        formData.append('gid', '2456');
        formData.append('eid', '9578'); //-1 //typcially changes
        formData.append('seat', '0');
        formData.append('seatId', '0');
        formData.append('zone', '0');
        formData.append('start', '2026-08-03'); //start getting the availability from this date (not inclusive)
        formData.append('end', '2026-08-09'); //get all the availability up to this date (not inclusive)
        formData.append('pageIndex', '0');
        formData.append('pageSize', '18');

        const response = await fetch('https://workrooms.ucalgary.ca/spaces/availability/grid', {
            method: 'POST',
            headers: { // Copies directly the browser's Request Headers tab:
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0',
                'Referer': 'https://workrooms.ucalgary.ca/reserve/workrooms',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        const slotsArray = data.slots || [];//data.events || [];

        const statusByItem = slotsArray.reduce((acc, item) => {
            // Make sure the item and itemId exist
            if (!item || item.itemId === undefined) return acc; //item id corresponds to the room number

            const id = item.itemId;
            const status = item.className === "s-lc-eq-checkout" ? "❌" : "✅";
            
            // Extract just the time part (e.g., "11:00:00") from "2026-08-05 11:00:00"
            const parts = item.start ? item.start.split(" ") : ["", ""];
            const date = parts[0]; // e.g., "2026-08-05"
            const time = parts[1]; // e.g., "11:00:00"

            // Initialize the array for this itemId if it doesn't exist yet
            if (!acc[id]) {
                acc[id] = [];
            }

            // Push an object containing both the time and status
            acc[id].push({
                date: date,
                time: time,
                status: status
            });

            return acc;
        }, {});

        console.log(statusByItem);
        console.log("Parsed Status String: ", statusString);
    } catch (error) {
        console.error("Failed:", error);
    }
}

getGridData();