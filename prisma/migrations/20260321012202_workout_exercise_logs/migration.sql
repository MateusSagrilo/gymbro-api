-- CreateTable
CREATE TABLE "WorkoutExerciseLog" (
    "id" TEXT NOT NULL,
    "workoutSessionId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "exerciseName" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "reps" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WorkoutExerciseLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkoutExerciseLog_workoutSessionId_idx" ON "WorkoutExerciseLog"("workoutSessionId");

-- CreateIndex
CREATE INDEX "WorkoutExerciseLog_exerciseName_idx" ON "WorkoutExerciseLog"("exerciseName");

-- AddForeignKey
ALTER TABLE "WorkoutExerciseLog" ADD CONSTRAINT "WorkoutExerciseLog_workoutSessionId_fkey" FOREIGN KEY ("workoutSessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
