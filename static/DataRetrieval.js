var roomNames = {}

async function parseExternalPageForTitle(itemId) {
    const link = 'https://workrooms.ucalgary.ca/space/' + itemId; // Replace with the actual URL pattern
    try {
        // Fetch the raw HTML of a page
        if (!roomNames[itemId]) { // Check if the room name is not already cached
            //doing these helps so that we don't have to keep fetching the same page over and over again
            roomNames[itemId] = true;
            const response = await fetch(link); // Replace with the actual URL pattern
            const htmlText = await response.text();

            // return roomName;
            // 1. Find where 'var resources =' starts in the HTML text
            const startIndex = htmlText.indexOf('var resources =');
            if (startIndex === -1) {
                console.log("Resources variable not found in HTML.");
                return [];
            }

            const subString = htmlText.slice(startIndex);
            const nextVarIndex = subString.indexOf('\nvar ');
            const resourcesCode = nextVarIndex !== -1 ? subString.slice(0, nextVarIndex) : subString;

            const match = await resourcesCode.match(/var\s+resources\s*=\s*([\s\S]*?);/);
            if (!match) return [];

            try {
                const resourcesArray = await new Function(`return ${match[1]};`)(); //evaluate the textblock as an actual section of code (dictionary)

                // Map through each resource object and extract the 'title' property
                const titles = await resourcesArray.map(resource => resource.title);
                const firstTitle = titles[0];
                
                roomNames[itemId] = firstTitle; // Cache the title for future use

                return firstTitle
            } catch (error) {
                console.error("Failed to parse resources script block:", error);
                return [];
            }
        } else {
            return roomNames[itemId]; //get the title corresponding to the itemId 
        }
        
    } catch (error) {
        console.error("Failed to parse HTML:", error);
        return itemId;
    }
}

export async function getGridData() {
    try {
        const formData = new URLSearchParams();
        formData.append('lid', '1035');
        formData.append('gid', '2456');
        formData.append('eid', '9578'); //-1 //typcially changes
        formData.append('seat', '0');
        formData.append('seatId', '0');
        formData.append('zone', '0');
        formData.append('start', '2026-08-07'); //start getting the availability from this date (not inclusive)
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

        const statusByItem = {};
        for (const item of slotsArray) {
            // Make sure the item and itemId exist
            if (!item || item.itemId === undefined) continue; //item id corresponds to the room number

            const id = item.itemId;
            const title = await parseExternalPageForTitle(id); // Fetch the room name from the external page
            const status = item.className === "s-lc-eq-checkout" ? "❌" : "✅";
            
            // Extract just the time part (e.g., "11:00:00") from "2026-08-05 11:00:00"
            const parts = item.start ? item.start.split(" ") : ["", ""];
            const date = parts[0]; // e.g., "2026-08-05"
            const rawTime = parts[1]; // e.g., "11:00:00"

            endIndex = rawTime.indexOf(":");
            var time = "";
            let numTime = Number(rawTime.slice(0, endIndex)); //We want the time to be a single number
            if (numTime >= 12) {
                time += String(numTime - 12) + "p"; //PM
            } else {
                time += String(numTime) + "a"; //AM
            }
            

            // Initialize the array for this itemId if it doesn't exist yet
            if (!statusByItem[title]) {
                statusByItem[title] = [];
            }

            // Push an object containing both the time and status
            statusByItem[title].push({
                date: date,
                time: time,
                status: status
            });
        }

        console.log(statusByItem);
    } catch (error) {
        console.error("Failed:", error);
    }
}

//Example of one room's availability data structure after processing:
// '350F (Capacity 4)': [
//     { date: '2026-08-07', time: '11:00:00', status: '❌' },
//     { date: '2026-08-07', time: '12:00:00', status: '❌' },
//     { date: '2026-08-07', time: '13:00:00', status: '✅' },
//     { date: '2026-08-07', time: '14:00:00', status: '✅' },
//     { date: '2026-08-07', time: '15:00:00', status: '✅' },
//     { date: '2026-08-07', time: '16:00:00', status: '✅' },
//     { date: '2026-08-07', time: '17:00:00', status: '✅' },
//     { date: '2026-08-07', time: '18:00:00', status: '✅' },
//     { date: '2026-08-07', time: '19:00:00', status: '✅' },
//     { date: '2026-08-08', time: '10:00:00', status: '✅' },
//     { date: '2026-08-08', time: '11:00:00', status: '✅' },
//     { date: '2026-08-08', time: '12:00:00', status: '✅' },
//     { date: '2026-08-08', time: '13:00:00', status: '✅' },
//     { date: '2026-08-08', time: '14:00:00', status: '✅' },
//     { date: '2026-08-08', time: '15:00:00', status: '✅' },
//     { date: '2026-08-08', time: '16:00:00', status: '✅' },
//     { date: '2026-08-08', time: '17:00:00', status: '✅' },
//     { date: '2026-08-08', time: '18:00:00', status: '✅' },
//     { date: '2026-08-08', time: '19:00:00', status: '✅' }
//   ]