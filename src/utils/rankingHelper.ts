
export const calculateRankings = (scores) => {
  const totals = scores.reduce((acc, score) => {
    acc[score.gymnast._id] = (acc[score.gymnast._id] || 0) + score.finalScore;
    return acc;
  }, {});

  return Object.entries(totals)
    .map(([gymnastId, totalScore]) => ({
      gymnastId,
      totalScore,
    }))
    .sort((a, b) => b.totalScore - a.totalScore);
};
