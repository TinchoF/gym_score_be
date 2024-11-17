"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRankings = void 0;
const calculateRankings = (scores) => {
    const totals = scores.reduce((acc, score) => {
        acc[score.gymnast._id] = (acc[score.gymnast._id] || 0) + score.finalScore;
        return acc;
    }, {});
    return Object.entries(totals)
        .map(([gymnastId, totalScore]) => ({
        gymnastId,
        totalScore,
    }))
        .sort((a, b) => Number(b.totalScore) - Number(a.totalScore));
};
exports.calculateRankings = calculateRankings;
