async function getGridData() {
    try {
        const formData = new URLSearchParams();
        formData.append('lid', '1035');
        formData.append('gid', '2456');
        formData.append('eid', '-1');
        formData.append('seat', '0');
        formData.append('seatId', '0');
        formData.append('zone', '0');
        formData.append('start', '2026-08-02');
        formData.append('end', '2026-08-05');
        formData.append('pageIndex', '0');
        formData.append('pageSize', '18');

        const response = await fetch('https://workrooms.ucalgary.ca/spaces/availability/grid', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                // Copy these directly from your browser's Request Headers tab:
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0',
                'Referer': 'https://workrooms.ucalgary.ca/reserve/workrooms',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData
            // body: JSON.stringify({
            //     // your payload parameters here
            // })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log("Collected Data: ", data);
    } catch (error) {
        console.error("Failed:", error);
    }
}

getGridData();