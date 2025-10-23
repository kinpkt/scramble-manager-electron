interface Competition
{
    name: string;
    events: Event[];
    schedule: Schedule;
}

interface Event
{
    eventID: string;
    rounds: Round[];
}

interface Round
{
    roundID: string;
    format: string;
    timeLimit: TimeLimit;
    cutoff: number;
    advancementCondition: AdvancementCondition;
    scrambleSetCount: number;
}

interface TimeLimit
{
    centiseconds: number;
    cumulativeRoundIDs: string[];
}

interface AdvancementCondition
{
    type: string;
    level: number;
}

interface Schedule
{
    startDate: string;
    numberOfDays: number;
    venues: Venue[];
}

interface Venue
{
    id: number;
    name: string;
    rooms: Room[];
}

interface Room
{
    id: number;
    name: string;
    activities: Activity[];
}

interface Activity
{
    id: number;
    name: string;
    activityCode: string;
    startTime: Date;
    endTime: Date;
    childActivities: Activity[];
}

interface EventDetail
{
    eventCode: string;
    eventName: string;
    eventVenue: string;
    eventRoom: string;
    eventRound: number;
    eventAttempt?: number;
    eventGroupDetails: EventGroupDetail[];
    eventStartTime: Date;
}

interface EventGroupDetail
{
    eventGroup: string;
    eventGroupNumber: number;
    eventStartTime: Date;
}

interface PasscodeEntry
{
    eventName: string,
    eventRound: number,
    eventGroup: string,
    eventAttempt?: number|undefined,
    eventStartTime: Date;
    passcode: string,
}

export type {
    Competition,
    Event,
    Round,
    TimeLimit,
    AdvancementCondition,
    Schedule,
    Venue,
    Room,
    Activity,
    EventDetail,
    EventGroupDetail,
    PasscodeEntry
};