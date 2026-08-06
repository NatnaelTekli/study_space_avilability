var roomNames = {}

async function parseExternalPage(itemId) {
    const link = 'https://workrooms.ucalgary.ca/space/' + itemId; // Replace with the actual URL pattern
    // console.log(link);
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

var ans = await parseExternalPage("9585");
console.log(ans);