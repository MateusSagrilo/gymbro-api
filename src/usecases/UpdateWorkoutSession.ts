import { NotFoundError } from "../errors/index.js";
import { prisma } from "../lib/db.js";

interface ExerciseLogInput {
  exerciseId: string;
  weightKg: number;
  reps: number;
}

interface InputDto {
  userId: string;
  workoutPlanId: string;
  workoutDayId: string;
  sessionId: string;
  completedAt?: string;
  exerciseLogs?: ExerciseLogInput[];
}

interface OutputDto {
  id: string;
  startedAt: string;
  completedAt: string | null;
}

export class UpdateWorkoutSession {
  async execute(dto: InputDto): Promise<OutputDto> {
    const workoutPlan = await prisma.workoutPlan.findUnique({
      where: { id: dto.workoutPlanId },
    });

    if (!workoutPlan || workoutPlan.userId !== dto.userId) {
      throw new NotFoundError("Workout plan not found");
    }

    const workoutDay = await prisma.workoutDay.findUnique({
      where: { id: dto.workoutDayId, workoutPlanId: dto.workoutPlanId },
    });

    if (!workoutDay) {
      throw new NotFoundError("Workout day not found");
    }

    const session = await prisma.workoutSession.findUnique({
      where: { id: dto.sessionId, workoutDayId: dto.workoutDayId },
    });

    if (!session) {
      throw new NotFoundError("Workout session not found");
    }

    await prisma.$transaction(async (tx) => {
      if (dto.exerciseLogs !== undefined) {
        const exercises = await tx.workoutExercise.findMany({
          where: {
            workoutDayId: dto.workoutDayId,
            id: { in: dto.exerciseLogs.map((e) => e.exerciseId) },
          },
        });
        const nameById = new Map(exercises.map((e) => [e.id, e.name]));

        await tx.workoutExerciseLog.deleteMany({
          where: { workoutSessionId: dto.sessionId },
        });

        const rows = dto.exerciseLogs
          .filter((e) => nameById.has(e.exerciseId))
          .map((e) => ({
            workoutSessionId: dto.sessionId,
            exerciseId: e.exerciseId,
            exerciseName: nameById.get(e.exerciseId)!,
            weightKg: e.weightKg,
            reps: e.reps,
          }));

        if (rows.length > 0) {
          await tx.workoutExerciseLog.createMany({ data: rows });
        }
      }

      if (dto.completedAt !== undefined) {
        await tx.workoutSession.update({
          where: { id: dto.sessionId },
          data: { completedAt: new Date(dto.completedAt) },
        });
      }
    });

    const updatedSession = await prisma.workoutSession.findUniqueOrThrow({
      where: { id: dto.sessionId },
    });

    return {
      id: updatedSession.id,
      startedAt: updatedSession.startedAt.toISOString(),
      completedAt: updatedSession.completedAt?.toISOString() ?? null,
    };
  }
}
