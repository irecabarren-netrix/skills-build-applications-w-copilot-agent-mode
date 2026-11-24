import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && mongoose.isValidObjectId(value);
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object') throw httpError(400, 'Invalid activity');
  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  if (!isObjectId(userId) || !isObjectId(teamId)) throw httpError(400, 'A valid userId and teamId are required');
  if (typeof type !== 'string' || !type.trim()) throw httpError(400, 'Activity type is required');
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1) throw httpError(400, 'Minutes must be a positive number');

  const [user, team] = await Promise.all([
    User.findById(userId).lean(),
    Team.findById(teamId).lean(),
  ]);
  if (!user) throw httpError(404, 'User not found');
  if (!team) throw httpError(404, 'Team not found');

  const activity = await Activity.create({
    user: userId,
    team: teamId,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
  return activity.toObject();
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object') throw httpError(400, 'Invalid team');
  const { name, mascot, members = [] } = input as Record<string, unknown>;
  if (typeof name !== 'string' || !name.trim()) throw httpError(400, 'Team name is required');
  if (typeof mascot !== 'string' || !mascot.trim()) throw httpError(400, 'Team mascot is required');
  if (!Array.isArray(members) || members.some((member) => !isObjectId(member))) {
    throw httpError(400, 'Team members must contain valid user IDs');
  }

  const existingMembers = await User.countDocuments({ _id: { $in: members } });
  if (existingMembers !== members.length) throw httpError(400, 'One or more team members do not exist');

  const team = await Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members,
  });
  return team.toObject();
}

export async function getLeaderboard() {
  const totals = await Activity.aggregate<{ _id: mongoose.Types.ObjectId; totalPoints: number }>([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
  ]);
  const teams = await Team.find({ _id: { $in: totals.map((entry) => entry._id) } }).lean();
  const teamsById = new Map(teams.map((team) => [team._id.toString(), team.name]));

  return totals
    .map((entry) => ({
      teamName: teamsById.get(entry._id.toString()) ?? 'Unknown team',
      totalPoints: entry.totalPoints,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints || a.teamName.localeCompare(b.teamName))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() }).lean();
  if (!user) throw httpError(404, 'User not found');

  let workout = await Workout.findOne({ focus: user.fitnessGoal }).lean();
  if (!workout) {
    const recentActivity = await Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean();
    const recentFocus = recentActivity?.type === 'strength'
      ? 'strength'
      : recentActivity?.type === 'run' || recentActivity?.type === 'cycle'
        ? 'endurance'
        : null;
    if (recentFocus) workout = await Workout.findOne({ focus: recentFocus }).lean();
  }
  if (!workout) workout = await Workout.findOne().lean();
  if (!workout) return [];

  const reason = `Matches ${user.fitnessGoal} activity and goal`;
  return [{ ...workout, reason }];
}

export { User };
