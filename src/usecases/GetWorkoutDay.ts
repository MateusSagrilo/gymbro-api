import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

import { NotFoundError } from "../errors/index.js";
import { WeekDay } from "../generated/prisma/enums.js";
import { prisma } from "../lib/db.js";

dayjs.extend(utc);

interface InputDto {
  userId: string;
  workoutPlanId: string;
  workoutDayId: string;
}

interface PreviousPerformance {
  weightKg: number;
  reps: number;
  completedAt: string;
}

interface OutputDto {
  id: string;
  name: string;
  isRest: boolean;
  coverImageUrl?: string;
  estimatedDurationInSeconds: number;
  weekDay: WeekDay;
  exercises: Array<{
    id: string;
    name: string;
    order: number;
    workoutDayId: string;
    sets: number;
    reps: number;
    restTimeInSeconds: number;
    previousPerformance?: PreviousPerformance;
    sessionLog?: { weightKg: number; reps: number };
  }>;
  sessions: Array<{
    id: string;
    workoutDayId: string;
    startedAt?: string;
    completedAt?: string;
  }>;
}

export class GetWorkoutDay {
  async execute(dto: InputDto): Promise<OutputDto> {
    const workoutPlan = await prisma.workoutPlan.findUnique({
      where: { id: dto.workoutPlanId },
    });

    if (!workoutPlan || workoutPlan.userId !== dto.userId) {
      throw new NotFoundError("Workout plan not found");
    }

    const workoutDay = await prisma.workoutDay.findUnique({
      where: { id: dto.workoutDayId, workoutPlanId: dto.workoutPlanId },
      include: {
        exercises: { orderBy: { order: "asc" } },
        sessions: {
          include: { exerciseLogs: true },
        },
      },
    });

    if (!workoutDay) {
      throw new NotFoundError("Workout day not found");
    }

    const inProgressSession = workoutDay.sessions.find(
      (s) => s.startedAt && !s.completedAt,
    );

    const recentLogsAcrossPlan = await prisma.workoutSession.findMany({
      where: {
        completedAt: { not: null },
        workoutDay: { workoutPlanId: dto.workoutPlanId },
      },
      orderBy: { completedAt: "desc" },
      take: 100,
      include: { exerciseLogs: true },
    });

    const previousByExerciseName = new Map<string, PreviousPerformance>();

    for (const sess of recentLogsAcrossPlan) {
      for (const log of sess.exerciseLogs) {
        if (!previousByExerciseName.has(log.exerciseName)) {
          previousByExerciseName.set(log.exerciseName, {
            weightKg: log.weightKg,
            reps: log.reps,
            completedAt: dayjs.utc(sess.completedAt!).format("YYYY-MM-DD"),
          });
        }
      }
    }

    const sessionLogByExerciseId = new Map<
      string,
      { weightKg: number; reps: number }
    >();
    if (inProgressSession) {
      for (const log of inProgressSession.exerciseLogs) {
        sessionLogByExerciseId.set(log.exerciseId, {
          weightKg: log.weightKg,
          reps: log.reps,
        });
      }
    }

    return {
      id: workoutDay.id,
      name: workoutDay.name,
      isRest: workoutDay.isRest,
      coverImageUrl: workoutDay.coverImageUrl ?? undefined,
      estimatedDurationInSeconds: workoutDay.estimatedDurationInSeconds,
      weekDay: workoutDay.weekDay,
      exercises: workoutDay.exercises.map((exercise) => {
        const prev = previousByExerciseName.get(exercise.name);
        const sessionLog = sessionLogByExerciseId.get(exercise.id);
        return {
          id: exercise.id,
          name: exercise.name,
          order: exercise.order,
          workoutDayId: exercise.workoutDayId,
          sets: exercise.sets,
          reps: exercise.reps,
          restTimeInSeconds: exercise.restTimeInSeconds,
          ...(prev ? { previousPerformance: prev } : {}),
          ...(sessionLog ? { sessionLog } : {}),
        };
      }),
      sessions: workoutDay.sessions.map((session) => ({
        id: session.id,
        workoutDayId: session.workoutDayId,
        startedAt: dayjs.utc(session.startedAt).format("YYYY-MM-DD"),
        completedAt: session.completedAt
          ? dayjs.utc(session.completedAt).format("YYYY-MM-DD")
          : undefined,
      })),
    };
  }
}
