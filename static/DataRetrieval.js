var roomNames = {};

async function parseExternalPageForTitle(itemId) {
    const link = `/api-proxy/space/${itemId}`//'https://workrooms.ucalgary.ca/space/' + itemId; // Replace with the actual URL pattern
    try {
        // Fetch the raw HTML of a page
        if (!roomNames[itemId]) { // Check if the room name is not already cached
            // Store the fetch promise in the cache to prevent duplicate fetches while request is in-flight
            roomNames[itemId] = (async () => {
                const response = await fetch(link); // Replace with the actual URL pattern
                const htmlText = await response.text();

                // return roomName;
                // 1. Find where 'var resources =' starts in the HTML text
                const startIndex = htmlText.indexOf('var resources =');
                if (startIndex === -1) {
                    console.log("Resources variable not found in HTML.");
                    return String(itemId);
                }

                const subString = htmlText.slice(startIndex);
                const nextVarIndex = subString.indexOf('\nvar ');
                const resourcesCode = nextVarIndex !== -1 ? subString.slice(0, nextVarIndex) : subString;

                const match = resourcesCode.match(/var\s+resources\s*=\s*([\s\S]*?);/);
                if (!match) return String(itemId);

                try {
                    const resourcesArray = new Function(`return ${match[1]};`)(); //evaluate the textblock as an actual section of code (dictionary)

                    // Map through each resource object and extract the 'title' property
                    const titles = resourcesArray.map(resource => resource.title);
                    const firstTitle = titles[0];

                    return firstTitle || String(itemId);
                } catch (error) {
                    console.error("Failed to parse resources script block:", error);
                    return String(itemId);
                }
            })();
        }
        
        return await roomNames[itemId]; //get the title corresponding to the itemId 
        
    } catch (error) {
        console.error("Failed to parse HTML:", error);
        return String(itemId);
    }
}

const buildingIds = {
    TFDL: {lid: '1035', gid: '2456'},
    // Gallagher: {lid: '3542', gid: '8180'},
    // TFDLLarge: {lid: '1035', gid: '7947'},
    // TFDLLabNext: {lid: '1394', gid: '5408'}
    // HealthSciences: {lid: '1396', gid: '2458'},
};

export default async function getGridData(lid, gid) {
    try {
        const formData = new URLSearchParams();
        formData.append('lid', lid);   //3542 Gallagher Library  //1035 TFDL
        formData.append('gid', gid);   //8180 Gallagher Library  //2456 TFDL
        formData.append('eid', '0'); //-1 //typcially changes //9578
        formData.append('seat', '0');
        formData.append('seatId', '0');
        formData.append('zone', '0');
        formData.append('start', '2026-08-23'); //start getting the availability from this date (not inclusive)
        formData.append('end', '2026-08-25'); //get all the availability up to this date (not inclusive)
        formData.append('pageIndex', '0');
        formData.append('pageSize', '18');

        //// (Route safely through Vite dev server. Using the original link will be blocked by CORS):
        const response = await fetch('/api-proxy/spaces/availability/grid', {
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
            // const empty_list = {};
            // return empty_list;
        }

        const data = await response.json();
        const slotsArray = data.slots || [];//data.events || [];

        const statusByItem = {};
        for (const item of slotsArray) {
            // Make sure the item and itemId exist
            if (!item || item.itemId === undefined) continue; //item id corresponds to the room number

            const id = item.itemId;
            var title = await parseExternalPageForTitle(id); // Fetch the room name from the external page

            // Fallback to empty string if title is null, undefined, or an object
            const titleString = typeof title === "string" ? title : String(title || "");

            const status = item.className === "s-lc-eq-checkout" ? false : true;

            const match = titleString.match(/Capacity\s+(\d+)/);
            const capacity = match ? match[1] : "?"; // get the capacity number or "?" if not found

            var count_numbers = 0;
            var new_title = "";
            for (let ind = 0; ind < titleString.length; ind++) {
                const current_char = titleString[ind];
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
            title = new_title || titleString; // Update title to only include the room number and letter (e.g., "350J")
            
            // Extract just the time part (e.g., "11:00:00") from "2026-08-05 11:00:00"
            const parts = item.start ? item.start.split(" ") : ["", ""];
            const date = parts[0]; // e.g., "2026-08-05"
            const rawTime = parts[1] || ""; // e.g., "11:00:00"

            var endIndex = rawTime.indexOf(":");
            var time = "";
            let numTime = Number(endIndex !== -1 ? rawTime.slice(0, endIndex) : rawTime); //We want the time to be a single number
            
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
            }

            if (!statusByItem[title][date]) { // Initialize the date for this itemId if it doesn't exist yet
                statusByItem[title][date] = [];
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
        console.log(building);
        allRooms[building] = await getGridData(lid, gid);
    }
    return allRooms;
}

const testCode = true;
if (testCode) {
    var data = await getAllGridData();
    console.log(data);
}