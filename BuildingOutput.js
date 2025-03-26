const readline = require('readline');

// Create interface for input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to get input
function getInput(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

// Function to extract values from format Position: <x, y, z>
function extractCoordinates(input) {
    return input.match(/<([^>]+)>/)[1].split(',').map(Number);
}

// Main function to collect building and crate data
async function collectBuildingInfo() {
    const positionInput = await getInput("Enter building position (format: Position: <x, y, z>): ");
    const orientationInput = await getInput("Enter building orientation (format: Orientation: <x, y, z>): ");
    const buildingNameInput = await getInput("Enter building config type (format: Config-Type: name): ");

    const positionOld = extractCoordinates(positionInput);
    const orientationOld = extractCoordinates(orientationInput);
    const buildingName = buildingNameInput.split(':')[1].trim();

    // Prepare building object as a formatted JavaScript code block
    let buildingString = `if (buildingName === '${buildingName}') {\n`;
    buildingString += `    const building = {\n`;
    buildingString += `        name: buildingName,\n`;
    buildingString += `        newPosition: { x: position[0], y: position[1], z: position[2] },\n`;
    buildingString += `        newOrientation: adjustedRotation, // Corrected orientation (ypr format)\n`;
    buildingString += `        oldPosition: { x: ${positionOld[0]}, y: ${positionOld[1]}, z: ${positionOld[2]} }, // Old position\n`;
    buildingString += `        oldOrientation: { x: ${orientationOld[0]}, y: ${orientationOld[1]}, z: ${orientationOld[2]} }, // Old orientation\n`;
    buildingString += `        crates: [\n`;

    let addCrate = true;
    let crateIndex = 0;

    while (addCrate) {
        const cratePositionInput = await getInput(`Enter crate ${crateIndex + 1} position (format: Position: <x, y, z>): `);
        const crateOrientationInput = await getInput(`Enter crate ${crateIndex + 1} orientation (format: Orientation: <x, y, z>): `);
        const crateNameInput = await getInput(`Enter crate ${crateIndex + 1} config type (format: Config-Type: name): `);

        const cratePosition = extractCoordinates(cratePositionInput);
        const crateOrientation = extractCoordinates(crateOrientationInput);
        const crateName = crateNameInput.split(':')[1].trim();

        buildingString += `            {\n`;
        buildingString += `                name: "${crateName}",\n`;
        buildingString += `                position: { x: ${cratePosition[0]}, y: ${cratePosition[1]}, z: ${cratePosition[2]} },\n`;
        buildingString += `                orientation: { x: ${crateOrientation[0]}, y: ${crateOrientation[1]}, z: ${crateOrientation[2]} }\n`;
        buildingString += `            },\n`;

        const moreCrates = await getInput("Do you want to add another crate? (yes/no): ");
        addCrate = moreCrates.toLowerCase() === 'yes';
        crateIndex++;
    }

    // Close the building object and function call
    buildingString += `        ]\n`;
    buildingString += `    };\n`;
    buildingString += `    processBuilding(building, outputFile);\n`;
    buildingString += `}\n`;

    // Output the generated JavaScript code
    console.log(buildingString);

    // Close the readline interface
    rl.close();
}

// Start the program
collectBuildingInfo();
//TEST