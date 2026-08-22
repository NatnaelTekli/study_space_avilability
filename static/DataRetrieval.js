var roomNames = {};

async function parseExternalPageForTitle(itemId) {
    const link = 'https://workrooms.ucalgary.ca/space/' + itemId; // Replace with the actual URL pattern
    try {
        // Fetch the raw HTML of a page
        if (!roomNames[itemId]) { // Check if the room name is not already cached
            //doing these helps so that we dont have to keep fetching the same page over and over again
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

const buildingIds = {
    TFDL: {lid: '1035', gid: '2456'},
    Gallagher: {lid: '3542', gid: '8180'},
    TFDLLarge: {lid: '1035', gid: '7947'},
    TFDLLabNext: {lid: '1394', gid: '5408'},
    HealthSciences: {lid: '1396', gid: '2458'},
};

export default async function getGridData(lid, gid) {
    try {
        const formData = new URLSearchParams();
        formData.append('lid', lid);   //3542 Gallagher Library  //1035 TFDL
        formData.append('gid', gid);   //8180 Gallagher Library  //2456 TFDL
        formData.append('eid', '9578'); //-1 //typcially changes
        formData.append('seat', '0');
        formData.append('seatId', '0');
        formData.append('zone', '0');
        formData.append('start', '2026-08-10'); //start getting the availability from this date (not inclusive)
        formData.append('end', '2026-08-12'); //get all the availability up to this date (not inclusive)
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
            var title = await parseExternalPageForTitle(id); // Fetch the room name from the external page
            const status = item.className === "s-lc-eq-checkout" ? false : true;

            const match = title.match(/Capacity\s+(\d+)/);
            const capacity = match ? match[1] : "?"; // get the capacity number or "?" if not found

            var count_numbers = 0;
            var new_title = "";
            for (let ind = 0; ind < title.length; ind++) {
                const current_char = title[ind];
                if (count_numbers < 3) {
                    if (/^\d$/.test(current_char)) { // Check if the character is a digit
                        count_numbers += 1;
                        new_title += current_char;
                    }
                } else {
                    if (current_char != " ") { // Get the first alphabetical character after the room number (e.g., "350J")
                        new_title += current_char;
                        break;
                    }
                }
            }
            title = new_title; // Update title to only include the room number and letter (e.g., "350J")
            
            // Extract just the time part (e.g., "11:00:00") from "2026-08-05 11:00:00"
            const parts = item.start ? item.start.split(" ") : ["", ""];
            const date = parts[0]; // e.g., "2026-08-05"
            const rawTime = parts[1]; // e.g., "11:00:00"

            var endIndex = rawTime.indexOf(":");
            var time = "";
            let numTime = Number(rawTime.slice(0, endIndex)); //We want the time to be a single number
            
            if (numTime >= 12) {
                var mockTime = numTime - 12;
                if (mockTime == 0) {
                    mockTime = 12; // Handle the case for 12 PM correctly
                }
                time += String(mockTime) + "p"; //PM
            } else {
                time += String(numTime) + "a"; //AM
            }

            // Initialize the array for this itemId if it doesn't exist yet
            if (!statusByItem[title]) {
                statusByItem[title] = {};
                if (!statusByItem[title][date]) { // Initialize the date for this itemId if it doesn't exist yet
                    statusByItem[title][date] = [];
                }
            }

            if (!statusByItem[title]["capacity"]) {
                statusByItem[title]["capacity"] = capacity; // Store the capacity for this room
            }

            // Push an object containing both the time and status
            statusByItem[title][date].push({
                time: time,
                status: status
            });
        }

        // console.log(statusByItem);
        return statusByItem
        // console.log(statusByItem["350F (Capacity 4)"]["2026-08-11"])
    } catch (error) {
        console.error("Failed:", error);
    }
}

async function getAllGridData() {
    var allRooms = {};
    for (var building of Object.keys(buildingIds)) {
        const { lid, gid } = buildingIds[building];
        allRooms[building] = await getGridData(lid, gid);
    }
    return allRooms;
}

const testCode = false;
if (testCode) {
    getAllGridData();
    // getGridData('3542', '8180');
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

// '350F (Capacity 4)': {
//     '2026-08-11': [
//       { time: '7a', status: 'True' },
//       { time: '8a', status: 'True' },
//       { time: '9a', status: 'True' },
//       { time: '10a', status: 'True' },
//       { time: '11a', status: 'True' },
//       { time: '12p', status: 'True' },
//       { time: '1p', status: 'True' },
//       { time: '2p', status: 'True' },
//       { time: '3p', status: 'True' },
//       { time: '4p', status: 'True' },
//       { time: '5p', status: 'True' },
//       { time: '6p', status: 'True' },
//       [Object]
//     ]
//   }

// '211C': {
//     '2026-08-11': [
//       [Object], [Object],
//       [Object], [Object],
//       [Object], [Object],
//       [Object], [Object],
//       [Object], [Object],
//       [Object], [Object],
//       [Object]
//     ],
//     capacity: '4'
//   }

//{
//Gallagher: { '170A': { '2026-08-11': [Array], capacity: '4' } }
//}