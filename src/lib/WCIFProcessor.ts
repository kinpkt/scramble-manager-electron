import type { Competition, Venue, EventDetail, EventGroupDetail, PasscodeEntry } from '@/lib/Structures';
import AdmZip from 'adm-zip';
import type { IZipEntry } from 'adm-zip';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { EventCodeToFullMap } from '@/lib/EventIDMapping';

const getAlphabetFromNumber = (num: number) =>
{
    if (num < 1 || num > 26)
        return ''

    return String.fromCharCode('A'.charCodeAt(0) + num - 1);
}

let compData: Competition;

const WCIFProcessor = async (wcif: Competition, file: File) =>
{
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    compData = wcif;

    const scrambleZipFileName = `${wcif.name} - Computer Display PDFs.zip`;
    const scramblePasscodeFileName = `${wcif.name} - Computer Display PDF Passcodes - SECRET.txt`;

    try 
    {
        const tempFolder = path.join(os.tmpdir(), 'scramble-temp');
        if (fs.existsSync(tempFolder)) 
            fs.rmSync(tempFolder, {recursive: true, force: true});

        fs.mkdirSync(tempFolder, {recursive: true});

        const zip = new AdmZip(buffer);

        const zipEntries = zip.getEntries();
        zipEntries.forEach((entry: IZipEntry) => {
            if (entry.entryName === scrambleZipFileName)
            {
                console.log('Found the scramble zip file');

                const scrambleZipBuffer = entry.getData();
                const scrambleZip = new AdmZip(scrambleZipBuffer);
                scrambleZip.extractAllTo(tempFolder, true);

                console.log('Successfully extracted the scramble file');
            }
            else if (entry.entryName === scramblePasscodeFileName)
            {
                console.log('Found the scramble passcode file');

                const passcodeFilePath = path.join(tempFolder, path.basename(entry.entryName));

                fs.writeFileSync(passcodeFilePath, entry.getData());
            }
        });

        createFolderFromWCIF(wcif, tempFolder);

        console.log('Finalized folder structure:');
        const files = fs.readdirSync(tempFolder).filter(f =>
            fs.statSync(path.join(tempFolder, f)).isFile() || fs.statSync(path.join(tempFolder, f)).isDirectory()
        ).filter(f => !f.endsWith('.zip'));  

        const exportZipPath = path.join(os.tmpdir(), `${wcif.name} - Organized Scrambles.zip`);
        const exportZip = new AdmZip();
        exportZip.addLocalFolder(tempFolder);
        exportZip.writeZip(exportZipPath);

        return {exportZipPath, tempFolder};
    }
    catch (err) 
    {
        console.error(err);
    }

    console.log(wcif.name);

    return {};
}

const createFolderFromWCIF = (wcif: Competition, tempFolder: string) =>
{
    const venues: Venue[] = wcif.schedule.venues;
    const allEventDetails: EventDetail[] = [];

    for (const venue of venues)
    {
        const venuePath = path.join(tempFolder, venue.name);

        fs.mkdirSync(venuePath, {recursive: true});
        console.log('Create folder: ', venuePath);

        for (const room of venue.rooms)
        {
            const roomPath = path.join(venuePath, room.name);

            fs.mkdirSync(roomPath, {recursive: true});

            for (const activity of room.activities)
            {
                if (!activity.activityCode.startsWith('other-'))
                {
                    const splittedActivityCode = activity.activityCode.split('-');

                    const [activityCode, activityRound] = splittedActivityCode as [string, string];

                    const roundNumber = Number.parseInt(activityRound[1]!);

                    const eventDetail: EventDetail = {
                        eventCode: activityCode,
                        eventName: EventCodeToFullMap[activityCode as keyof typeof EventCodeToFullMap],
                        eventVenue: venue.name,
                        eventRoom: room.name,
                        eventRound: roundNumber,
                        eventStartTime: activity.startTime,
                        eventGroupDetails: []
                    }

                    if (activityCode === '333fm' || activityCode === '333mbf')
                    {
                        const activityAttempt = splittedActivityCode[2];
                        const attemptNumber = Number.parseInt(activityRound[1]!);

                        eventDetail.eventAttempt = attemptNumber;
                    }
                    else
                    {
                        for (const child of activity.childActivities)
                        {
                            const splittedChildActivityCode = child.activityCode.split('-') as [string, string, string];

                            const childActivityGroup = splittedChildActivityCode[2];
                            const groupNumber = Number.parseInt(childActivityGroup[1]!);

                            const eventGroupDetails: EventGroupDetail = {
                                eventGroup: getAlphabetFromNumber(groupNumber),
                                eventGroupNumber: groupNumber,
                                eventStartTime: child.startTime
                            }

                            eventDetail.eventGroupDetails.push(eventGroupDetails);
                        }
                    }

                    allEventDetails.push(eventDetail);
                }
            }
        }
    }

    allEventDetails.sort((a, b) => new Date(a.eventStartTime).getTime() - new Date(b.eventStartTime).getTime());

    // for (const ed of allEventDetails)
    //     console.log(ed)

    reorganizePDFFromEventDetails(allEventDetails, tempFolder);
    reorganizePasscodeFromEventDetails(allEventDetails, tempFolder);
}

const reorganizePDFFromEventDetails = (allEventDetails: EventDetail[], tempFolder: string) =>
{
    for (const eventDetail of allEventDetails)
    {
        const venueName: string = eventDetail.eventVenue;
        const venuePath = path.join(tempFolder, venueName);
        const roomName: string = eventDetail.eventRoom;
        const roomPath = path.join(venuePath, roomName);

        if (eventDetail.eventGroupDetails.length === 0)
        {
            const scrambleFileName: string = `${eventDetail.eventName} Round ${eventDetail.eventRound} Scramble Set A Attempt ${eventDetail.eventAttempt}.pdf`;

            const srcPath = path.join(tempFolder, scrambleFileName);
            const destPath = path.join(roomPath, scrambleFileName);

            fs.mkdirSync(path.dirname(destPath), {recursive: true});

            if (fs.existsSync(srcPath))
                fs.renameSync(srcPath, destPath);
            else
                console.warn(`File not found: ${srcPath}`);
        }

        for (const groupDetail of eventDetail.eventGroupDetails)
        {
            const scrambleFileName: string = `${eventDetail.eventName} Round ${eventDetail.eventRound} Scramble Set ${groupDetail.eventGroup}.pdf`;

            const srcPath = path.join(tempFolder, scrambleFileName);
            const destPath = path.join(roomPath, scrambleFileName);

            fs.mkdirSync(path.dirname(destPath), {recursive: true});

            if (fs.existsSync(srcPath))
                fs.renameSync(srcPath, destPath);
            else
                console.warn(`File not found: ${srcPath}`);
        }
    }
}

const reorganizePasscodeFromEventDetails = (eventDetails: EventDetail[], tempFolder: string) =>
{
    const passwordRegEx = /^(.+) Round ([1-4]) Scramble Set ([A-Z]+)(?: Attempt ([0-9]+))?: ([0-9a-z]+)$/;   
    const scramblePasscodeFileName = `${compData.name} - Computer Display PDF Passcodes - SECRET.txt`;
    const passcodeFilePath = path.join(tempFolder, scramblePasscodeFileName);

    const scramblePasscodeFile = fs.readFileSync(passcodeFilePath, 'utf-8');
    const passcodes = scramblePasscodeFile.split(/\r?\n/);

    const passcodeEntries: PasscodeEntry[] = [];

    for (const line of passcodes)
    {
        const match = line.match(passwordRegEx);

        if (match)
        {
            const [, eventName, eventRound, eventGroup, eventAttempt, passcode] = match as [string, string, string, string, string, string];

            const passcodeEntry: PasscodeEntry = {
                eventName, 
                eventRound: Number.parseInt(eventRound), 
                eventGroup, 
                eventAttempt: !isNaN(Number.parseInt(eventAttempt)) ? Number.parseInt(eventAttempt) : undefined,
                eventStartTime: new Date(),
                passcode
            };

            const foundDetail = eventDetails.find(ed => 
                ed.eventName === passcodeEntry.eventName &&
                ed.eventRound === passcodeEntry.eventRound &&
                ed.eventGroupDetails.length > 0 &&
                ed.eventGroupDetails.some(gd => gd.eventGroup === passcodeEntry.eventGroup)
            );

            if (foundDetail)
                passcodeEntry.eventStartTime = foundDetail.eventStartTime;

            passcodeEntries.push(passcodeEntry);
        }
    }

    passcodeEntries.sort((a, b) => new Date(a.eventStartTime).getTime() - new Date(b.eventStartTime).getTime());

    let lastDate: string | null = null;

    const outputData = passcodeEntries
    .map(e => {
        const dateStr = new Date(e.eventStartTime).toLocaleDateString(); // "MM/DD/YYYY"
        let header = '';

        if (dateStr !== lastDate) 
        {
            header = `=== ${dateStr} ===\n`; // add a date header
            lastDate = dateStr;
        }

        const attemptStr = e.eventAttempt !== undefined ? ` Attempt ${e.eventAttempt}` : '';

        return `${header}${e.eventName} Round ${e.eventRound} Scramble Set ${e.eventGroup}${attemptStr}: ${e.passcode}`;
    })
    .join('\n');

    fs.unlinkSync(path.join(tempFolder, `${compData.name} - Computer Display PDF Passcodes - SECRET.txt`));

    const reorganizedPasscodeFile = path.join(tempFolder, `[REORGANIZED] ${compData.name} - Computer Display PDF Passcodes - SECRET.txt`);
    fs.writeFileSync(reorganizedPasscodeFile, outputData, 'utf-8');
    console.log(`Passcodes written to ${reorganizedPasscodeFile}`); 
}

export default WCIFProcessor;