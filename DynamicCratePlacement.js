const fs = require('fs');
const xml2js = require('xml2js');

// Function to write data to a file
function writeToFile(data, fileName) {
    if (typeof fileName !== 'string' || !fileName) {
        throw new TypeError('The "path" argument must be of type string and cannot be empty.');
    }
    fs.appendFileSync(fileName, data + '\n', (err) => {
        if (err) throw err;
    });
}

function calculateNewPositionAndOrientation(
    oldBuildingPos, newBuildingPos, oldCratePos, 
    oldBuildingOrientation, newBuildingOrientation, oldCrateOrientation) {

    // Step 1: Calculate the crate's offset relative to the old building position
    const offsetX = oldCratePos.x - oldBuildingPos.x;
    const offsetZ = oldCratePos.z - oldBuildingPos.z;

    // Step 2: Calculate the distance (radius or hypotenuse) between the crate and the old building position
    const radius = Math.sqrt(offsetX * offsetX + offsetZ * offsetZ);

    // Step 3: Calculate the initial angle (in radians) using atan2
    const initialAngle = Math.atan2(offsetZ, offsetX); // atan2 gives the angle between the X-axis and the point

    // Step 4: Convert the yaw (rotation) difference from degrees to radians
    let yawDifference = newBuildingOrientation.x;
    const yawRadians = (-yawDifference * Math.PI) / 180; // Negate the yaw difference here to reverse the rotation

    // Step 5: Calculate the new angle after rotation
    const newAngle = initialAngle + yawRadians;

    // Step 6: Calculate the new offset (rotated position) using the new angle and radius
    const rotatedX = radius * Math.cos(newAngle);
    const rotatedZ = radius * Math.sin(newAngle);

    // Step 7: Calculate the new crate position relative to the new building position
    const newCratePos = {
        x: newBuildingPos.x + rotatedX,
        y: newBuildingPos.y + (oldCratePos.y - oldBuildingPos.y), // Y stays the same (no vertical rotation)
        z: newBuildingPos.z + rotatedZ
    };

    // Adjust the crate's orientation by applying the building's yaw to the crate's orientation
    const newCrateOrientation = {
        x: (oldCrateOrientation.x + newBuildingOrientation.x) % 360, // Roll
        y: (oldCrateOrientation.y + newBuildingOrientation.y) % 360, // Yaw
        z: (oldCrateOrientation.z + newBuildingOrientation.z) % 360  // Pitch
    };

    return {
        position: newCratePos,
        orientation: newCrateOrientation
    };
}

function cleanContainerName(name) {
    return name.replace('_Placement', '');
}

// Function to get the appropriate loot table based on the crate name
function getLootTable(crateName) {
    if (crateName === "Medical_Bag") {
        return "MedicalBagLoot";
    } else if (crateName === "SLC_Ammo_Box") {
        return "AmmoCanLoot";
    } else if (crateName === "SLC_Filing_Cabinet") {
        return "FillingCabinetLoot";
    } else if (crateName === "WeaponCrate") {
        return "WeaponCrateLoot";
    } else if (crateName === "ConsumableCrate") {
        return "DuffleLoot";
    } else if (crateName === "DrugCrate") {
        return "DuffleLoot";
    } else if (crateName === "MilitaryCrate") {
        return "MilitaryCrateLoot";
    } else if (crateName === "Computer_Tower") {
        return "Computer_Tower_Loot";
    } else if (crateName === "MedicalCrate") {
        return "MedicalBagLoot";
    } else if (crateName === "Building") {
        return "Building";
    } else if (crateName === "Safe") {
        return "SafeLoot";
    } else if (crateName === "Toolbox") {
        return "ToolBoxLoot";
    } else if (crateName === "Jacket_SLC") {
        return "JacketLoot";
    } else if (crateName === "Duffle_Bag") {
        return "DuffleLoot";
    } else if (crateName === "SLC_Wooden_Crate") {
        return "WoodenCrateLoot";
    } else if (crateName === "BuildingCrate_HackableCrate") {
        return "Locked_Crates";
    } else if (crateName === "SLC_Hidden_Stash") {
        return "Hidden_Stashes_Tisy";
    } else if (crateName === "SLC_Brief_Case") {
        return "BriefCaseLoot";
    } else {
        return "CHANGEME"; // Default loot table if no match is found
    }
}

// Function to process each building and its crates
function processBuilding(building, outputFile) {
    building.crates.forEach(crate => {
        const newPlacement = calculateNewPositionAndOrientation(
            building.oldPosition,
            building.newPosition,
            crate.position,
            building.oldOrientation,
            building.newOrientation,
            crate.orientation
        );

        const containerName = cleanContainerName(crate.name);
        const lootTable = getLootTable(containerName); // Get loot table based on crate name

        // Format the output as JSON and write it to a file
        const output = `{
  "LocationName": "${building.name}",
  "ContainerName": "${containerName}",
  "LootTable": "${lootTable}",
  "UnlockTime": 1,
  "ResetTimer": 1,
  "POS": [${newPlacement.position.x.toFixed(6)}, ${newPlacement.position.y.toFixed(6)}, ${newPlacement.position.z.toFixed(6)}],
  "KeyItem": "",
  "IsActive": 1,
  "ORI": [${newPlacement.orientation.x.toFixed(6)}, ${newPlacement.orientation.y.toFixed(6)}, ${newPlacement.orientation.z.toFixed(6)}],
  "ResetPlayerCheck": 0,
  "ExactPlacing": 1,
  "ContainerToggleable": 1,
  "ActionID": 0
},`;

        // Write the output to the file
        writeToFile(output, outputFile);
    });
}

// Function to parse XML and extract building information
function parseXML(xmlFile, outputFile) {
    const parser = new xml2js.Parser();

    fs.readFile(xmlFile, (err, data) => {
        if (err) {
            console.error(`Error reading XML file: ${err}`);
            return;
        }

        parser.parseString(data, (err, result) => {
            if (err) {
                console.error(`Error parsing XML: ${err}`);
                return;
            }

            const groups = result.map.group; // Assuming <group> tags are under <map>

            groups.forEach(group => {
                const buildingName = group.$.name;
                const position = group.$.pos.split(' ').map(Number); // Position: X, Y, Z

                // XML has rpy (roll, pitch, yaw) but the system expects ypr (yaw, pitch, roll)
                const rotation = group.$.rpy.split(' ').map(Number);

                // Swap Z and X to adapt rpy to ypr format
                const adjustedRotation = { x: rotation[2], y: rotation[1], z: rotation[0] };

                if (buildingName === 'Land_Workshop2') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 10938.900391, y: 7.307650, z: 2695.000000 }, // Old position
                        oldOrientation: { x: 0.0, y: 0.0, z: 0.0 }, // Old orientation (base building orientation)
                        crates: [
                            {
                                name: "Medical_Bag_Placement",
                                position: { x: 10940.900391, y: 6.118820, z: 2694.340088 },
                                orientation: { x: 178.740952, y: 0.0, z: 0.0 }
                            },
                            {
                                name: "MedicalCrate_Placement",
                                position: { x: 10937.200195, y: 6.114970, z: 2693.780029 },
                                orientation: { x: 89.366951, y: 0.0, z: 0.0 }
                            },
                            {
                                name: "WeaponCrate_Placement",
                                position: { x: 10939.200195, y: 6.122270, z: 2696.850098 },
                                orientation: { x: -90.0, y: 0.0, z: 0.0 }
                            }
                        ]
                    };

                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_House_1W02') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 10366.400391, y: 10.565500, z: 2017.160034 }, // Old position
                        oldOrientation: { x: 0.0, y: 0.0, z: 0.0 }, // Old orientation (base building orientation)
                        crates: [
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 10370.400391, y: 8.974530, z: 2020.219971 },
                                orientation: { x: -118.529884, y: 0.0, z: 0.0 }
                            },
                            {
                                name: "Jacket_SLC_Placement",
                                position: { x: 10369.400391, y: 9.154330, z: 2018.010010 },
                                orientation: { x: 166.589951, y: 0.0, z: 0.0 }
                            },
                            {
                                name: "Safe_Placement",
                                position: { x: 10367.099609, y: 8.210620, z: 2020.650024 },
                                orientation: { x: 89.639763, y: 0.0, z: 0.0 }
                            },
                            {
                                name: "Medical_Bag_Placement",
                                position: { x: 10363.099609, y: 8.890760, z: 2016.219971 },
                                orientation: { x: -34.829948, y: 0.0, z: 0.0 }
                            },
                            {
                                name: "Jacket_SLC_Placement",
                                position: { x: 10367.000000, y: 9.063120, z: 2015.500000 },
                                orientation: { x: 78.749573, y: 0.0, z: 0.0 }
                            }
                        ]
                    };

                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_Village_store') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 3658.26001, y: 18.3654, z: 6511.029785 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 3660.120117, y: 17.343, z: 6508.839844 },
                                orientation: { x: 0, y: 0, z: 0 }
                            },
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 1.224203, y: -1.606711, z: 0.924272 },
                                orientation: { x: 0, y: 0, z: 0 }
                            },
                            {
                                name: "Jacket_SLC_Placement",
                                position: { x: 3654.590088, y: 16.2125, z: 6516.819824 },
                                orientation: { x: -104.219757, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_Water_Station') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 2851.590088, y: 8.12637, z: 6867.779785 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "Toolbox_Placement",
                                position: { x: 2850.649902, y: 7.59512, z: 6866.879883 },
                                orientation: { x: -89.909828, y: 0, z: 0 }
                            },
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 2852.76001, y: 7.82936, z: 6869.419922 },
                                orientation: { x: 0, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_Workshop3') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 4089.48999, y: 9.32827, z: 4981.310059 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "Toolbox_Placement",
                                position: { x: 4087.320068, y: 9.06217, z: 4975.629883 },
                                orientation: { x: -21.329979, y: 0, z: 0 }
                            },
                            {
                                name: "Jacket_SLC_Placement",
                                position: { x: 4089.310059, y: 9.01975, z: 4975.089844 },
                                orientation: { x: 76.679855, y: 0, z: 0 }
                            },
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 0.787693, y: -1.236882, z: 5.741857 },
                                orientation: { x: 12.874187, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_Chapel') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 3873.139893, y: 10.6135, z: 4920.779785 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 3869.850098, y: 7.42899, z: 4920.890137 },
                                orientation: { x: 0, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_Garage_Office') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 3646.669922, y: 9.11079, z: 6072.959961 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "Jacket_SLC_Placement",
                                position: { x: 3649.72998, y: 9.92973, z: 6073.890137 },
                                orientation: { x: 0, y: 0, z: 0 }
                            },
                            {
                                name: "Jacket_SLC_Placement",
                                position: { x: 3649.72998, y: 9.96084, z: 6074.859863 },
                                orientation: { x: 0, y: 0, z: 0 }
                            },
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 3643.97998, y: 10.2303, z: 6070.709961 },
                                orientation: { x: -27.269978, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_Garage_Row_Big') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 3606.5, y: 8.80714, z: 6062.459961 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "Toolbox_Placement",
                                position: { x: 3612.300049, y: 6.52033, z: 6068.149902 },
                                orientation: { x: 100.439651, y: 0, z: 0 }
                            },
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 3594.179932, y: 6.03928, z: 6063.470215 },
                                orientation: { x: 0, y: 0, z: 0 }
                            },
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 3612.540039, y: 6.45425, z: 6063.310059 },
                                orientation: { x: -89.90976, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_Workshop5') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 3640.070068, y: 15.1432, z: 6191.060059 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "Toolbox_Placement",
                                position: { x: 3644.51001, y: 13.8919, z: 6185.77002 },
                                orientation: { x: -157.500076, y: 0, z: 0 }
                            },
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 3641.459961, y: 13.8815, z: 6189.589844 },
                                orientation: { x: -87.47966, y: 0, z: 0 }
                            },
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 3640.159912, y: 15.4921, z: 6196.080078 },
                                orientation: { x: -76.40992, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_Mil_Guardhouse1') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 3514.169922, y: 17.7635, z: 6313.810059 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "Medical_Bag_Placement",
                                position: { x: 3517.98999, y: 16.6434, z: 6313.640137 },
                                orientation: { x: 39.149971, y: 0, z: 0 }
                            },
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 3515.080078, y: 16.580601, z: 6312.299805 },
                                orientation: { x: -28.079979, y: 0, z: 0 }
                            },
                            {
                                name: "Jacket_SLC_Placement",
                                position: { x: 3517.050049, y: 16.959101, z: 6312.740234 },
                                orientation: { x: -103.679787, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_City_Hospital') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 4281.27002, y: 23.350401, z: 7597.359863 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "Medical_Bag_Placement",
                                position: { x: 4275.850098, y: 16.9811, z: 7594.140137 },
                                orientation: { x: -32.399963, y: 0, z: 0 }
                            },
                            {
                                name: "Medical_Bag_Placement",
                                position: { x: 4260.350098, y: 16.680201, z: 7598.620117 },
                                orientation: { x: -18.629974, y: 0, z: 0 }
                            },
                            {
                                name: "Medical_Bag_Placement",
                                position: { x: 4265.339844, y: 16.6985, z: 7603.180176 },
                                orientation: { x: 0, y: 0, z: 0 }
                            },
                            {
                                name: "Medical_Bag_Placement",
                                position: { x: 4272.359863, y: 16.696199, z: 7605.709961 },
                                orientation: { x: 0, y: 0, z: 0 }
                            },
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 4283.149902, y: 16.4709, z: 7597.350098 },
                                orientation: { x: -87.479614, y: 0, z: 0 }
                            },
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 4266.209961, y: 16.442801, z: 7598.47998 },
                                orientation: { x: -90.989784, y: 0, z: 0 }
                            },
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 4297.209961, y: 16.435301, z: 7594.290039 },
                                orientation: { x: -96.38987, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_Repair_Center') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 4088.629883, y: 7.11404, z: 7838.009766 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "Toolbox_Placement",
                                position: { x: 4087.22998, y: 5.46498, z: 7838.890137 },
                                orientation: { x: 0, y: 0, z: 0 }
                            },
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 4089.409912, y: 6.39086, z: 7842.799805 },
                                orientation: { x: -87.479836, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_BusStop_City') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 3790.439941, y: 16.607401, z: 6522.890137 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 3787.699951, y: 15.725, z: 6523.669922 },
                                orientation: { x: 0, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_City_Stand_FastFood') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 1994.579956, y: 7.90342, z: 331.436005 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 1996, y: 7.07423, z: 328.096985 },
                                orientation: { x: -86.399925, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_City_Stand_Grocery') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 1995.140015, y: 7.70293, z: 328.990997 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 1996.579956, y: 6.87654, z: 325.703003 },
                                orientation: { x: -101.249794, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_City_Stand_News1') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 1987.800049, y: 7.90635, z: 327.919006 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 1989.27002, y: 7.06569, z: 324.610992 },
                                orientation: { x: -108.809753, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_Village_Pub') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 7322.459961, y: 34.735401, z: 5052.680176 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "SLC_Brief_Case_Placement",
                                position: { x: 7321.799805, y: 32.109600, z: 5050.109863 },
                                orientation: { x: -89.104713, y: 0, z: 0 }
                            },
                            {
                                name: "SLC_Ammo_Box_Placement",
                                position: { x: 7320.080078, y: 34.407700, z: 5048.060059 },
                                orientation: { x: -70.072479, y: 0, z: 0 }
                            },
                            {
                                name: "SLC_Filing_Cabinet_Placement",
                                position: { x: 7325.569824, y: 31.216801, z: 5052.959961 },
                                orientation: { x: -179.832138, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_House_1W10') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 733.672974, y: 20.440599, z: 6790.149902 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 735.041016, y: 19.7458, z: 6786.810059 },
                                orientation: { x: -138.509323, y: 0, z: 0 }
                            },
                            {
                                name: "Jacket_SLC_Placement",
                                position: { x: 733.723022, y: 19.7864, z: 6785.990234 },
                                orientation: { x: 81.809921, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_House_2W02') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 7272.899902, y: 38.654301, z: 5058.399902 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "Jacket_SLC_Placement",
                                position: { x: 7273.109863, y: 35.510799, z: 5056.120117 },
                                orientation: { x: 76.624367, y: 0, z: 0 }
                            },
                            {
                                name: "SLC_Ammo_Box_Placement",
                                position: { x: 7277.310059, y: 38.050999, z: 5056.379883 },
                                orientation: { x: 64.516594, y: 0, z: 0 }
                            },
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 7275.700195, y: 35.353802, z: 5057.029785 },
                                orientation: { x: 0, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_House_1W07') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 7296.609863, y: 36.784302, z: 5027.899902 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "Jacket_SLC_Placement",
                                position: { x: 7296.250000, y: 34.620998, z: 5027.140137 },
                                orientation: { x: 0, y: 0, z: 0 }
                            },
                            {
                                name: "SLC_Brief_Case_Placement",
                                position: { x: 7297.240234, y: 34.159698, z: 5020.439941 },
                                orientation: { x: -26.349634, y: 0, z: 0 }
                            },
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 7296.830078, y: 36.550701, z: 5026.799805 },
                                orientation: { x: -66.657372, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_House_2W03') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 2842.409912, y: 12.5594, z: 6910.740234 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "Jacket_SLC_Placement",
                                position: { x: 2837.409912, y: 12.5808, z: 6913.529785 },
                                orientation: { x: -89.909676, y: 0, z: 0 }
                            },
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 2835.209961, y: 12.5705, z: 6914.609863 },
                                orientation: { x: -108.269676, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_Misc_DeerStand2') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 6355.339844, y: 22.996799, z: 6368.600098 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 6356.040039, y: 23.4611, z: 6369.100098 },
                                orientation: { x: -79.649872, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_House_1W03') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 6200.509766, y: 17.902599, z: 6701.600098 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 6198.910156, y: 16.0788, z: 6693.910156 },
                                orientation: { x: 0.810099, y: 0, z: 0 }
                            },
                            {
                                name: "Jacket_SLC_Placement",
                                position: { x: 6196.5, y: 16.399099, z: 6695.72998 },
                                orientation: { x: 168.209427, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_House_2W01') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 7278.910156, y: 38.109299, z: 5033.330078 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "SLC_Brief_Case_Placement",
                                position: { x: 7283.470215, y: 34.891701, z: 5036.180176 },
                                orientation: { x: 22.788410, y: 0, z: 0 }
                            },
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 7272.669922, y: 35.200802, z: 5033.240234 },
                                orientation: { x: 20.083166, y: 0, z: 0 }
                            },
                            {
                                name: "Jacket_SLC_Placement",
                                position: { x: 7274.529785, y: 39.018700, z: 5034.720215 },
                                orientation: { x: 168.010590, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_House_1W12') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 7282.520020, y: 34.976398, z: 5092.740234 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 7284.399902, y: 33.389500, z: 5086.250000 },
                                orientation: { x: -17.519201, y: 0, z: 0 }
                            },
                            {
                                name: "Jacket_SLC_Placement",
                                position: { x: 7286.990234, y: 33.395199, z: 5092.819824 },
                                orientation: { x: -105.540787, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_Office2') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 6719.439941, y: 34.985401, z: 2122.459961 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 6735.879883, y: 27.332199, z: 2127.570068 },
                                orientation: { x: -49.94997, y: 0, z: 0 }
                            },
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 6719.169922, y: 27.152399, z: 2119.530029 },
                                orientation: { x: -90.179512, y: 0, z: 0 }
                            },
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 6730.080078, y: 32.832401, z: 2129.169922 },
                                orientation: { x: -44.549992, y: 0, z: 0 }
                            },
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 6706.419922, y: 35.2742, z: 2126.459961 },
                                orientation: { x: -89.369888, y: 0, z: 0 }
                            },
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 6731.810059, y: 35.2696, z: 2126.27002 },
                                orientation: { x: -98.279755, y: 0, z: 0 }
                            },
                            {
                                name: "Medical_Bag_Placement",
                                position: { x: 6700.200195, y: 26.7199, z: 2127.449951 },
                                orientation: { x: -91.259827, y: 0, z: 0 }
                            },
                            {
                                name: "Medical_Bag_Placement",
                                position: { x: -11.317115, y: -2.166207, z: -1.630358 },
                                orientation: { x: -75.999985, y: 0, z: -179.999985 }
                            },
                            {
                                name: "Medical_Bag_Placement",
                                position: { x: 6708.27002, y: 35.274799, z: 2123.639893 },
                                orientation: { x: -85.319801, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_House_1W09') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 5364.669922, y: 8.38745, z: 2072.699951 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "Jacket_SLC_Placement",
                                position: { x: 5365.620117, y: 7.30514, z: 2077.189941 },
                                orientation: { x: -96.389763, y: 0, z: 0 }
                            },
                            {
                                name: "Jacket_SLC_Placement",
                                position: { x: 5365.129883, y: 7.31588, z: 2077.189941 },
                                orientation: { x: -96.659637, y: 0, z: 0 }
                            },
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 5362.27002, y: 7.2581, z: 2075.090088 },
                                orientation: { x: 0, y: 0, z: 0 }
                            },
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 5364.350098, y: 6.8971, z: 2071.370117 },
                                orientation: { x: -131.489761, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_Sara_domek_sedy') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 3871.389893, y: 8.19032, z: 4346.160156 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 3873.459961, y: 9.72964, z: 4349.410156 },
                                orientation: { x: 0, y: 0, z: 0 }
                            },
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 3861.969971, y: 9.50848, z: 4349.97998 },
                                orientation: { x: -141.749725, y: 0, z: 0 }
                            },
                            {
                                name: "Jacket_SLC_Placement",
                                position: { x: 3861.25, y: 9.35379, z: 4348.97998 },
                                orientation: { x: 175.860046, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_House_1W05_Yellow') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 7295.720215, y: 35.430302, z: 5053.770020 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "SLC_Brief_Case_Placement",
                                position: { x: 7298.529785, y: 34.877998, z: 5052.549805 },
                                orientation: { x: 31.904388, y: 0, z: 0 }
                            },
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 7293.959961, y: 34.961601, z: 5051.799805 },
                                orientation: { x: 0, y: 0, z: 0 }
                            },
                            {
                                name: "Jacket_SLC_Placement",
                                position: { x: 7297.410156, y: 35.503700, z: 5057.689941 },
                                orientation: { x: -102.686592, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                if (buildingName === 'Land_House_1W05') {
                    const building = {
                        name: buildingName,
                        newPosition: { x: position[0], y: position[1], z: position[2] },
                        newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                        oldPosition: { x: 7292.979980, y: 35.428299, z: 5071.200195 }, // Old position
                        oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                        crates: [
                            {
                                name: "Jacket_SLC_Placement",
                                position: { x: 7294.160156, y: 35.408798, z: 5075.120117 },
                                orientation: { x: -101.263924, y: 0, z: 0 }
                            },
                            {
                                name: "Duffle_Bag_Placement",
                                position: { x: 7294.180176, y: 34.895599, z: 5071.399902 },
                                orientation: { x: -58.963879, y: 0, z: 0 }
                            },
                        ]
                    };
                    processBuilding(building, outputFile);
                }
                    
                    if (buildingName === 'Land_Garage_Row_Small') {
                        const building = {
                            name: buildingName,
                            newPosition: { x: position[0], y: position[1], z: position[2] },
                            newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                            oldPosition: { x: 3539.389893, y: 168.505997, z: 2511.909912 }, // Old position
                            oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                            crates: [
                                {
                                    name: "SLC_Wooden_Crate_Placement",
                                    position: { x: 3546.399902, y: 166.973999, z: 2509.719971 },
                                    orientation: { x: -88.584480, y: 0, z: 0 }
                                },
                                {
                                    name: "Toolbox_Placement",
                                    position: { x: 3541.070068, y: 167.906998, z: 2508.159912 },
                                    orientation: { x: -146.880524, y: 0, z: 0 }
                                },
                                {
                                    name: "Duffle_Bag_Placement",
                                    position: { x: 3537.449951, y: 166.936996, z: 2510.649902 },
                                    orientation: { x: 88.903564, y: 0, z: 0 }
                                },
                                {
                                    name: "Duffle_Bag_Placement",
                                    position: { x: 3532.540039, y: 167.537003, z: 2512.239990 },
                                    orientation: { x: 0, y: 0, z: 0 }
                                },
                            ]
                        };
                        processBuilding(building, outputFile);
                    }
                    if (buildingName === 'Land_Tenement_Big') {
                        const building = {
                            name: buildingName,
                            newPosition: { x: position[0], y: position[1], z: position[2] },
                            newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                            oldPosition: { x: 2603.770020, y: 139.315002, z: 2577.560059 }, // Old position
                            oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                            crates: [
                                {
                                    name: "SLC_Filing_Cabinet_Placement",
                                    position: { x: 2609.870117, y: 153.544006, z: 2572.889893 },
                                    orientation: { x: 91.529320, y: 0, z: 0 }
                                },
                                {
                                    name: "Duffle_Bag_Placement",
                                    position: { x: 2610.439941, y: 150.128998, z: 2579.709961 },
                                    orientation: { x: 1.349989, y: 0, z: 0 }
                                },
                                {
                                    name: "SLC_Brief_Case_Placement",
                                    position: { x: 2606.199951, y: 139.981003, z: 2572.610107 },
                                    orientation: { x: 90, y: 0, z: 0 }
                                },
                                {
                                    name: "Duffle_Bag_Placement",
                                    position: { x: 2595.510010, y: 137.026001, z: 2575.870117 },
                                    orientation: { x: 86.148682, y: 0, z: 0 }
                                },
                                {
                                    name: "Duffle_Bag_Placement",
                                    position: { x: 2609.810059, y: 133.610001, z: 2584.070068 },
                                    orientation: { x: -57.239761, y: 0, z: 0 }
                                },
                                {
                                    name: "WeaponCrate_Placement",
                                    position: { x: 2603.709961, y: 163.781006, z: 2582.090088 },
                                    orientation: { x: 90.633041, y: 0, z: 0 }
                                },
                            ]
                        };
                        processBuilding(building, outputFile);
                    }
                    if (buildingName === 'Land_Tenement_Small') {
                        const building = {
                            name: buildingName,
                            newPosition: { x: position[0], y: position[1], z: position[2] },
                            newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                            oldPosition: { x: 2569.179932, y: 125.504997, z: 2590.189941 }, // Old position
                            oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                            crates: [
                                {
                                    name: "Medical_Bag_Placement",
                                    position: { x: 2565.790039, y: 122.216003, z: 2587.199951 },
                                    orientation: { x: 134.728516, y: 0, z: 0 }
                                },
                                {
                                    name: "Safe_Placement",
                                    position: { x: 2566.379883, y: 124.855003, z: 2594.469971 },
                                    orientation: { x: -155.608826, y: 0, z: 0 }
                                },
                                {
                                    name: "Duffle_Bag_Placement",
                                    position: { x: 2579.449951, y: 128.184998, z: 2597.570068 },
                                    orientation: { x: 18.899765, y: 0, z: 0 }
                                },
                                {
                                    name: "SLC_Ammo_Box_Placement",
                                    position: { x: 2560.250000, y: 132.274994, z: 2592.090088 },
                                    orientation: { x: -34.831642, y: 0, z: 0 }
                                },
                                {
                                    name: "Duffle_Bag_Placement",
                                    position: { x: 2570.300049, y: 132.270996, z: 2585.260010 },
                                    orientation: { x: 18.088511, y: 0, z: 0 }
                                },
                            ]
                        };
                        processBuilding(building, outputFile);
                    }
                    if (buildingName === 'Land_jmc_abandoned_building_base') {
                        const building = {
                            name: buildingName,
                            newPosition: { x: position[0], y: position[1], z: position[2] },
                            newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                            oldPosition: { x: 3751.810059, y: 15.776100, z: 6749.540039 }, // Old position
                            oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                            crates: [
                                {
                                    name: "Toolbox_Placement",
                                    position: { x: 3757.280029, y: 22.462200, z: 6752.529785 },
                                    orientation: { x: -61.812759, y: 0, z: 0 }
                                },
                                {
                                    name: "Duffle_Bag_Placement",
                                    position: { x: 3754.000000, y: 25.585699, z: 2594.469971 },
                                    orientation: { x: 0, y: 0, z: 0 }
                                },
                                {
                                    name: "Duffle_Bag_Placement",
                                    position: { x: 3753.629883, y: 28.720900, z: 6742.479980 },
                                    orientation: { x: 14.528081, y: 0, z: 0 }
                                },
                                {
                                    name: "SLC_Filing_Cabinet_Placement",
                                    position: { x: 3747.209961, y: 41.260399, z: 6759.290039 },
                                    orientation: { x: 0, y: 0, z: 0 }
                                },
                                {
                                    name: "Medical_Bag_Placement",
                                    position: { x: 3762.270020, y: 44.383202, z: 6744.009766 },
                                    orientation: { x: -164.501556, y: 0, z: 0 }
                                },
                                {
                                    name: "WeaponCrate_Placement",
                                    position: { x: 3746.270020, y: 47.679199, z: 6749.589844 },
                                    orientation: { x: 1.283527, y: 0, z: 0 }
                                },
                                {
                                    name: "Safe_Placement",
                                    position: { x: 3746.280029, y: 38.123798, z: 6753.850098 },
                                    orientation: { x: 143.227951, y: 0, z: 0 }
                                },
                                {
                                    name: "SLC_Ammo_Box_Placement",
                                    position: { x: 3745.939941, y: 34.998699, z: 6747.359863 },
                                    orientation: { x: 142.851563, y: 0, z: 0 }
                                },
                                {
                                    name: "Duffle_Bag_Placement",
                                    position: { x: 3748.300049, y: 16.191299, z: 6743.799805 },
                                    orientation: { x: -23.073193, y: 0, z: 0 }
                                },
                            ]
                        };
                        processBuilding(building, outputFile);
                    }
                    if (buildingName === 'Land_Pripyat_building_16floor1') {
                        const building = {
                            name: buildingName,
                            newPosition: { x: position[0], y: position[1], z: position[2] },
                            newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                            oldPosition: { x: 3709.129883, y: 44.245998, z: 6800.870117 }, // Old position
                            oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                            crates: [
                                {
                                    name: "SLC_Brief_Case_Placement",
                                    position: { x: 3705.889893, y: 20.837900, z: 6792.189941 },
                                    orientation: { x: 0, y: 0, z: 0 }
                                },
                                {
                                    name: "Duffle_Bag_Placement",
                                    position: { x: 3724.250000, y: 20.840200, z: 6805.549805 },
                                    orientation: { x: 27.203566, y: 0, z: 0 }
                                },
                                {
                                    name: "SLC_Filing_Cabinet_Placement",
                                    position: { x: 3700.949951, y: 26.862600, z: 6800.529785 },
                                    orientation: { x: -152.110138, y: 0, z: 0 }
                                },
                                {
                                    name: "WeaponCrate_Placement",
                                    position: { x: 3728.919922, y: 68.442101, z: 6798.970215 },
                                    orientation: { x: 0, y: 0, z: 0 }
                                },
                                {
                                    name: "SLC_Ammo_Box_Placement",
                                    position: { x: 3690.399902, y: 68.451103, z: 6796.220215 },
                                    orientation: { x: -125.904297, y: 0, z: 0 }
                                },
                                {
                                    name: "SLC_Ammo_Box_Placement",
                                    position: { x: 3728.929932, y: 65.849899, z: 6803.040039 },
                                    orientation: { x: -82.451057, y: 0, z: 0 }
                                },
                                {
                                    name: "Toolbox_Placement",
                                    position: { x: 3705.709961, y: 62.847099, z: 6792.750000 },
                                    orientation: { x: -111.230850, y: 0, z: 0 }
                                },
                                {
                                    name: "Duffle_Bag_Placement",
                                    position: { x: 3723.360107, y: 17.846701, z: 6804.609863 },
                                    orientation: { x: -14.954781, y: 0, z: 0 }
                                },
                            ]
                        };
                        processBuilding(building, outputFile);
                    }
                    if (buildingName === 'Land_Construction_Building') {
                        const building = {
                            name: buildingName,
                            newPosition: { x: position[0], y: position[1], z: position[2] },
                            newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                            oldPosition: { x: 3751.149902, y: 24.593399, z: 6852.709961 }, // Old position
                            oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                            crates: [
                                {
                                    name: "Duffle_Bag_Placement",
                                    position: { x: 3739.850098, y: 18.034201, z: 6847.009766 },
                                    orientation: { x: -95.410660, y: 0, z: 0 }
                                },
                                {
                                    name: "Toolbox_Placement",
                                    position: { x: 3732.010010, y: 23.087200, z: 6846.060059 },
                                    orientation: { x: 166.635788, y: 0, z: 0 }
                                },
                                {
                                    name: "SLC_Wooden_Crate_Placement",
                                    position: { x: 3728.169922, y: 26.069500, z: 6864.549805 },
                                    orientation: { x: -1.423448, y: 0, z: 0 }
                                },
                                {
                                    name: "Toolbox_Placement",
                                    position: { x: 3755.949951, y: 26.915199, z: 6859.399902 },
                                    orientation: { x: 100.981285, y: 0, z: 0 }
                                },
                                {
                                    name: "Duffle_Bag_Placement",
                                    position: { x: 3740.260010, y: 29.934601, z: 6857.149902 },
                                    orientation: { x: 0, y: 0, z: 0 }
                                },
                            ]
                        };
                        processBuilding(building, outputFile);
                    }
                    if (buildingName === 'Land_Construction_House2') {
                        const building = {
                            name: buildingName,
                            newPosition: { x: position[0], y: position[1], z: position[2] },
                            newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                            oldPosition: { x: 3811.770020, y: 19.132200, z: 6846.189941 }, // Old position
                            oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                            crates: [
                                {
                                    name: "Toolbox_Placement",
                                    position: { x: 3813.780029, y: 20.076000, z: 6848.779785 },
                                    orientation: { x: 46.431286, y: 0, z: 0 }
                                },
                                {
                                    name: "SLC_Wooden_Crate_Placement",
                                    position: { x: 3812.399902, y: 19.971201, z: 6840.270020 },
                                    orientation: { x: 0, y: 0, z: 0 }
                                },
                                {
                                    name: "Duffle_Bag_Placement",
                                    position: { x: 3803.840088, y: 16.591000, z: 6846.839844 },
                                    orientation: { x: 0, y: 0, z: 0 }
                                },
                            ]
                        };
                        processBuilding(building, outputFile);
                    }
                    if (buildingName === 'Land_Construction_House1') {
                        const building = {
                            name: buildingName,
                            newPosition: { x: position[0], y: position[1], z: position[2] },
                            newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                            oldPosition: { x: 3844.840088, y: 19.541599, z: 6810.350098 }, // Old position
                            oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                            crates: [
                                {
                                    name: "Duffle_Bag_Placement",
                                    position: { x: 3841.590088, y: 24.340099, z: 6815.939941 },
                                    orientation: { x: -87.168686, y: 0, z: 0 }
                                },
                                {
                                    name: "Toolbox_Placement",
                                    position: { x: 3845.600098, y: 21.057301, z: 6815.580078 },
                                    orientation: { x: 136.442123, y: 0, z: 0 }
                                },
                                {
                                    name: "Toolbox_Placement",
                                    position: { x: 3843.229980, y: 18.418301, z: 6815.819824 },
                                    orientation: { x: 120.062599, y: 0, z: 0 }
                                },
                            ]
                        };
                        processBuilding(building, outputFile);
                    }
                    if (buildingName === 'Land_Office1') {
                        const building = {
                            name: buildingName,
                            newPosition: { x: position[0], y: position[1], z: position[2] },
                            newOrientation: adjustedRotation, // Corrected orientation (ypr format)
                            oldPosition: { x: 3802.149902, y: 21.478500, z: 6764.259766 }, // Old position
                            oldOrientation: { x: 0, y: 0, z: 0 }, // Old orientation
                            crates: [
                                {
                                    name: "SLC_Brief_Case_Placement",
                                    position: { x: 3786.229980, y: 19.334801, z: 6759.939941 },
                                    orientation: { x: 88.209427, y: 0, z: 0 }
                                },
                                {
                                    name: "SLC_Ammo_Box_Placement",
                                    position: { x: 3799.399902, y: 27.560801, z: 6760.129883 },
                                    orientation: { x: 19.084684, y: 0, z: 0 }
                                },
                                {
                                    name: "Duffle_Bag_Placement",
                                    position: { x: 3806.389893, y: 19.325800, z: 6758.669922 },
                                    orientation: { x: 40.875603, y: 0, z: 0 }
                                },
                                {
                                    name: "SLC_Brief_Case_Placement",
                                    position: { x: 3793.979980, y: 16.849199, z: 6771.649902 },
                                    orientation: { x: 3.846153, y: 0, z: 0 }
                                },
                            ]
                        };
                        processBuilding(building, outputFile);
                    }
            });
        });
    });
}

// Call the function to parse the XML file and write output to a file
const xmlFilePath = './mpmissions/empty.alteria/mapgrouppos.xml'; // Replace with the path to your XML file
const outputFilePath = './output.json'; // Replace with the path to your output file

// Clear the file before appending new data
fs.writeFileSync(outputFilePath, '', (err) => {
    if (err) throw err;
});

// Start processing
parseXML(xmlFilePath, outputFilePath);


/*

Position: <10931.725586, 7.282370, 2684.778076>
Orientation: <0.000000, 0.000000, -0.000000>
Config-Type: Land_Workshop2

Crate Inputs Below

Position: <10940.900391, 6.118820, 2694.340088>
Orientation: <178.740952, 0.000000, -0.000000>
Config-Type: Medical_Bag_Placement
*/