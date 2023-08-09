const { propagate, twoline2satrec, eciToGeodetic, gstime, degreesLong, degreesLat } = require("satellite.js");
const fs = require('fs');

const cdms = JSON.parse(
    //cdms from space-track
    fs.readFileSync('./cdm_public.json')
);

const gp = JSON.parse(
    //general perbutation catalog from space-track
    fs.readFileSync('./gp.json')
);

const isPropagatedObjectValid = (object) => {
    const positionValid = object.position && !Object.values(object.position).some((val) => isNaN(val));
    const velocityValid = object.velocity && !Object.values(object.velocity).some((val) => isNaN(val));
    return positionValid && velocityValid;
};

function getCDMPositions(cdms) {
    const cdmsWithPositions = [];
    const todayTimestamp = new Date().getTime();
    cdms.forEach(cdm => {
        const tcaDate = new Date(`${cdm["TCA"]}Z`);
        if (cdm["PC"] || cdm["MIN_RNG"]) {
            const rso1ID = cdm["SAT_1_ID"];
            const rso2ID = cdm["SAT_2_ID"]; 
            const rso1 = gp.find(d => d["NORAD_CAT_ID"] === rso1ID);
            const rso2 = gp.find(d => d["NORAD_CAT_ID"] === rso2ID);
            //console.log(rso1, rso2);

            const rso1TLE1 = rso1["TLE_LINE1"];
            const rso1TLE2 = rso1["TLE_LINE2"];
            //console.log(rso1TLE1, rso1TLE2);

            const rso2TLE1 = rso2["TLE_LINE1"];
            const rso2TLE2 = rso2["TLE_LINE2"];
            //console.log(rso2TLE1, rso2TLE2);

            const rso1satrec = twoline2satrec(rso1TLE1, rso1TLE2);
            const rso2satrec = twoline2satrec(rso2TLE1, rso2TLE2);
            //console.log(rso1satrec, rso2satrec);

            const rso1PositionAndVelocity = propagate(rso1satrec, tcaDate);
            const rso2PositionAndVelocity = propagate(rso2satrec, tcaDate);
            //console.log('rPAV',rso1PositionAndVelocity, rso2PositionAndVelocity,'rPAV');

            const rso1Valid = isPropagatedObjectValid(rso1PositionAndVelocity);
            const rso2Valid = isPropagatedObjectValid(rso2PositionAndVelocity);
            //console.log(rso1Valid, rso2Valid);

            let rsoPositionAndVelocity;

            if (rso1Valid) {
                rsoPositionAndVelocity = rso1PositionAndVelocity;
            }
            if (rso2Valid) {
                rsoPositionAndVelocity = rso2PositionAndVelocity;
            }
            //console.log('chosenRSO', rsoPositionAndVelocity);

            if (rso1Valid || rso2Valid) {
                const gmst = gstime(tcaDate);
                const position = eciToGeodetic(rsoPositionAndVelocity.position, gmst);
                //console.log('position-start',position,'position-end');
                cdmsWithPositions.push({
                    position: {
                        longitude: degreesLong(position.longitude),
                        latitude: degreesLat(position.latitude),
                        altitude: position.height
                    },
                    rso1ID,
                    rso2ID,
                    rso1Name: cdm["SAT_1_NAME"],
                    rso2Name: cdm["SAT_2_NAME"],
                    rso1Type: cdm["SAT1_OBJECT_TYPE"],
                    rso2Type: cdm["SAT2_OBJECT_TYPE"],
                    cdmId: cdm["CDM_ID"],
                    pc: cdm["PC"],
                    md: cdm["MIN_RNG"],
                    tca: cdm["TCA"]
                });
            }
        }
    });
    return cdmsWithPositions
}

const preparedCdms = getCDMPositions(cdms);

fs.writeFile('./public/cdmsWithPositions.json', JSON.stringify(preparedCdms), 'utf8', (err, data) => {
    console.log('Success');
});