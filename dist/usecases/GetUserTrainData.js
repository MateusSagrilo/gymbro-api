import { prisma } from "../lib/db.js";
export class GetUserTrainData {
    async execute(dto) {
        const user = await prisma.user.findUnique({
            where: { id: dto.userId },
        });
        if (!user) {
            return null;
        }
        if (user.weightInGrams === null ||
            user.heightInCentimeters === null ||
            user.age === null ||
            user.bodyFatPercentage === null) {
            return null;
        }
        return {
            userId: user.id,
            userName: user.name,
            weightInGrams: user.weightInGrams,
            heightInCentimeters: user.heightInCentimeters,
            age: user.age,
            bodyFatPercentage: user.bodyFatPercentage,
        };
    }
}
