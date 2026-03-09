import { prisma } from "../lib/db.js";
export class UpsertUserTrainData {
    async execute(dto) {
        const user = await prisma.user.update({
            where: { id: dto.userId },
            data: {
                weightInGrams: dto.weightInGrams,
                heightInCentimeters: dto.heightInCentimeters,
                age: dto.age,
                bodyFatPercentage: dto.bodyFatPercentage,
            },
        });
        return {
            userId: user.id,
            weightInGrams: user.weightInGrams,
            heightInCentimeters: user.heightInCentimeters,
            age: user.age,
            bodyFatPercentage: user.bodyFatPercentage,
        };
    }
}
